<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('live_chat_messages', function (Blueprint $table) {
            $table->id();
            // Null while the broadcast is live; set to the archive (past_lives)
            // when the live ends, so the chat stays consultable on replay.
            $table->foreignId('past_live_id')->nullable()->constrained('past_lives')->cascadeOnDelete();
            $table->string('author_name');
            $table->text('message');
            // Seconds elapsed since the live started → time-synced replay.
            $table->integer('time_offset_seconds')->default(0)->index();
            $table->boolean('is_moderated')->default(false)->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('live_chat_messages');
    }
};
