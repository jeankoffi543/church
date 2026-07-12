<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-162 — records which database server (shard) each tenant lives on. Nullable:
 * existing tenants stay on the implicit default server until moved (CHR-164), and
 * new tenants get one chosen at provisioning (CHR-163). SQLite can't add a foreign
 * key to an existing table, so the DB-level constraint is skipped there (dev/tests)
 * — the Eloquent relation covers integrity; MySQL/Postgres get the real one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->unsignedBigInteger('database_server_id')->nullable()->after('id')->index();
        });

        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('tenants', function (Blueprint $table) {
            $table->foreign('database_server_id')->references('id')->on('database_servers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('tenants', function (Blueprint $table) {
                $table->dropForeign(['database_server_id']);
            });
        }

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('database_server_id');
        });
    }
};
