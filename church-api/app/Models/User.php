<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\QueryFilters;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasFilters, HasRoles, IsSearchable, IsSortable, Notifiable;

    protected array $searchable = [
        'name' => SearchOperator::LIKE,
        'email' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'name',
        'email',
        'is_active',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('is_active'),
            ...QueryFilters::text('name'),
            ...QueryFilters::text('email'),
            Filter::make('roles', 'role')->applyWith(
                fn ($q, $value) => $q->whereHas('roles', fn ($r) => $r->where('name', $value))
            ),
            Filter::make('roles', 'role__eq')->applyWith(
                fn ($q, $value) => $q->whereHas('roles', fn ($r) => $r->where('name', $value))
            ),
        ];
    }

    /**
     * The guard the Spatie roles/permissions resolve against (Sanctum issues
     * tokens on the default `web`/`sanctum` guard for this API).
     */
    protected string $guard_name = 'web';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }
}
