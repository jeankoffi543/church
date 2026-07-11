<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Models\Setting;
use App\Models\StudioActivation;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Studio Live activation (CHR-142). Generates/validates the long-lived
 * `chr_live_*` keys and mints the short-lived session the studio-native app
 * uses against the tenant's API + media server.
 */
class StudioActivationService
{
    public const KEY_PREFIX = 'chr_live_';

    private const SESSION_MINUTES = 15;

    /**
     * Mint a new key for a tenant seat. Returns the plaintext (shown ONCE) and
     * the stored record.
     *
     * @return array{plain: string, activation: StudioActivation}
     */
    public function generate(Tenant $tenant, string $label): array
    {
        $plain = self::KEY_PREFIX.Str::lower(Str::random(32));

        $activation = StudioActivation::query()->create([
            'tenant_id' => $tenant->id,
            'key_hash' => hash('sha256', $plain),
            'key_prefix' => substr($plain, 0, 16),
            'label' => $label,
        ]);

        return ['plain' => $plain, 'activation' => $activation];
    }

    /**
     * Validate a key, bind the device, refresh the heartbeat and return a fresh
     * session (token + connection info). Aborts with 401/403 on failure.
     *
     * @return array<string, mixed>
     */
    public function activate(string $key, ?string $device): array
    {
        $activation = StudioActivation::query()->where('key_hash', hash('sha256', $key))->first();

        abort_if($activation === null || $activation->revoked_at !== null, Response::HTTP_UNAUTHORIZED, 'Clé Studio invalide ou révoquée.');

        $tenant = $activation->tenant;
        abort_if($tenant === null, Response::HTTP_UNAUTHORIZED, 'Église introuvable.');

        abort_unless($tenant->studio_enabled, Response::HTTP_FORBIDDEN, "Le Studio Live n'est pas inclus dans l'offre de cette église.");

        $lapsed = in_array($tenant->subscription_status, [SubscriptionStatus::Suspended, SubscriptionStatus::Canceled], true);
        abort_if($tenant->status !== TenantStatus::Active || $lapsed, Response::HTTP_FORBIDDEN, 'Église indisponible (abonnement suspendu).');

        // One key ↔ one device: bind on first use, reject a different device.
        if ($device !== null && $device !== '') {
            abort_if(
                $activation->device_fingerprint !== null && $activation->device_fingerprint !== $device,
                Response::HTTP_FORBIDDEN,
                'Cette clé est déjà liée à un autre poste.',
            );
            $activation->device_fingerprint = $device;
        }

        $activation->last_seen_at = now();
        $activation->save();

        return $this->session($tenant);
    }

    /**
     * @return array<string, mixed>
     */
    private function session(Tenant $tenant): array
    {
        $expiresAt = now()->addMinutes(self::SESSION_MINUTES);
        $token = null;
        $streamKey = null;

        $tenant->run(function () use (&$token, &$streamKey, $expiresAt): void {
            // whereHas (not the Spatie role() scope) so an absent role doesn't throw.
            $user = User::query()->whereHas('roles', fn ($q) => $q->where('name', AccessControl::SUPER_ADMIN))->first()
                ?? User::query()->first();

            if ($user !== null) {
                $token = $user->createToken('studio-session', ['studio'], $expiresAt)->plainTextToken;
            }

            $streamKey = Setting::get('live_stream_key');
            if (! is_string($streamKey) || $streamKey === '') {
                $streamKey = 'sk_'.Str::lower(Str::random(24));
                Setting::set('live_stream_key', $streamKey, 'live');
            }
        });

        return [
            'session_token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'tenant' => [
                'id' => $tenant->id,
                'domain' => $tenant->domains()->where('is_primary', true)->value('domain'),
            ],
            // Per-tenant publish credentials — replace the old global RTMP_PUBLISH_KEY.
            'stream' => [
                'whip_url' => config('services.srs.whip_base'),
                'stream_key' => $streamKey,
            ],
        ];
    }
}
