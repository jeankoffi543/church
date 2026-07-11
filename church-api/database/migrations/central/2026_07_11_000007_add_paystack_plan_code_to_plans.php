<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-141 — maps our plan to its Paystack plan_code so a subscription can be
 * created against the right recurring plan on Paystack.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->string('paystack_plan_code')->nullable()->after('currency');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('paystack_plan_code');
        });
    }
};
