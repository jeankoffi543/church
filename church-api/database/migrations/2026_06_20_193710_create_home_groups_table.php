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
        Schema::create('home_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('leader')->nullable();
            $table->string('address');
            $table->string('schedule')->nullable();
            // Geographic coordinates for the interactive map, e.g.
            // {"top":"46%","left":"28%"} or {"lat":5.34,"lng":-4.08}.
            $table->json('coordinates')->nullable();
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('home_groups');
    }
};
