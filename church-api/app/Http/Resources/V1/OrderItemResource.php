<?php

namespace App\Http\Resources\V1;

use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderItem
 */
class OrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'order_id' => (string) $this->order_id,
            'product_id' => $this->product_id ? (string) $this->product_id : null,
            'variant_id' => $this->variant_id,
            'product_title' => $this->product_title,
            'quantity' => (int) $this->quantity,
            'price' => (int) $this->price,
            'selected_attributes' => $this->selected_attributes ?? [],
        ];
    }
}
