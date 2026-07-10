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
            // Whether the decision note (motif) is shared with the candidate in
            // the public status lookup. Defaults to private.
            $table->boolean('decision_note_public')->default(false)->after('decision_note');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ministry_applications', function (Blueprint $table) {
            $table->dropColumn('decision_note_public');
        });
    }
};
