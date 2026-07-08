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
        Schema::create('service_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            // The team a member is serving under for this occurrence — optional,
            // since a one-off assignment doesn't always belong to a standing team.
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('role');
            // prevu | confirme | absent
            $table->string('status')->default('prevu');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['service_id', 'member_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_assignments');
    }
};
