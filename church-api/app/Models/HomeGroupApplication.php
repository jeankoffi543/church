<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomeGroupApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'home_group_id',
        'motivation',
        'status',
        'processed_by',
    ];

    /**
     * Get the home group applied for.
     */
    public function homeGroup(): BelongsTo
    {
        return $this->belongsTo(HomeGroup::class, 'home_group_id');
    }

    /**
     * Get the user who submitted the application, if registered.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the administrator/pastor who processed this application.
     */
    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
