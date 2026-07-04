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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('customer_first_name');
            $table->string('customer_last_name');
            $table->string('customer_phone');
            $table->string('customer_email');
            $table->unsignedInteger('subtotal')->default(0);
            $table->unsignedInteger('delivery_fee')->default(0);
            $table->unsignedInteger('total_amount')->default(0);
            $table->string('delivery_key');
            $table->string('delivery_label')->nullable();
            $table->string('payment_method');
            $table->string('payment_status')->default('pending'); // pending, paid, failed
            $table->string('fulfillment_status')->default('nouvelle'); // nouvelle, preparation, expediee, livree, annulee
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('payment_status');
            $table->index('fulfillment_status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
