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
        Schema::table('sermons', function (Blueprint $table) {
            // How the sermon media is provided / where it lives.
            $table->string('media_type')->default('video_url')->after('duration');
            // Local/S3 path for uploaded files (video_file / audio_file).
            $table->string('media_path')->nullable()->after('media_type');
            // External link for video_url / audio_url (YouTube, SoundCloud…).
            $table->string('media_url')->nullable()->after('media_path');
            // Optional custom cover used by the "Dernier message" hero.
            $table->string('background_image')->nullable()->after('media_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sermons', function (Blueprint $table) {
            $table->dropColumn(['media_type', 'media_path', 'media_url', 'background_image']);
        });
    }
};
