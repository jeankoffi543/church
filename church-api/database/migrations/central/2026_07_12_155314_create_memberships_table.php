<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-166 — links a global identity (churchgoer) to a church (tenant), and
 * optionally to that church's OWN local member record. Lives in the central DB:
 * `local_member_id` points at a row in the tenant's `members` table (a different
 * database), so it's a plain id, never a foreign key. `is_public` is the privacy
 * switch — whether the church may see who follows it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('identity_id')->constrained('identities')->cascadeOnDelete();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unsignedBigInteger('local_member_id')->nullable(); // tenant DB members.id
            $table->string('status')->default('follower');             // follower | member
            $table->boolean('is_public')->default(true);               // privacy
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();
            $table->unique(['identity_id', 'tenant_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('memberships');
    }
};
