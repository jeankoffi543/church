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
        Schema::create('follow_up_notes', function (Blueprint $table) {
            $table->id();
            // Deleting the parent follow-up takes its timeline with it — unlike
            // the financial (restrictOnDelete) tables, this isn't accounting data.
            $table->foreignId('follow_up_id')->constrained()->cascadeOnDelete();
            // appel | visite | sms | whatsapp | autre
            $table->string('action_type')->default('appel');
            $table->text('note');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('follow_up_notes');
    }
};
