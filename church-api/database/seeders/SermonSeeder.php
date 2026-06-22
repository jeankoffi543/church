<?php

namespace Database\Seeders;

use App\Enums\SermonMediaType;
use App\Models\Sermon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class SermonSeeder extends Seeder
{
    public function run(): void
    {
        // Functional raw files (cases 1 & 3): write technically valid, playable
        // micro media so the /storage path resolves AND decodes in the browser.
        // The "broken" file (case 5) is left absent on purpose so the player
        // exercises its error state (404).
        Storage::disk('public')->put('sermons/audios/enseignement.mp3', $this->silentMp3());
        Storage::disk('public')->put('sermons/videos/sample.mp4', $this->tinyMp4());

        $sermons = [
            // Cas 1 — Vidéo locale (fichier brut fonctionnel)
            [
                'title' => 'Vaincre les Géants de ta Vie',
                'speaker' => 'Pasteur David Odion Victor',
                'series' => 'Combats spirituels',
                'book' => '1 Samuel',
                'preached_at' => '2026-06-18',
                'duration' => '47 min',
                'description' => 'Affronter et terrasser les géants qui se dressent contre ton destin.',
                'media_type' => SermonMediaType::VideoFile,
                'media_path' => '/storage/sermons/videos/sample.mp4',
                'media_url' => null,
                'background_image' => null,
                'scriptures' => ['1 Samuel 17:45', '1 Samuel 17:47', 'Romains 8:37'],
            ],
            // Cas 2 — Vidéo YouTube externe fonctionnelle (le plus récent → accueil)
            [
                'title' => 'La Puissance de la Foi Agissante',
                'speaker' => 'Pasteur David Odion Victor',
                'series' => 'Vivre par la foi',
                'book' => 'Jacques',
                'preached_at' => '2026-06-21',
                'duration' => '52 min',
                'description' => 'Une foi qui agit déplace les montagnes et transforme les situations.',
                'media_type' => SermonMediaType::VideoUrl,
                'media_path' => null,
                'media_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'background_image' => 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1600&q=80&auto=format&fit=crop',
                'scriptures' => ['Jacques 2:17', 'Hébreux 11:1', 'Marc 11:23'],
            ],
            // Cas 3 — Audio local (fichier brut MP3 fonctionnel)
            [
                'title' => 'Entendre la Voix de Dieu dans le Silence',
                'speaker' => 'Sœur Esther Mbarga',
                'series' => 'Intimité',
                'book' => '1 Rois',
                'preached_at' => '2026-06-15',
                'duration' => '38 min',
                'description' => 'Discerner la voix douce et subtile de Dieu au milieu du bruit.',
                'media_type' => SermonMediaType::AudioFile,
                'media_path' => '/storage/sermons/audios/enseignement.mp3',
                'media_url' => null,
                'background_image' => null,
                'scriptures' => ['1 Rois 19:12', 'Psaumes 46:10'],
            ],
            // Cas 4 — Audio externe (lien direct / stream)
            [
                'title' => "Marcher Selon l'Esprit au Quotidien",
                'speaker' => 'Pasteur Daniel Adeyemi',
                'series' => 'Vie de l\'Esprit',
                'book' => 'Galates',
                'preached_at' => '2026-06-12',
                'duration' => '44 min',
                'description' => 'Vivre chaque jour conduit et fortifié par le Saint-Esprit.',
                'media_type' => SermonMediaType::AudioUrl,
                'media_path' => null,
                'media_url' => 'https://traffic.libsyn.com/secure/forcedn/sermon.mp3',
                'background_image' => null,
                'scriptures' => ['Galates 5:16', 'Galates 5:25', 'Romains 8:14'],
            ],
            // Cas 5 — Fichier corrompu / introuvable (test état d'erreur)
            [
                'title' => 'Enseignement Spécial (Fichier Corrompu Test)',
                'speaker' => 'Invité',
                'series' => null,
                'book' => null,
                'preached_at' => '2026-06-09',
                'duration' => null,
                'description' => 'Cas de test : le fichier média est introuvable / corrompu.',
                'media_type' => SermonMediaType::VideoFile,
                'media_path' => '/storage/sermons/videos/broken_file.mp4',
                'media_url' => null,
                'background_image' => null,
                'scriptures' => [],
            ],
            // Cas 6 — Lien cassé / erreur réseau (URL introuvable)
            [
                'title' => 'Conférence Annuelle (Lien Invalide Test)',
                'speaker' => 'Invité',
                'series' => null,
                'book' => null,
                'preached_at' => '2026-06-06',
                'duration' => null,
                'description' => 'Cas de test : la vidéo YouTube est indisponible (404).',
                'media_type' => SermonMediaType::VideoUrl,
                'media_path' => null,
                'media_url' => 'https://www.youtube.com/watch?v=lien-inexistant-404',
                'background_image' => null,
                'scriptures' => [],
            ],
            // Cas 7 — Sans média (texte / notes uniquement)
            [
                'title' => "Notes d'Exhortation du Culte de Moisson",
                'speaker' => 'Pasteur David Odion Victor',
                'series' => 'Action de grâce',
                'book' => 'Deutéronome',
                'preached_at' => '2026-06-03',
                'duration' => null,
                'description' => 'Un résumé écrit des points forts du message de moisson.',
                'media_type' => null,
                'media_path' => null,
                'media_url' => null,
                'background_image' => null,
                'scriptures' => ['Deutéronome 16:15', 'Galates 6:9'],
            ],
        ];

        foreach ($sermons as $data) {
            $scriptures = $data['scriptures'];
            unset($data['scriptures']);

            // Seed the canonical book categories from the legacy single `book`.
            $data['books_category'] = isset($data['book']) && $data['book'] !== null ? [$data['book']] : null;

            $sermon = Sermon::updateOrCreate(
                ['title' => $data['title']],
                [...$data, 'is_published' => true],
            );

            $sermon->scriptures()->delete();
            if ($scriptures !== []) {
                $sermon->scriptures()->createMany(
                    array_map(fn (string $reference): array => ['reference' => $reference], $scriptures)
                );
            }
        }
    }

    /**
     * Build a technically valid, silent MP3 (MPEG-1 Layer III, 128 kbps, mono).
     *
     * Each frame is a 417-byte block: a 4-byte sync header followed by zeroed
     * payload (decoded as silence). Repeating it yields a ~1s clip that real
     * browser <audio> decoders accept and play without error.
     */
    private function silentMp3(): string
    {
        // 0xFFFB = sync + MPEG-1 + Layer III, no CRC.
        // 0x90  = 128 kbps + 44.1 kHz + no padding.
        // 0xC0  = mono channel mode.
        $frame = "\xFF\xFB\x90\xC0".str_repeat("\x00", 413);

        return str_repeat($frame, 40);
    }

    /**
     * Decode a minimal but valid MP4 container (ftyp + moov + mdat) so the raw
     * /storage path resolves to a real, browser-readable file.
     */
    private function tinyMp4(): string
    {
        $base64 = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAr1tZGF0AAAC'
            .'rgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0MiByMjQ3OSBkZDc5YTYxIC0g'
            .'SC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNCAtIGh0dHA6Ly93'
            .'d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVi'
            .'bG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lf'
            .'cmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxs'
            .'aXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21h'
            .'X3FwX29mZnNldD0tMiB0aHJlYWRzPTYgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhy'
            .'ZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNv'
            .'bnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2Jp'
            .'YXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1'
            .'MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhl'
            .'YWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1h'
            .'eD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAD2WIhAA3//728P4F'
            .'NjuZQQAAAu5tb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAUAABAAABAAAAAAAAAAAA'
            .'AAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAA'
            .'AAAAAAAAAAAAAAACAAABnHRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAUAAA'
            .'AAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAQAA'
            .'AAEAAAAAAAEhAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAA'
            .'AAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAA'
            .'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAA'
            .'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

        return (string) base64_decode($base64, true);
    }
}
