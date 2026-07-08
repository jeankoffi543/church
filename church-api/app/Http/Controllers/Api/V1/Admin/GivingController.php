<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Donation;
use App\Models\OfferingCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GivingController extends Controller
{
    /**
     * Combined generosity KPI over a period, merging every giving channel:
     * the online ledger ({@see Donation}, individually attributed) and the
     * in-person cash collected during a culte ({@see OfferingCollection},
     * anonymous plate totals). A church's "total dîme this month" is
     * meaningless if it only reflects one channel.
     *
     * Amounts are summed as raw integers regardless of `currency`, mirroring
     * DonationController::stats() — donations are overwhelmingly XOF in
     * practice; true multi-currency conversion is out of scope here.
     */
    public function stats(Request $request): JsonResponse
    {
        $from = $request->filled('from') ? $request->string('from')->toString() : null;
        $to = $request->filled('to') ? $request->string('to')->toString() : null;

        $onlineByNature = Donation::query()
            ->successful()
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))
            ->selectRaw('purpose_key as nature, sum(amount) as total')
            ->groupBy('purpose_key')
            ->pluck('total', 'nature')
            ->map(fn ($v) => (int) $v);

        $cashByNature = OfferingCollection::query()
            ->whereHas('service', function ($q) use ($from, $to) {
                $q->when($from, fn ($qq) => $qq->whereDate('date', '>=', $from))
                    ->when($to, fn ($qq) => $qq->whereDate('date', '<=', $to));
            })
            ->selectRaw('nature, sum(amount) as total')
            ->groupBy('nature')
            ->pluck('total', 'nature')
            ->map(fn ($v) => (int) $v);

        $natures = $onlineByNature->keys()->merge($cashByNature->keys())->unique()->values();

        $byNature = $natures->mapWithKeys(function ($nature) use ($onlineByNature, $cashByNature) {
            $online = (int) ($onlineByNature[$nature] ?? 0);
            $cash = (int) ($cashByNature[$nature] ?? 0);

            return [$nature => [
                'en_ligne' => $online,
                'especes' => $cash,
                'total' => $online + $cash,
            ]];
        });

        $totalOnline = $onlineByNature->sum();
        $totalCash = $cashByNature->sum();

        return response()->json([
            'data' => [
                'total' => $totalOnline + $totalCash,
                'by_channel' => [
                    'en_ligne' => $totalOnline,
                    'especes' => $totalCash,
                ],
                'by_nature' => $byNature,
            ],
        ]);
    }
}
