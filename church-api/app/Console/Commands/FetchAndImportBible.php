<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FetchAndImportBible extends Command
{
    /**
     * Le nom et la signature de la commande.
     */
    protected $signature = 'bible:fetch-import 
                            {file? : Chemin vers un fichier d\'index JSON unique (facultatif si -r est utilisé)}
                            {--r|recursive= : Parcourir de manière récursive ce dossier pour trouver les index}
                            {--f|filename=books.json : Le nom du fichier d\'index à chercher en mode récursif}
                            {--truncate : Vider la table pour la version avant l\'importation}';

    /**
     * La description de la commande.
     */
    protected $description = 'Parcourt un ou plusieurs index JSON (local ou via scan récursif), télécharge les chapitres depuis l\'API GetBible et gère les échecs.';

    /**
     * Exécution de la commande.
     */
    public function handle(): int
    {
        $recursiveDir = $this->option('recursive');
        $targetFilename = $this->option('filename');
        $filesToProcess = [];

        // Mode 1 : Scan récursif d'un dossier
        if ($recursiveDir) {
            if (! File::isDirectory($recursiveDir)) {
                $this->error("[-] Le dossier spécifié pour le scan récursif n'existe pas : {$recursiveDir}");

                return self::FAILURE;
            }

            $this->info("[*] Scan récursif du dossier '{$recursiveDir}' à la recherche de '{$targetFilename}'...");

            // Récupère tous les fichiers du dossier et sous-dossiers
            $allFiles = File::allFiles($recursiveDir);
            foreach ($allFiles as $file) {
                if ($file->getFilename() === $targetFilename) {
                    $filesToProcess[] = $file->getRealPath();
                }
            }

            if (empty($filesToProcess)) {
                $this->error("[-] Aucun fichier nommé '{$targetFilename}' trouvé dans '{$recursiveDir}'.");

                return self::FAILURE;
            }

            $this->info('[+] '.count($filesToProcess)." fichier(s) d'index trouvé(s).");
        } else {
            // Mode 2 : Traitement d'un fichier unique via l'argument
            $indexPath = (string) $this->argument('file');

            if (empty($indexPath)) {
                $this->error("[-] Spécifiez un fichier d'index ou utilisez l'option -r pour un scan récursif.");

                return self::FAILURE;
            }

            if (! File::exists($indexPath)) {
                $this->error("[-] Fichier d'index introuvable : {$indexPath}");

                return self::FAILURE;
            }

            $filesToProcess[] = $indexPath;
        }

        // Lancement du traitement global
        $globalFailure = false;

        foreach ($filesToProcess as $indexFile) {
            $this->newLine();
            $this->info('======================================================================');
            $this->info("[*] Lecture de l'index : {$indexFile}");

            $status = $this->processIndexFile($indexFile);

            if ($status === self::FAILURE) {
                $globalFailure = true;
            }
        }

        return $globalFailure ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Traite un fichier d'index spécifique.
     */
    private function processIndexFile(string $indexPath): int
    {
        $indexData = json_decode(File::get($indexPath), true);
        if (! is_array($indexData)) {
            $this->error("[-] Le format du fichier d'index JSON est invalide.");

            return self::FAILURE;
        }

        $firstBook = reset($indexData);
        $translationCode = strtoupper($firstBook['abbreviation'] ?? 'LSG');

        if ($this->option('truncate')) {
            $this->info("[!] Nettoyage des anciens enregistrements pour la version {$translationCode}...");
            DB::table('bible_verses')->where('translation', $translationCode)->delete();
        }

        $this->info('[+] Début du traitement de '.count($indexData)." livres pour [{$translationCode}].");

        $bar = $this->output->createProgressBar(count($indexData));
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% -- %message%');
        $bar->start();

        $successCount = 0;
        $failedCount = 0;

        foreach ($indexData as $key => $bookInfo) {
            $url = $bookInfo['url'] ?? null;
            $bookName = $bookInfo['name'] ?? "Livre Inconnu #{$key}";

            $bar->setMessage("{$translationCode} - {$bookName}");

            if (! $url) {
                $errorMessage = "Ligne {$key} : URL introuvable pour le livre '{$bookName}'.";
                $this->clearProgressBarLine();
                $this->error("[-] {$errorMessage}");
                Log::channel('single')->error("[BibleImport] {$errorMessage}");
                $failedCount++;
                $bar->advance();

                continue;
            }

            try {
                $response = Http::timeout(20)->retry(2, 50)->get($url);

                if ($response->failed()) {
                    $errorMessage = "Échec du Fetch pour '{$bookName}' — Code HTTP : {$response->status()}";
                    $this->clearProgressBarLine();
                    $this->error("[-] {$errorMessage}");
                    Log::channel('single')->error("[BibleImport] {$errorMessage}");
                    $failedCount++;
                    $bar->advance();

                    continue;
                }

                $bookContent = $response->json();
                if (! isset($bookContent['chapters']) || ! is_array($bookContent['chapters'])) {
                    $errorMessage = "Structure JSON invalide pour '{$bookName}' (clé 'chapters' manquante).";
                    $this->clearProgressBarLine();
                    $this->error("[-] {$errorMessage}");
                    Log::channel('single')->error("[BibleImport] {$errorMessage}");
                    $failedCount++;
                    $bar->advance();

                    continue;
                }

                $actualBookName = $bookContent['name'] ?? $bookName;
                $rowsToInsert = [];

                foreach ($bookContent['chapters'] as $chapterObj) {
                    $chapterNum = (int) ($chapterObj['chapter'] ?? 0);
                    if (! isset($chapterObj['verses']) || ! is_array($chapterObj['verses'])) {
                        continue;
                    }

                    foreach ($chapterObj['verses'] as $verseObj) {
                        $rowsToInsert[] = [
                            'translation' => $translationCode,
                            'book' => (string) $actualBookName,
                            'chapter' => $chapterNum,
                            'verse' => (int) ($verseObj['verse'] ?? 0),
                            'text' => (string) ($verseObj['text'] ?? ''),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }

                if (! empty($rowsToInsert)) {
                    DB::transaction(function () use ($rowsToInsert) {
                        foreach (array_chunk($rowsToInsert, 500) as $chunk) {
                            if ($this->option('truncate')) {
                                DB::table('bible_verses')->insert($chunk);
                            } else {
                                DB::table('bible_verses')->upsert(
                                    $chunk,
                                    ['translation', 'book', 'chapter', 'verse'],
                                    ['text', 'updated_at']
                                );
                            }
                        }
                    });
                }

                $successCount++;
            } catch (\Exception $e) {
                $errorMessage = "Exception critique sur '{$bookName}' : ".$e->getMessage();
                $this->clearProgressBarLine();
                $this->error("[CRITICAL] {$errorMessage}");
                Log::channel('single')->error("[BibleImport] {$errorMessage}");
                $failedCount++;
            }

            $bar->advance();
        }

        $bar->setMessage("Terminé pour {$translationCode} !");
        $bar->finish();

        $this->newLine(2);
        $this->info("=== BILAN POUR LA VERSION [{$translationCode}] ===");
        $this->info("[🎉] Livres importés avec succès : {$successCount}");

        // Clear cache for translations list and books list for this translation
        Cache::forget('bible:translations');
        Cache::forget("bible:books:{$translationCode}");

        if ($failedCount > 0) {
            $this->warn("[⚠️] Livres en échec : {$failedCount}. Voir les logs.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * Nettoie la ligne de la console occupée par la barre de progression.
     */
    private function clearProgressBarLine(): void
    {
        $this->output->write("\x0D");
        $this->output->write("\x1B[2K");
    }
}
