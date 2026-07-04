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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('base_price')->default(0);
            $table->unsignedInteger('old_price')->nullable();
            $table->string('category');
            $table->string('badge')->nullable();
            $table->boolean('is_digital')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->string('status')->default('active'); // active, draft
            $table->json('images')->nullable();
            $table->json('attributes')->nullable();
            $table->json('variants')->nullable();
            $table->timestamps();

            $table->index('category');
            $table->index('status');
            $table->index('is_featured');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
