<?php

namespace App\Http\Resources\V1;

use App\Models\HomeGroup;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin HomeGroup
 */
class HomeGroupResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'leader' => $this->leader,
            'address' => $this->address,
            'schedule' => $this->schedule,
            'coordinates' => $this->coordinates,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'leader_id' => $this->leader_id,
        ];
    }
}
