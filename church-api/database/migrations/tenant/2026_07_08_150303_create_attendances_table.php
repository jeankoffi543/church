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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            // Aggregate headcount by category (hommes/femmes/enfants/visiteurs) —
            // not a per-fidèle roster. An usher tallies heads by category, they
            // don't scan every individual at the door.
            $table->foreignId('service_id')->constrained()->restrictOnDelete();
            $table->string('category');
            $table->unsignedInteger('count')->default(0);
            $table->foreignId('recorded_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['service_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
