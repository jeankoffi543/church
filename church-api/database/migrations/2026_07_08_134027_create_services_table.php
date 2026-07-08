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
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            // Free label, e.g. "Veillée spéciale Pâques" — nullable, defaults to the type's display name.
            $table->string('title')->nullable();
            // Free string (culte_dominical, etude_biblique, veillee, culte_special, autre…) — kept
            // flexible like Donation::purpose_key / PrayerRequest::category rather than a DB enum,
            // since the list of service types is a business convention, not application logic.
            $table->string('type');
            $table->date('date');
            $table->time('start_time')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('date');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
