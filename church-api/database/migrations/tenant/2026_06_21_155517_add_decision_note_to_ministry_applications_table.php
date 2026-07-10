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
        Schema::table('ministry_applications', function (Blueprint $table) {
            // Optional reason/note recorded by the validator when approving or
            // rejecting the application.
            $table->text('decision_note')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ministry_applications', function (Blueprint $table) {
            $table->dropColumn('decision_note');
        });
    }
};
