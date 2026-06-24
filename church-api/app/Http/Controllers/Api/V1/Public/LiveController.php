<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Events\AudienceUpdated;
use App\Events\ChatMessageSent;
use App\Events\ReactionSent;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Public\LiveChatRequest;
use App\Models\LiveChatMessage;
use App\Models\PastLive;
use App\Models\Setting;
use App\Support\AudienceTracker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class LiveController extends Controller
{
    private const REACTIONS = ['heart', 'flame', 'hands', 'dove', 'crown'];

    /**
     * Heartbeat: register/refresh this viewer and broadcast the live audience.
     */
    public function presence(Request $request): JsonResponse
    {
        $clientId = (string) $request->validate(['client_id' => ['required', 'string', 'max:64']])['client_id'];
        $count = AudienceTracker::touch($clientId);
        broadcast(new AudienceUpdated($count));

        return response()->json(['data' => ['count' => $count]]);
    }

    public function leave(Request $request): JsonResponse
    {
        $clientId = (string) $request->validate(['client_id' => ['required', 'string', 'max:64']])['client_id'];
        $count = AudienceTracker::leave($clientId);
        broadcast(new AudienceUpdated($count));

        return response()->json(['data' => ['count' => $count]]);
    }

    /**
     * Recent messages of the running broadcast (initial chat load).
     */
    public function messages(): JsonResponse
    {
        $messages = LiveChatMessage::query()->live()->latest('id')->take(100)->get()->reverse()->values();

        return response()->json(['data' => $messages->map(fn (LiveChatMessage $m) => $this->shape($m))]);
    }

    /**
     * Post a chat message: persist with its time offset, then broadcast it.
     */
    public function chat(LiveChatRequest $request): JsonResponse
    {
        $message = LiveChatMessage::create([
            'past_live_id' => null,
            'author_name' => $request->validated('author_name'),
            'message' => $request->validated('message'),
            'time_offset_seconds' => $this->currentOffset(),
        ]);

        broadcast(new ChatMessageSent($message));

        return response()->json(['data' => $this->shape($message)], 201);
    }

    /**
     * Ephemeral reaction (heart/flame/hands): aggregate in cache + broadcast.
     */
    public function react(Request $request): JsonResponse
    {
        $type = (string) $request->validate([
            'type' => ['required', 'in:'.implode(',', self::REACTIONS)],
        ])['type'];

        // Seed the key first: `increment` on the database cache store is a no-op
        // when the key is absent (unlike the array store used in tests).
        $key = "live:reactions:{$type}";
        Cache::add($key, 0, now()->addHours(12));
        $total = (int) Cache::increment($key);
        broadcast(new ReactionSent($type, $total));

        return response()->json(['data' => ['type' => $type, 'total' => $total]]);
    }

    /**
     * Archived chat for a past broadcast — feeds the time-synced replay.
     */
    public function archivedChat(PastLive $pastLive): JsonResponse
    {
        $messages = $pastLive->liveChatMessages()
            ->where('is_moderated', false)
            ->orderBy('time_offset_seconds')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $messages->map(fn (LiveChatMessage $m) => $this->shape($m))]);
    }

    /**
     * Seconds elapsed since the broadcast started (0 if not live / unknown).
     */
    private function currentOffset(): int
    {
        $startedAt = Setting::get('live_started_at');
        if (! is_string($startedAt) || $startedAt === '') {
            return 0;
        }

        return max(0, now()->timestamp - Carbon::parse($startedAt)->timestamp);
    }

    /**
     * @return array<string, mixed>
     */
    private function shape(LiveChatMessage $m): array
    {
        return [
            'id' => $m->id,
            'author_name' => $m->author_name,
            'message' => $m->message,
            'time_offset_seconds' => $m->time_offset_seconds,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }
}
