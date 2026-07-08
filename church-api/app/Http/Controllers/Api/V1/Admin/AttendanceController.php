<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AttendanceResource;
use App\Models\Attendance;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AttendanceController extends Controller
{
    /**
     * Save the whole "présences du culte" form in one call: one line per
     * category (hommes, femmes, enfants, visiteurs…). Re-submitting a
     * category already recorded for this service updates its count instead
     * of duplicating it — mirrors OfferingCollectionController::upsert().
     */
    public function upsert(Request $request, Service $service): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.category' => ['required', 'string', 'max:50'],
            'lines.*.count' => ['required', 'integer', 'min:0'],
        ]);

        foreach ($validated['lines'] as $line) {
            Attendance::updateOrCreate(
                ['service_id' => $service->id, 'category' => $line['category']],
                [
                    'count' => $line['count'],
                    'recorded_by_id' => $request->user()?->id,
                ]
            );
        }

        return AttendanceResource::collection(
            $service->attendances()->get()
        );
    }
}
