<?php

namespace App\Http\Resources\V1;

use App\Models\Ministry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Ministry
 */
class MinistryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'image' => $this->image,
            'initial' => $this->initial(),
            'description' => $this->description,
            'schedule' => $this->schedule,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'chef_id' => $this->chef_id,
            'chef' => $this->whenLoaded('chef', fn () => $this->chef ? [
                'id' => $this->chef->id,
                'name' => $this->chef->name,
                'email' => $this->chef->email,
            ] : null),
        ];
    }
}
