<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-164 — an optional read replica for a shard. When set, a tenant placed on
 * this server gets a read/write-split connection (reads → replica, writes →
 * primary), so read-heavy traffic offloads the primary.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('database_servers', function (Blueprint $table) {
            $table->string('read_host')->nullable()->after('host');
        });
    }

    public function down(): void
    {
        Schema::table('database_servers', function (Blueprint $table) {
            $table->dropColumn('read_host');
        });
    }
};
