<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-149 — the mobile Hub's push registry (central). One app installs once but
 * follows many churches, so a device ↔ tenant subscription lives here (not in a
 * single tenant DB), each carrying the topics the user opted into.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('device_token');
            $table->string('platform')->default('android'); // ios · android · web
            $table->string('tenant_id')->index();
            $table->json('topics')->nullable(); // e.g. ["news","live"]
            $table->timestamps();

            $table->unique(['device_token', 'tenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
