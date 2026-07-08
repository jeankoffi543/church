<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\ServiceAssignmentUpsertRequest;
use App\Http\Resources\V1\ServiceAssignmentResource;
use App\Models\Service;
use App\Models\ServiceAssignment;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ServiceAssignmentController extends Controller
{
    /**
     * Replace the whole service-planning roster in one call: one line per
     * scheduled member. Re-submitting a member already on the roster updates
     * their role/status/notes instead of duplicating the line; a member
     * omitted from the payload is dropped from the roster entirely — this is
     * a full-roster editor, not an incremental append.
     */
    public function upsert(ServiceAssignmentUpsertRequest $request, Service $service): AnonymousResourceCollection
    {
        $validated = $request->validated();

        $keptIds = [];
        foreach ($validated['lines'] as $line) {
            $assignment = ServiceAssignment::updateOrCreate(
                ['service_id' => $service->id, 'member_id' => $line['member_id']],
                [
                    'team_id' => $line['team_id'] ?? null,
                    'role' => $line['role'],
                    'status' => $line['status'] ?? 'prevu',
                    'notes' => $line['notes'] ?? null,
                ]
            );
            $keptIds[] = $assignment->id;
        }

        $service->assignments()->whereNotIn('id', $keptIds)->delete();

        return ServiceAssignmentResource::collection(
            $service->assignments()->with(['member', 'team'])->get()
        );
    }
}
