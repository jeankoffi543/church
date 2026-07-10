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
        Schema::create('resource_bookings', function (Blueprint $table) {
            $table->id();
            // Historical bookings are kept when a resource is retired —
            // restrict, don't cascade, so the log stays intact.
            $table->foreignId('resource_id')->constrained()->restrictOnDelete();
            $table->string('title');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->foreignId('booked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            // confirme | annule
            $table->string('status')->default('confirme');
            $table->timestamps();

            $table->index(['resource_id', 'starts_at', 'ends_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resource_bookings');
    }
};
