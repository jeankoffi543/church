<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Events\PrayerRequestReceived;
use App\Http\Controllers\Controller;
use App\Models\PrayerRequest;
use App\Services\PrayerNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrayerRequestController extends Controller
{
    /**
     * Store a newly created prayer request in database.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $prayer = PrayerRequest::create(array_merge($validated, [
            'status' => 'new',
        ]));

        // TODO: Implémenter ici l'envoi réel via le canal WhatsApp / SMS / Email en utilisant prayer_automated_notification_message
        // Send automated notification
        app(PrayerNotificationService::class)->sendConfirmation($prayer);

        // Notify the church's back office in real time on its private admin channel.
        broadcast(new PrayerRequestReceived($prayer));

        return response()->json([
            'message' => PrayerNotificationService::getSuccessMessage(),
            'data' => $prayer,
        ], 201);
    }
}
