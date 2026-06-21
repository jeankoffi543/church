<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\PrayerRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrayerRequestController extends Controller
{
    /**
     * Display a listing of prayer requests.
     */
    public function index(): JsonResponse
    {
        $prayers = PrayerRequest::with('assignee')->latest()->get();
        return response()->json(['data' => $prayers]);
    }

    /**
     * Store a newly created prayer request.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'message' => ['required', 'string', 'max:2000'],
            'status' => ['nullable', 'string', 'in:new,praying,answered,archived'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'pastoral_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $prayer = PrayerRequest::create($validated);

        return response()->json([
            'message' => 'Demande de prière créée avec succès.',
            'data' => $prayer->load('assignee'),
        ], 201);
    }

    /**
     * Display the specified prayer request.
     */
    public function show(PrayerRequest $prayer): JsonResponse
    {
        return response()->json(['data' => $prayer->load('assignee')]);
    }

    /**
     * Update the specified prayer request in storage.
     */
    public function update(Request $request, PrayerRequest $prayer): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'message' => ['required', 'string', 'max:2000'],
            'status' => ['required', 'string', 'in:new,praying,answered,archived'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'pastoral_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $prayer->update($validated);

        return response()->json([
            'message' => 'Demande de prière mise à jour avec succès.',
            'data' => $prayer->load('assignee'),
        ]);
    }

    /**
     * Change only the status of the specified prayer request.
     */
    public function updateStatus(Request $request, PrayerRequest $prayer): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:new,praying,answered,archived'],
        ]);

        $prayer->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => 'Statut de la demande mis à jour.',
            'data' => $prayer->load('assignee'),
        ]);
    }

    /**
     * Assign the specified prayer request to a user/pastor.
     */
    public function assign(Request $request, PrayerRequest $prayer): JsonResponse
    {
        $validated = $request->validate([
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $prayer->update([
            'assigned_to' => $validated['assigned_to'],
        ]);

        return response()->json([
            'message' => 'Intercesseur assigné avec succès.',
            'data' => $prayer->load('assignee'),
        ]);
    }

    /**
     * Remove the specified prayer request from storage.
     */
    public function destroy(PrayerRequest $prayer): JsonResponse
    {
        $prayer->delete();

        return response()->json(['message' => 'Demande de prière supprimée.'], 200);
    }
}
