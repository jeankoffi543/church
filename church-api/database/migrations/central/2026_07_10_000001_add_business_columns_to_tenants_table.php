<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-134 — promotes the tenant's business identity to real, queryable columns.
 *
 * Deliberately excludes the per-tenant DB credentials (tenancy_db_*): those stay
 * in the base `data` JSON column so their null values never leak into the
 * template connection config (see App\Models\Tenant::getCustomColumns()).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('central')->table('tenants', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
            $table->string('slug')->nullable()->unique()->after('name');
            $table->unsignedBigInteger('plan_id')->nullable()->index()->after('slug');
            $table->string('subscription_status')->default('trialing')->index()->after('plan_id');
            $table->timestamp('trial_ends_at')->nullable()->after('subscription_status');
            $table->json('features')->nullable()->after('trial_ends_at');
            $table->boolean('studio_enabled')->default(false)->after('features');
            $table->unsignedSmallInteger('studio_seats')->default(0)->after('studio_enabled');
            $table->string('status')->default('active')->index()->after('studio_seats');
        });
    }

    public function down(): void
    {
        Schema::connection('central')->table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'name',
                'slug',
                'plan_id',
                'subscription_status',
                'trial_ends_at',
                'features',
                'studio_enabled',
                'studio_seats',
                'status',
            ]);
        });
    }
};
