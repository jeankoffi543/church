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
        Schema::table('sermons', function (Blueprint $table) {
            // The preacher, linked to a user. `speaker` is kept (mirrors the
            // user's name) so the public rendering never regresses.
            $table->foreignId('user_id')->nullable()->after('speaker')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sermons', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
