<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\IdentityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * A GLOBAL end-user identity — a churchgoer (CHR-165). Pinned to the central
 * connection via {@see CentralConnection} so it resolves against the landlord DB
 * even inside an initialized tenancy. Authenticated through the `identity` guard,
 * completely separate from tenant `users` (church staff) and `central_users`
 * (platform staff). One identity will follow/attend many churches (CHR-166).
 */
class Identity extends Authenticatable
{
    /** @use HasFactory<IdentityFactory> */
    use CentralConnection, HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'avatar_url',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * The churches this identity follows / belongs to (CHR-166).
     *
     * @return HasMany<Membership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /**
     * Push device registrations linked to this identity (CHR-168).
     *
     * @return HasMany<PushSubscription, $this>
     */
    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
    }
}
