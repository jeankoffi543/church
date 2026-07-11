<?php

namespace App\Http\Resources\V1;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Tenant
 */
class TenantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'status' => $this->status?->value,
            'subscription_status' => $this->subscription_status?->value,
            'plan_id' => $this->plan_id,
            'trial_ends_at' => $this->trial_ends_at?->toIso8601String(),
            'studio_enabled' => (bool) $this->studio_enabled,
            'studio_seats' => (int) $this->studio_seats,
            'domains' => $this->whenLoaded('domains', fn () => $this->domains->map(fn ($domain) => [
                'domain' => $domain->domain,
                'type' => $domain->type?->value,
                'is_primary' => (bool) $domain->is_primary,
                'ssl_status' => $domain->ssl_status?->value,
                'verified_at' => $domain->verified_at?->toIso8601String(),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
