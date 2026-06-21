<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\HomeGroupApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeGroupApplicationController extends Controller
{
    /**
     * Submit a new application for a home group.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:50',
            'home_group_id' => 'required|exists:home_groups,id',
            'motivation' => 'required|string',
        ]);

        // Check if user is already applied or enrolled
        $existing = HomeGroupApplication::where(function ($query) use ($validated) {
            $query->where('email', $validated['email'])
                  ->orWhere('phone', $validated['phone']);
        })
        ->when(auth('sanctum')->check(), function ($query) {
            $query->orWhere('user_id', auth('sanctum')->id());
        })
        ->first();

        if ($existing) {
            if ($existing->status === 'approved') {
                return response()->json([
                    'message' => "Vous êtes déjà inscrit dans le groupe de maison : {$existing->homeGroup->name}.",
                    'status' => 'approved',
                    'home_group_name' => $existing->homeGroup->name,
                ], 422);
            } elseif ($existing->status === 'pending') {
                return response()->json([
                    'message' => "Vous avez déjà une demande en attente pour le groupe de maison : {$existing->homeGroup->name}.",
                    'status' => 'pending',
                    'home_group_name' => $existing->homeGroup->name,
                ], 422);
            }
        }

        $application = HomeGroupApplication::create([
            'user_id' => auth('sanctum')->id(),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'home_group_id' => $validated['home_group_id'],
            'motivation' => $validated['motivation'],
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Votre demande a été soumise avec succès.',
            'application' => $application->load('homeGroup'),
        ], 201);
    }

    /**
     * Verify the status of an application by email and phone.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:50',
        ]);

        $application = HomeGroupApplication::where('email', $validated['email'])
            ->where('phone', $validated['phone'])
            ->with('homeGroup')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$application) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'Aucune demande trouvée avec ces coordonnées.',
            ], 404);
        }

        return response()->json([
            'status' => $application->status,
            'home_group_name' => $application->homeGroup->name,
            'application' => $application,
        ]);
    }

    /**
     * Look up the status of a candidate's applications by email or phone.
     */
    public function status(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact' => ['required', 'string', 'max:255'],
        ]);

        $contact = trim($validated['contact']);
        $phoneDigits = str_replace(' ', '', $contact);

        $applications = HomeGroupApplication::query()
            ->with('homeGroup')
            ->where('email', $contact)
            ->orWhere('phone', $contact)
            ->orWhereRaw("REPLACE(phone, ' ', '') = ?", [$phoneDigits])
            ->latest()
            ->get();

        return response()->json([
            'data' => $applications->map(fn (HomeGroupApplication $application) => [
                'home_group' => $application->homeGroup?->name,
                'status' => $application->status,
                'decision_note' => $application->decision_note_public ? $application->decision_note : null,
                'created_at' => $application->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }
}
