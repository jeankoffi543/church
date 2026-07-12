<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CHR-162 — the central registry of physical database servers (shards) that
 * tenants can be placed on. The provisioner picks one at creation (CHR-163) and
 * tenants can later be moved between them (CHR-164). A tenant's actual per-DB
 * credentials still live encrypted on the tenant row (stancl VirtualColumn);
 * this table is the source they are seeded from and the capacity ledger.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('database_servers', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();           // "primary", "shard-eu-1"
            $table->string('connection')->default('mysql'); // stancl DB manager / driver
            $table->string('host');
            $table->unsignedInteger('port')->nullable();
            $table->string('username')->nullable();
            $table->text('password')->nullable();        // encrypted via the model cast
            $table->boolean('is_active')->default(true); // may it receive new tenants?
            $table->unsignedInteger('max_tenants')->nullable(); // capacity (null = unlimited)
            $table->unsignedInteger('weight')->default(1);      // weighted selection (CHR-163)
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('database_servers');
    }
};
