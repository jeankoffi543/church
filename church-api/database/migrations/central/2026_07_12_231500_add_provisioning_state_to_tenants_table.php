<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-173 — async provisioning state machine. A tenant's database is now built
 * off the request by the ProvisionTenant job; these columns let the signup
 * wizard poll pending → provisioning → ready|failed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->string('provisioning_status')->default('pending')->index()->after('status');
            $table->text('provisioning_error')->nullable()->after('provisioning_status');
            $table->timestamp('provisioned_at')->nullable()->after('provisioning_error');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->dropColumn(['provisioning_status', 'provisioning_error', 'provisioned_at']);
        });
    }
};
