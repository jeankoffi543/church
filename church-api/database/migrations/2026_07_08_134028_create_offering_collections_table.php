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
        Schema::create('offering_collections', function (Blueprint $table) {
            $table->id();
            // Cash/in-person collection during a culte — no donor identity (a plate collection is
            // anonymous by nature), unlike the individually-attributed online Donation ledger.
            $table->foreignId('service_id')->constrained()->restrictOnDelete();
            // Free string, same vocabulary as Donation::purpose_key (dime, offrande, projet, missions…).
            $table->string('nature');
            $table->unsignedBigInteger('amount');
            $table->string('currency')->default('XOF');
            $table->foreignId('counted_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['service_id', 'nature']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offering_collections');
    }
};
