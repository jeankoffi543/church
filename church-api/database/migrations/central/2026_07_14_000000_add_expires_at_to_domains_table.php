<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-210 — expiry for domains the platform registered on a church's behalf, so
 * the renewal poller can auto-renew them. BYO custom domains (verified by TXT)
 * keep it null — we don't manage their lifecycle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable()->after('verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->dropColumn('expires_at');
        });
    }
};
