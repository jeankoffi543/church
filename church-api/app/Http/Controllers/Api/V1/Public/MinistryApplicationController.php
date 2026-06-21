<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\MinistryApplicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Public\MinistryApplicationRequest;
use App\Models\MinistryApplication;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MinistryApplicationController extends Controller
{
    /**
     * Receive a recruitment application submitted from the public site. If the
     * same person (matched by email or phone) already applied to this ministry,
     * the existing application is returned with its current status instead of
     * creating a duplicate.
     */
    public function store(MinistryApplicationRequest $request): JsonResponse
    {
        $data = $request->validated();

        $existing = MinistryApplication::query()
            ->where('ministry_id', $data['ministry_id'])
            ->where(fn ($q) => $q
                ->where('email', $data['email'])
                ->orWhere('phone', $data['phone']))
            ->latest()
            ->first();

        if ($existing !== null) {
            return response()->json([
                'created' => false,
                'status' => $existing->status->value,
                'message' => $this->statusMessage($existing),
            ], 200);
        }

        $application = MinistryApplication::create([
            ...$data,
            // Link to an existing account when the email already belongs to one.
            'user_id' => User::query()->where('email', $data['email'])->value('id'),
            'status' => MinistryApplicationStatus::Pending,
        ]);

        return response()->json([
            'created' => true,
            'status' => $application->status->value,
            'message' => 'Votre candidature a bien été envoyée. Un responsable vous contactera bientôt.',
            'data' => ['id' => $application->id],
        ], 201);
    }

    /**
     * Let a candidate check the status of their applications by entering the
     * email or phone they used. Matching is forgiving about spaces in phones.
     */
    public function status(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact' => ['required', 'string', 'max:255'],
        ]);

        $contact = trim($validated['contact']);
        $phoneDigits = str_replace(' ', '', $contact);

        $applications = MinistryApplication::query()
            ->with('ministry')
            ->where('email', $contact)
            ->orWhere('phone', $contact)
            ->orWhereRaw("REPLACE(phone, ' ', '') = ?", [$phoneDigits])
            ->latest()
            ->get();

        return response()->json([
            'data' => $applications->map(fn (MinistryApplication $application) => [
                'ministry' => $application->ministry?->name,
                'status' => $application->status->value,
                // The motif is only revealed when the validator made it public.
                'decision_note' => $application->decision_note_public ? $application->decision_note : null,
                'created_at' => $application->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    /**
     * Human-readable message describing an existing application's status.
     */
    private function statusMessage(MinistryApplication $application): string
    {
        $ministry = $application->loadMissing('ministry')->ministry?->name ?? 'ce ministère';

        return match ($application->status) {
            MinistryApplicationStatus::Pending => "Vous avez déjà une candidature en attente de traitement pour « {$ministry} ».",
            MinistryApplicationStatus::Approved => "Bonne nouvelle ! Votre candidature pour « {$ministry} » a déjà été approuvée.",
            MinistryApplicationStatus::Rejected => "Votre précédente candidature pour « {$ministry} » n'a pas été retenue. Contactez un responsable pour en savoir plus.",
        };
    }
}
