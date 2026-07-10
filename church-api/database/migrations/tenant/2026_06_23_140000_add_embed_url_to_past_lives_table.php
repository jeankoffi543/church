<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('past_lives', function (Blueprint $table) {
            // Generic playable URL for archives that are neither a YouTube id nor
            // an uploaded file (e.g. a Facebook VOD, or a recorded HLS playlist).
            $table->string('embed_url')->nullable()->after('video_path');
        });
    }

    public function down(): void
    {
        Schema::table('past_lives', function (Blueprint $table) {
            $table->dropColumn('embed_url');
        });
    }
};
