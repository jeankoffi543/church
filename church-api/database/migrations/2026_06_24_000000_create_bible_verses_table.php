<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bible_verses', function (Blueprint $table) {
            $table->id();
            $table->string('book', 60)->index();
            $table->unsignedSmallInteger('chapter');
            $table->unsignedSmallInteger('verse');
            $table->text('text');
            $table->string('translation', 16)->default('LSG');
            $table->timestamps();

            // Exact lookups (a reference resolves in a single index hit) and
            // fast "first verse of the next chapter" scans.
            $table->unique(['translation', 'book', 'chapter', 'verse']);
            $table->index(['translation', 'book', 'chapter']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bible_verses');
    }
};
