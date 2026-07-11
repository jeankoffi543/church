<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-148 — ownership token for custom-domain verification: the church proves it
 * controls `www.eglise.org` by publishing this value as a TXT record before we
 * mark the domain verified and let the edge issue its certificate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->string('verification_token')->nullable()->after('ssl_status');
        });
    }

    public function down(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->dropColumn('verification_token');
        });
    }
};
