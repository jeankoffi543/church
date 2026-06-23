<?php

namespace App\Http\Resources\V1;

use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Branch
 */
class BranchResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'address' => $this->address,
            'phone' => $this->phone,
            'hours' => $this->hours,
            'lat' => $this->lat !== null ? (float) $this->lat : null,
            'lng' => $this->lng !== null ? (float) $this->lng : null,
            'website' => $this->website,
            'pastor_id' => $this->pastor_id,
            'pastor' => $this->relationLoaded('pastor') && $this->pastor !== null
                ? [
                    'id' => $this->pastor->id,
                    'name' => $this->pastor->name,
                    'email' => $this->pastor->email,
                    'initials' => $this->generateInitials($this->pastor->name),
                ]
                : null,
        ];
    }

    private function generateInitials(string $name): string
    {
        $words = array_filter(explode(' ', $name));
        if (count($words) >= 2) {
            return mb_strtoupper(mb_substr(reset($words), 0, 1) . mb_substr(end($words), 0, 1));
        }
        return mb_strtoupper(mb_substr($name, 0, 2));
    }
}
