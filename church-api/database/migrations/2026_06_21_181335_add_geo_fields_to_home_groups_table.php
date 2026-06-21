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
        Schema::table('home_groups', function (Blueprint $table) {
            // Real geo coordinates for the interactive Mapbox cartography.
            $table->decimal('latitude', 10, 7)->nullable()->after('address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            // Sector/neighbourhood (e.g. "Cocody", "Yopougon") and split schedule.
            $table->string('zone_name')->nullable()->after('longitude');
            $table->string('meeting_day')->nullable()->after('zone_name');
            $table->string('meeting_time')->nullable()->after('meeting_day');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('home_groups', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'zone_name', 'meeting_day', 'meeting_time']);
        });
    }
};
