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
        Schema::create('converts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            // nouvelle_conversion | reengagement — free string, same convention
            // as the rest of the codebase (a business vocabulary, not app logic).
            $table->string('decision_type')->default('nouvelle_conversion');
            $table->date('decision_date');
            // Where the decision happened — at most one of these two is set.
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->foreignId('evangelism_campaign_id')->nullable()->constrained('evangelism_campaigns')->nullOnDelete();
            $table->foreignId('assigned_counselor_id')->nullable()->constrained('users')->nullOnDelete();
            // nouveau | en_cours_de_suivi | integre | perdu_de_vue
            $table->string('status')->default('nouveau');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('decision_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('converts');
    }
};
