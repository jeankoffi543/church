<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-142 — Studio Live activation keys (central DB). One row per seat/device:
 * the long-lived `chr_live_*` key is stored only as a SHA-256 hash; the plaintext
 * is shown once. The key proves the RIGHT; the short session token it mints
 * carries the ACCESS.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('studio_activations', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->string('key_hash', 64)->unique();
            $table->string('key_prefix'); // e.g. "chr_live_7qk4m2" — for display
            $table->string('label');
            $table->string('device_fingerprint')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('studio_activations');
    }
};
