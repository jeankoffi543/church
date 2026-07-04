<?php

namespace App\Http\Resources\V1;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description ?? '',
            'base_price' => (int) $this->base_price,
            'old_price' => $this->old_price ? (int) $this->old_price : null,
            'category' => $this->category,
            'badge' => $this->badge,
            'is_digital' => (bool) $this->is_digital,
            'is_featured' => (bool) $this->is_featured,
            'unlimited_stock' => (bool) $this->unlimited_stock,
            'low_stock_threshold' => $this->low_stock_threshold !== null ? (int) $this->low_stock_threshold : null,
            'status' => $this->status,
            'images' => $this->images ?? [],
            'attributes' => $this->attributes ?? [],
            'variants' => $this->variants ?? [],
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
