<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\HomeGroupApplicationResource;
use App\Models\HomeGroupApplication;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HomeGroupApplicationController extends Controller
{
    /**
     * List applications, with optional filtering by status and home_group_id.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = HomeGroupApplication::query()
            ->with(['homeGroup', 'user', 'processor']);

        if ($request->has('home_group_id')) {
            $query->where('home_group_id', $request->query('home_group_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $applications = $query->orderBy('created_at', 'desc')->get();

        return HomeGroupApplicationResource::collection($applications);
    }

    /**
     * Approve a home group application.
     */
    public function approve(Request $request, HomeGroupApplication $application): HomeGroupApplicationResource
    {
        $this->authorizeContextualAccess($request->user(), $application);

        $application->update([
            'status' => 'approved',
            'processed_by' => $request->user()->id,
        ]);

        return new HomeGroupApplicationResource($application->load(['homeGroup', 'user', 'processor']));
    }

    /**
     * Reject a home group application.
     */
    public function reject(Request $request, HomeGroupApplication $application): HomeGroupApplicationResource
    {
        $this->authorizeContextualAccess($request->user(), $application);

        $application->update([
            'status' => 'rejected',
            'processed_by' => $request->user()->id,
        ]);

        return new HomeGroupApplicationResource($application->load(['homeGroup', 'user', 'processor']));
    }

    /**
     * Authorize contextual access.
     * Block cell leaders from processing applications if they are not the designated leader of the specific home group.
     */
    private function authorizeContextualAccess($user, HomeGroupApplication $application): void
    {
        $isSuperAdmin = $user->hasRole(AccessControl::SUPER_ADMIN);
        $isPasteur = $user->hasRole('Pasteurs');
        $isResponsable = $user->hasRole('Responsables de cellule');

        if ($isResponsable && !$isPasteur && !$isSuperAdmin) {
            if ($application->homeGroup === null || (int) $application->homeGroup->leader_id !== (int) $user->id) {
                abort(403, "Vous n'êtes pas le leader désigné de cette cellule spécifique.");
            }
        }
    }
}
