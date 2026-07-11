<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-138 — platform ("landlord") staff. These are NOT church users: they live
 * only in the central DB, authenticate through the `central` guard, and manage
 * tenants/subscriptions. A church's own "Super Admin" is a tenant-DB role and
 * has nothing to do with this table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('central_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role')->default('super_admin');
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('central_users');
    }
};
