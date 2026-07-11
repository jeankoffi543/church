<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CentralRole;
use Database\Factories\CentralUserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * A platform ("landlord") staff account. Pinned to the central connection via
 * {@see CentralConnection} so it always resolves against the landlord DB, even
 * inside an initialized tenancy. Authenticated through the `central` guard —
 * completely separate from the tenant `users` table and its Spatie roles.
 */
class CentralUser extends Authenticatable
{
    /** @use HasFactory<CentralUserFactory> */
    use CentralConnection, HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
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
            'is_active' => 'boolean',
            'role' => CentralRole::class,
        ];
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === CentralRole::SuperAdmin;
    }
}
