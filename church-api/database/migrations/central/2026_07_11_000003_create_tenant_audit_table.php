<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-139 — append-only trail of every platform action taken on a tenant
 * (creation, suspension, deletion, impersonation…). Lives in the central DB so
 * the landlord keeps an accountable history even after a tenant is removed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_audit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('central_user_id')->nullable()->constrained('central_users')->nullOnDelete();
            $table->string('tenant_id')->nullable()->index();
            $table->string('action')->index();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_audit');
    }
};
