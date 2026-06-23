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
        Schema::create('past_lives', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('youtube_id')->nullable();
            $table->string('video_path')->nullable();
            $table->string('thumbnail_path')->nullable();
            $table->string('series_name')->nullable();
            $table->foreignId('preacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('views_count')->default(0);
            $table->string('duration')->nullable();
            $table->dateTime('broadcasted_at');
            $table->timestamps();

            $table->index('series_name');
            $table->index('broadcasted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('past_lives');
    }
};
