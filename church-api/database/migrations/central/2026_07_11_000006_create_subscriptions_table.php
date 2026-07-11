<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-141 — a tenant's platform subscription (central DB): our mirror of the
 * Paystack subscription that pays for the church's plan. `tenants.subscription_status`
 * is the denormalised snapshot driven from here by the billing webhook.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->unsignedBigInteger('plan_id')->nullable();
            $table->string('status')->default('trialing')->index();
            $table->string('paystack_customer_code')->nullable();
            $table->string('paystack_subscription_code')->nullable()->index();
            $table->string('paystack_email_token')->nullable();
            $table->text('authorization_url')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('cancel_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
