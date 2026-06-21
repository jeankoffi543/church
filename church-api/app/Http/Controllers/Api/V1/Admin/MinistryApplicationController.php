<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\MinistryApplicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\MinistryApplicationResource;
use App\Models\MinistryApplication;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class MinistryApplicationController extends Controller
{
    /**
     * List recruitment applications. Global validators (Super Admin / Pasteurs)
     * see every application; a ministry chief only sees the applications for the
     * ministry they actually lead.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $applications = MinistryApplication::with(['ministry', 'user'])
            ->when(
                ! AccessControl::validatesMinistriesGlobally($user),
                fn ($query) => $query->whereHas(
                    'ministry',
                    fn ($q) => $q->where('chef_id', $user->id),
                ),
            )
            ->latest()
            ->get();

        return MinistryApplicationResource::collection($applications);
    }

    /**
     * Approve an application.
     */
    public function approve(Request $request, MinistryApplication $application): JsonResponse
    {
        return $this->transition($request, $application, MinistryApplicationStatus::Approved);
    }

    /**
     * Reject an application.
     */
    public function reject(Request $request, MinistryApplication $application): JsonResponse
    {
        return $this->transition($request, $application, MinistryApplicationStatus::Rejected);
    }

    /**
     * Apply the contextual security rule, then move the application to the
     * target status.
     */
    private function transition(
        Request $request,
        MinistryApplication $application,
        MinistryApplicationStatus $status,
    ): JsonResponse {
        $this->authorizeContextually($request, $application);

        $validated = $request->validate([
            'decision_note' => ['nullable', 'string', 'max:2000'],
            'decision_note_public' => ['boolean'],
        ]);

        $application->update([
            'status' => $status,
            'decision_note' => $validated['decision_note'] ?? null,
            'decision_note_public' => $validated['decision_note_public'] ?? false,
        ]);

        // TODO: Créer automatiquement un compte d'accès avec le rôle du ministère associé si nécessaire

        return response()->json([
            'message' => $status === MinistryApplicationStatus::Approved
                ? 'Candidature approuvée.'
                : 'Candidature rejetée.',
            'data' => new MinistryApplicationResource($application->load(['ministry', 'user'])),
        ]);
    }

    /**
     * Contextual security: a ministry chief may only act on applications for the
     * ministry they personally lead. Super Admins and Pasteurs act globally.
     */
    private function authorizeContextually(Request $request, MinistryApplication $application): void
    {
        $user = $request->user();

        if (AccessControl::validatesMinistriesGlobally($user)) {
            return;
        }

        $application->loadMissing('ministry');

        if ($user->id !== $application->ministry?->chef_id) {
            throw new AccessDeniedHttpException(
                "Accès restreint : vous n'êtes pas le chef désigné de ce ministère.",
            );
        }
    }
}
