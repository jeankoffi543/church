<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * @property string $reference
 * @property string $customer_first_name
 * @property string $customer_last_name
 * @property string $customer_phone
 * @property string $customer_email
 * @property int $subtotal
 * @property int $delivery_fee
 * @property int $total_amount
 * @property string $delivery_key
 * @property string|null $delivery_label
 * @property string $payment_method
 * @property string $payment_status
 * @property string $fulfillment_status
 * @property string|null $notes
 */
class Order extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'reference' => SearchOperator::LIKE,
        'customer_first_name' => SearchOperator::LIKE,
        'customer_last_name' => SearchOperator::LIKE,
        'customer_email' => SearchOperator::LIKE,
        'customer_phone' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'reference',
        'total_amount',
        'payment_status',
        'fulfillment_status',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('payment_status'),
            ...QueryFilters::exact('fulfillment_status'),
            ...QueryFilters::text('reference'),
            ...QueryFilters::text('customer_email'),
            ...QueryFilters::text('customer_phone'),
        ];
    }

    protected $fillable = [
        'reference',
        'customer_first_name',
        'customer_last_name',
        'customer_phone',
        'customer_email',
        'subtotal',
        'delivery_fee',
        'total_amount',
        'delivery_key',
        'delivery_label',
        'payment_method',
        'payment_status',
        'fulfillment_status',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subtotal' => 'integer',
            'delivery_fee' => 'integer',
            'total_amount' => 'integer',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
