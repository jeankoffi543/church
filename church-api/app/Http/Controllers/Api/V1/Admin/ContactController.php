<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ContactMessageStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ContactMessageResource;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ContactController extends Controller
{
    /**
     * List all contact messages.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ContactMessage::with(['repliedBy']);

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->latest();
        }

        return ContactMessageResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    /**
     * Update a contact message status.
     */
    public function update(Request $request, ContactMessage $contact): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,read,archived'],
        ]);

        $contact->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => 'Message mis à jour avec succès.',
            'data' => new ContactMessageResource($contact->load('repliedBy')),
        ]);
    }

    /**
     * Archive a contact message.
     */
    public function archive(Request $request, ContactMessage $contact): JsonResponse
    {
        $contact->update([
            'status' => ContactMessageStatus::Archived,
        ]);

        return response()->json([
            'message' => 'Message archivé avec succès.',
            'data' => new ContactMessageResource($contact->load('repliedBy')),
        ]);
    }

    /**
     * Mark reply transaction metadata.
     */
    public function reply(Request $request, ContactMessage $contact): JsonResponse
    {
        $contact->update([
            'status' => ContactMessageStatus::Read,
            'replied_at' => now(),
            'replied_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Réponse enregistrée avec succès.',
            'data' => new ContactMessageResource($contact->load('repliedBy')),
        ]);
    }
}
