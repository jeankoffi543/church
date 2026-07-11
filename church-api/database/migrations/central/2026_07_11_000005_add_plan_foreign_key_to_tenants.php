<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-140 — links tenants.plan_id (added nullable in CHR-134) to plans. SQLite
 * cannot add a foreign key to an existing table, so we skip the DB-level
 * constraint there (dev/tests); the Eloquent relation covers integrity. MySQL/
 * Postgres (production) get the real constraint.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('tenants', function (Blueprint $table) {
            $table->foreign('plan_id')->references('id')->on('plans')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
        });
    }
};
