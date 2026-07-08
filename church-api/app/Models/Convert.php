<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * A "nouvelle âme" — someone who made a decision for Christ (or re-engaged),
 * captured at a culte's altar call or an evangelism outreach. Feeds the
 * future discipleship/follow-up module as the trackable entity alongside
 * {@see Member}.
 *
 * @property int $id
 * @property string $name
 * @property string|null $phone
 * @property string|null $email
 * @property string $decision_type
 * @property Carbon $decision_date
 * @property int|null $service_id
 * @property int|null $evangelism_campaign_id
 * @property int|null $assigned_counselor_id
 * @property string $status
 * @property string|null $notes
 */
class Convert extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'name' => SearchOperator::LIKE,
        'phone' => SearchOperator::LIKE,
        'email' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'name',
        'status',
        'decision_date',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('status'),
            ...QueryFilters::exact('decision_type'),
            ...QueryFilters::exact('assigned_counselor_id'),
            ...QueryFilters::exact('evangelism_campaign_id'),
            ...QueryFilters::text('name'),
            ...QueryFilters::text('phone'),
        ];
    }

    protected $fillable = [
        'name',
        'phone',
        'email',
        'decision_type',
        'decision_date',
        'service_id',
        'evangelism_campaign_id',
        'assigned_counselor_id',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'decision_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * @return BelongsTo<EvangelismCampaign, $this>
     */
    public function evangelismCampaign(): BelongsTo
    {
        return $this->belongsTo(EvangelismCampaign::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedCounselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_counselor_id');
    }
}
