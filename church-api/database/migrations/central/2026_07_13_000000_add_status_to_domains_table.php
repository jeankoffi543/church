<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-176 — explicit activation state machine for domains: pending → verified →
 * active (or failed), driven by the DNS-verify poller and the church's "activate"
 * action. `last_checked_at` records the poller's most recent DNS probe.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('verification_token')->index();
            $table->timestamp('last_checked_at')->nullable()->after('status');
        });

        // Backfill existing rows: a verified primary is live, a verified
        // secondary is verified, everything else stays pending (the column
        // default). Runs on the migrator's connection (the same one Schema used).
        DB::table('domains')->whereNotNull('verified_at')->where('is_primary', true)->update(['status' => 'active']);
        DB::table('domains')->whereNotNull('verified_at')->where('is_primary', false)->update(['status' => 'verified']);
    }

    public function down(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->dropColumn(['status', 'last_checked_at']);
        });
    }
};
