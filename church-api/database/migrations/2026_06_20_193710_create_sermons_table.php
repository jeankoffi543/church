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
        Schema::create('sermons', function (Blueprint $table) {
            $table->id();
            $table->string('series')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('speaker');
            $table->string('book')->nullable();
            $table->date('preached_at')->index();
            $table->string('duration')->nullable();
            $table->string('video_url')->nullable();
            $table->string('audio_url')->nullable();
            $table->boolean('is_published')->default(true)->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sermons');
    }
};
