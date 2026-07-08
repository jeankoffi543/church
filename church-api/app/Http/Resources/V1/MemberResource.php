<?php

namespace App\Http\Resources\V1;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Member
 */
class MemberResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'gender' => $this->gender,
            'birthdate' => $this->birthdate?->format('Y-m-d'),
            'address' => $this->address,
            'marital_status' => $this->marital_status,
            'join_date' => $this->join_date?->format('Y-m-d'),
            'member_type' => $this->member_type,
            'home_group_id' => $this->home_group_id,
            'home_group_name' => $this->whenLoaded('homeGroup', fn () => $this->homeGroup?->name),
            'status' => $this->status,
            'photo' => $this->photo,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
