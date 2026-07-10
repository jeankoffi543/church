<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-134 — enriches domains with the metadata the resolver and the custom-domain
 * onboarding (CHR-148) need: subdomain vs custom, the primary hostname, DNS
 * verification and on-demand TLS state.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->string('type')->default('subdomain')->after('domain');
            $table->boolean('is_primary')->default(false)->after('type');
            $table->timestamp('verified_at')->nullable()->after('is_primary');
            $table->string('ssl_status')->nullable()->after('verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->dropColumn(['type', 'is_primary', 'verified_at', 'ssl_status']);
        });
    }
};
