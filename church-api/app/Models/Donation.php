<?php

namespace App\Models;

use App\Enums\DonationFrequency;
use App\Enums\DonationStatus;
use Database\Factories\DonationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Immutable accounting ledger entry for a single donation.
 *
 * @property int $id
 * @property string $reference
 * @property int|null $user_id
 * @property string $donor_name
 * @property string $donor_email
 * @property string|null $donor_phone
 * @property string $purpose_key
 * @property int $amount
 * @property string $currency
 * @property DonationFrequency $frequency
 * @property DonationStatus $status
 * @property string|null $paystack_reference
 * @property string|null $channel
 * @property array<string, mixed>|null $metadata
 * @property Carbon $created_at
 */
class Donation extends Model
{
    /** @use HasFactory<DonationFactory> */
    use HasFactory;

    protected $fillable = [
        'reference',
        'user_id',
        'donor_name',
        'donor_email',
        'donor_phone',
        'purpose_key',
        'amount',
        'currency',
        'frequency',
        'status',
        'paystack_reference',
        'channel',
        'metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'frequency' => DonationFrequency::class,
            'status' => DonationStatus::class,
            'metadata' => 'array',
        ];
    }

    /**
     * The authenticated donor, when the gift was not anonymous.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @param  Builder<Donation>  $query
     */
    public function scopeSuccessful(Builder $query): void
    {
        $query->where('status', DonationStatus::Success->value);
    }

    /**
     * @param  Builder<Donation>  $query
     */
    public function scopeLatestFirst(Builder $query): void
    {
        $query->orderByDesc('created_at')->orderByDesc('id');
    }
}
