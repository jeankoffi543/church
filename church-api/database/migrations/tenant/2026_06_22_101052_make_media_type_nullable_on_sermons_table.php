<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sermons', function (Blueprint $table) {
            // A sermon may carry no media at all (text/notes only).
            $table->string('media_type')->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Backfill rows with no media before restoring the NOT NULL constraint.
        DB::table('sermons')->whereNull('media_type')->update(['media_type' => 'video_url']);

        Schema::table('sermons', function (Blueprint $table) {
            $table->string('media_type')->default('video_url')->nullable(false)->change();
        });
    }
};
