<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\FollowUpRequest;
use App\Http\Resources\V1\FollowUpResource;
use App\Models\Convert;
use App\Models\FollowUp;
use App\Models\Member;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class FollowUpController extends Controller
{
    /**
     * List follow-up cases. A counselor only sees the cases assigned to
     * them; Super Admin / Pasteur see every case (pastoral oversight).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = FollowUp::query()
            ->with(['followable', 'counselor'])
            ->when(
                ! AccessControl::viewsFollowUpsGlobally($user),
                fn ($q) => $q->where('assigned_to', $user->id),
            );

        $query->filterOnRequest()->sortOnRequest();

        if (! $request->has('sort')) {
            $query->orderByDesc('created_at');
        }

        return FollowUpResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(FollowUpRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $followableClass = $validated['followable_type'] === 'convert' ? Convert::class : Member::class;
        if (! $followableClass::query()->whereKey($validated['followable_id'])->exists()) {
            throw ValidationException::withMessages([
                'followable_id' => ["La cible sélectionnée n'existe pas."],
            ]);
        }

        $followUp = FollowUp::create($validated);
        $followUp->refresh();

        return (new FollowUpResource($followUp->load(['followable', 'counselor'])))
            ->response()->setStatusCode(201);
    }

    public function show(Request $request, FollowUp $followUp): FollowUpResource
    {
        $this->authorizeAccess($request, $followUp);

        return new FollowUpResource($followUp->load(['followable', 'counselor', 'notes.author']));
    }

    public function update(FollowUpRequest $request, FollowUp $followUp): FollowUpResource
    {
        $this->authorizeAccess($request, $followUp);

        $followUp->update($request->validated());

        return new FollowUpResource($followUp->load(['followable', 'counselor', 'notes.author']));
    }

    public function destroy(Request $request, FollowUp $followUp): JsonResponse
    {
        $this->authorizeAccess($request, $followUp);

        $followUp->delete();

        return response()->json(status: 204);
    }

    /**
     * A counselor may only touch the cases assigned to them; global
     * validators (Super Admin / Pasteur) bypass this check.
     */
    private function authorizeAccess(Request $request, FollowUp $followUp): void
    {
        $user = $request->user();

        if (AccessControl::viewsFollowUpsGlobally($user)) {
            return;
        }

        if ($followUp->assigned_to !== $user->id) {
            throw new AccessDeniedHttpException(
                "Accès restreint : ce dossier de suivi n'est pas assigné à votre nom."
            );
        }
    }
}
