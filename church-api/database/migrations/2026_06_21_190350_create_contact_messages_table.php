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
        Schema::create('contact_messages', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->string('name');
            $blueprint->string('email');
            $blueprint->string('phone')->nullable();
            $blueprint->string('subject');
            $blueprint->text('message');
            $blueprint->enum('status', ['pending', 'read', 'archived'])->default('pending');
            $blueprint->timestamp('replied_at')->nullable();
            $blueprint->foreignId('replied_by')->nullable()->constrained('users')->nullOnDelete();
            $blueprint->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
    }
};
