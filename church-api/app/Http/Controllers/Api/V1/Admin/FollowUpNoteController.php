<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\FollowUpNoteRequest;
use App\Http\Resources\V1\FollowUpNoteResource;
use App\Models\FollowUp;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class FollowUpNoteController extends Controller
{
    /**
     * Append one timeline entry (appel, visite, sms…) to a follow-up case.
     * Same row-level rule as FollowUpController: a counselor may only write
     * to a case assigned to them.
     */
    public function store(FollowUpNoteRequest $request, FollowUp $followUp): JsonResponse
    {
        $user = $request->user();

        if (! AccessControl::viewsFollowUpsGlobally($user) && $followUp->assigned_to !== $user->id) {
            throw new AccessDeniedHttpException(
                "Accès restreint : ce dossier de suivi n'est pas assigné à votre nom."
            );
        }

        $note = $followUp->notes()->create([
            ...$request->validated(),
            'created_by' => $user->id,
        ]);

        return (new FollowUpNoteResource($note->load('author')))->response()->setStatusCode(201);
    }
}
