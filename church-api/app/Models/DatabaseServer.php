<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\DatabaseServerFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * A physical database server (shard) tenants can be placed on (CHR-162). This
 * central registry is what the provisioner picks from (CHR-163) and rebalances
 * across (CHR-164). A tenant's actual per-DB credentials still live encrypted on
 * the tenant itself (stancl VirtualColumn) — this row is the source they are
 * seeded from and the capacity ledger.
 */
class DatabaseServer extends Model
{
    /** @use HasFactory<DatabaseServerFactory> */
    use CentralConnection, HasFactory;

    protected $fillable = [
        'name',
        'connection',
        'host',
        'read_host',
        'port',
        'username',
        'password',
        'is_active',
        'max_tenants',
        'weight',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'encrypted',
            'is_active' => 'boolean',
            'port' => 'integer',
            'max_tenants' => 'integer',
            'weight' => 'integer',
        ];
    }

    /**
     * @return HasMany<Tenant, $this>
     */
    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }

    /**
     * Point a tenant at this server: write its per-DB connection internals
     * (host/port/user/pass + the `db_connection` template) and link it in the
     * registry. Shared by shard SELECTION at provisioning (CHR-163) and the
     * move command (CHR-164). When a read replica is set, the tenant gets a
     * read/write-split connection (reads → replica, writes → primary).
     */
    public function applyTo(Tenant $tenant): void
    {
        $tenant->database_server_id = $this->id;
        // NB: read the `connection` COLUMN via getAttribute — inside the model
        // `$this->connection` resolves Eloquent's protected connection-name
        // property, not the column (they collide by name).
        $tenant->setInternal('db_connection', $this->getAttribute('connection'));
        $tenant->setInternal('db_host', $this->host);

        if ($this->port !== null) {
            $tenant->setInternal('db_port', $this->port);
        }

        if ($this->username !== null) {
            $tenant->setInternal('db_username', $this->username);
        }

        if ($this->password !== null) {
            $tenant->setInternal('db_password', $this->password);
        }

        if ($this->read_host !== null) {
            $tenant->setInternal('db_read', ['host' => [$this->read_host]]);
            $tenant->setInternal('db_write', ['host' => [$this->host]]);
            $tenant->setInternal('db_sticky', true);
        }
    }

    /** Whether this server can still take on another tenant (null cap = unlimited). */
    public function hasCapacity(): bool
    {
        return $this->max_tenants === null || $this->tenants()->count() < $this->max_tenants;
    }

    /** Active AND under capacity — eligible to receive a new tenant (CHR-163). */
    public function isAvailable(): bool
    {
        return $this->is_active && $this->hasCapacity();
    }

    /**
     * Servers accepting new tenants, heaviest weight first. Capacity still has to
     * be checked per row via {@see hasCapacity()} (it depends on a live count).
     *
     * @param  Builder<DatabaseServer>  $query
     * @return Builder<DatabaseServer>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderByDesc('weight');
    }
}
