<?php

namespace App\Console\Commands;

use App\Services\CurrencyService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('currency:sync-rates')]
#[Description('Refresh exchange_rate for every currency (except the fixed XOF/XAF peg) from a live FX feed.')]
class SyncCurrencyRates extends Command
{
    public function handle(CurrencyService $currencyService): int
    {
        $result = $currencyService->syncRatesFromMarket();

        if ($result['error'] !== null) {
            $this->error("Échec de la synchronisation des taux : {$result['error']}");

            return self::FAILURE;
        }

        $this->info("Taux mis à jour : {$result['updated']} devise(s), {$result['skipped']} ignorée(s) (absente(s) du fournisseur).");

        return self::SUCCESS;
    }
}
