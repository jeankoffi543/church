<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\DatabaseServer;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('shards:register
    {name : Unique label for the server (e.g. shard-eu-1)}
    {host : Hostname/IP of the database server}
    {--connection=mysql : DB manager / driver (mysql, mariadb, pgsql, sqlite)}
    {--port= : Port (blank = driver default)}
    {--username= : DB user used to create tenant databases}
    {--password= : DB password for that user}
    {--max-tenants= : Capacity cap (blank = unlimited)}
    {--weight=1 : Selection weight — heavier servers are preferred (CHR-163)}
    {--inactive : Register the server but keep it closed to new tenants}')]
#[Description('Register (or update) a database server in the central shard registry (CHR-162).')]
class RegisterDatabaseServer extends Command
{
    public function handle(): int
    {
        $max = $this->option('max-tenants');
        $port = $this->option('port');

        $server = DatabaseServer::updateOrCreate(
            ['name' => $this->argument('name')],
            [
                'connection' => $this->option('connection'),
                'host' => $this->argument('host'),
                'port' => $port !== null ? (int) $port : null,
                'username' => $this->option('username'),
                'password' => $this->option('password'),
                'max_tenants' => $max !== null ? (int) $max : null,
                'weight' => (int) $this->option('weight'),
                'is_active' => ! $this->option('inactive'),
            ],
        );

        $this->info(sprintf(
            'Serveur « %s » enregistré (%s%s) — %s.',
            $server->name,
            $server->host,
            $server->port !== null ? ':'.$server->port : '',
            $server->is_active ? 'actif' : 'inactif',
        ));

        return self::SUCCESS;
    }
}
