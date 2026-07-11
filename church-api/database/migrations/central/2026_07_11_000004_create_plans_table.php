<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-140 — the pricing/feature catalogue (central DB). A plan bundles the set
 * of enabled features and the usage limits a tenant inherits.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // free · starter · growth · pro
            $table->string('name');
            $table->unsignedInteger('price_month')->default(0); // minor units of `currency`
            $table->unsignedInteger('price_year')->default(0);
            $table->string('currency', 3)->default('USD');
            $table->json('features')->nullable();  // list<string> of Feature values
            $table->json('limits')->nullable();    // { members, storage_gb, staff_seats }
            $table->boolean('studio_included')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
