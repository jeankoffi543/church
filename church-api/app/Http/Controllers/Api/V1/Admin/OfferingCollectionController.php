<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\OfferingCollectionResource;
use App\Models\OfferingCollection;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OfferingCollectionController extends Controller
{
    /**
     * Save the whole "collecte du culte" form in one call: one line per
     * nature (dîme, offrande, projet…). Re-submitting a nature already
     * recorded for this service updates its total instead of duplicating it.
     */
    public function upsert(Request $request, Service $service): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.nature' => ['required', 'string', 'max:50'],
            'lines.*.amount' => ['required', 'integer', 'min:0'],
            'lines.*.currency' => ['nullable', 'string', 'max:10'],
            'lines.*.notes' => ['nullable', 'string'],
        ]);

        foreach ($validated['lines'] as $line) {
            OfferingCollection::updateOrCreate(
                ['service_id' => $service->id, 'nature' => $line['nature']],
                [
                    'amount' => $line['amount'],
                    'currency' => $line['currency'] ?? 'XOF',
                    'counted_by_id' => $request->user()?->id,
                    'notes' => $line['notes'] ?? null,
                ]
            );
        }

        return OfferingCollectionResource::collection(
            $service->offeringCollections()->get()
        );
    }
}
