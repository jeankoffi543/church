<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\Permission\Models\Role;

/**
 * @mixin Role
 */
class RoleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'permissions' => $this->whenLoaded('permissions', fn () => $this->permissions->pluck('name')->all(), []),
            'users_count' => $this->whenCounted('users'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
