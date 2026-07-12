<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-168 — tie a push device to a global identity (nullable: anonymous device
 * subscriptions from CHR-149 keep working). Lets the Push Hub reach a churchgoer
 * across every church they follow. SQLite can't add a foreign key to an existing
 * table, so the DB-level constraint is skipped there (dev/tests) — the Eloquent
 * relation covers integrity; MySQL/Postgres get the real one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->unsignedBigInteger('identity_id')->nullable()->after('id')->index();
        });

        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->foreign('identity_id')->references('id')->on('identities')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('push_subscriptions', function (Blueprint $table) {
                $table->dropForeign(['identity_id']);
            });
        }

        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->dropColumn('identity_id');
        });
    }
};
