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
        Schema::create('follow_ups', function (Blueprint $table) {
            $table->id();
            // Polymorphic target — a Convert (nouvelle âme) or a Member (fidèle)
            // needing pastoral care. Morph aliases registered in
            // AppServiceProvider (not the FQCN) for stability across refactors.
            $table->string('followable_type');
            $table->unsignedBigInteger('followable_id');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            // nouveau | contacte | visite_programmee | integre | abandonne
            $table->string('status')->default('nouveau');
            $table->date('next_action_date')->nullable();
            $table->timestamps();

            $table->index(['followable_type', 'followable_id']);
            $table->index('status');
            $table->index('assigned_to');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('follow_ups');
    }
};
