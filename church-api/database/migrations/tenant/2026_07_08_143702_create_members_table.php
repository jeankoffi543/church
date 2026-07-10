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
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('gender')->nullable(); // homme | femme
            $table->date('birthdate')->nullable();
            $table->string('address')->nullable();
            // Free string (celibataire, marie, veuf, divorce…) — same convention
            // as Donation::purpose_key / PrayerRequest::category: a business
            // vocabulary, not application logic, so no DB enum.
            $table->string('marital_status')->nullable();
            $table->date('join_date')->nullable();
            // visiteur | membre | leader — same "flexible string" convention.
            $table->string('member_type')->default('membre');
            $table->foreignId('home_group_id')->nullable()->constrained('home_groups')->nullOnDelete();
            // actif | inactif | transfere | decede
            $table->string('status')->default('actif');
            $table->string('photo')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('member_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
