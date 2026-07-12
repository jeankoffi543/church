<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-171 — a per-device delivery receipt for a campaign (tenant DB). Written by
 * the fan-out job; `opened_at` is stamped when the app reports the notification
 * was opened, powering the campaign's delivery/open analytics.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('push_campaign_id')->constrained()->cascadeOnDelete();
            $table->string('device_token');
            $table->boolean('delivered')->default(true);
            $table->timestamp('opened_at')->nullable();
            $table->timestamps();
            $table->unique(['push_campaign_id', 'device_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_receipts');
    }
};
