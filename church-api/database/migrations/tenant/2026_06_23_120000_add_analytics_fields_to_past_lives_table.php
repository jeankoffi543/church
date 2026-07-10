<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('past_lives', function (Blueprint $table) {
            // How the broadcast entered the archive: captured from a live (badge
            // "Live Archive") vs a video manually uploaded by an admin ("Upload").
            $table->enum('source_type', ['live_archive', 'upload'])->default('upload')->index()->after('series_name');
            // Aggregated reaction tallies snapshotted when the live is archived.
            $table->json('reaction_stats')->nullable()->after('views_count');
        });
    }

    public function down(): void
    {
        Schema::table('past_lives', function (Blueprint $table) {
            $table->dropColumn(['source_type', 'reaction_stats']);
        });
    }
};
