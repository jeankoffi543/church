<?php

namespace App\Http\Resources\V1;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'reference' => $this->reference,
            'customer_first_name' => $this->customer_first_name,
            'customer_last_name' => $this->customer_last_name,
            'customer_phone' => $this->customer_phone,
            'customer_email' => $this->customer_email,
            'subtotal' => (int) $this->subtotal,
            'delivery_fee' => (int) $this->delivery_fee,
            'total_amount' => (int) $this->total_amount,
            'delivery_key' => $this->delivery_key,
            'delivery_label' => $this->delivery_label,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'fulfillment_status' => $this->fulfillment_status,
            'notes' => $this->notes,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
