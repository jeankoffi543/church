<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-138 — Sanctum tokens for the central DB, so platform staff tokens live
 * alongside their users (tenant users keep their own table in the tenant DB).
 *
 * Guarded by hasTable(): in the unified in-memory test DB the tenant migration
 * already created this table, so we skip it there; a real (separate) central
 * database gets its own copy.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('personal_access_tokens')) {
            return;
        }

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Left intact on purpose: in the shared test DB this table belongs to
        // the tenant migration. A dedicated central DB can drop it manually.
    }
};
