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
        Schema::table('ministries', function (Blueprint $table) {
            // Designated leader of the ministry. Cleared (not cascaded) if the
            // user account is removed so the ministry simply becomes leaderless.
            $table->foreignId('chef_id')
                ->nullable()
                ->after('name')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ministries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('chef_id');
        });
    }
};
