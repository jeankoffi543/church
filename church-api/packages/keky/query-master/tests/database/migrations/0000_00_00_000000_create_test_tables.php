<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('searchable_models', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->text('description')->nullable();
            $table->foreignId('profile_id')->nullable()->constrained('profile_models');
            $table->timestamps();
        });

        Schema::create('profile_models', function (Blueprint $table) {
            $table->id();
            $table->text('bio')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('searchable_models');
        Schema::dropIfExists('profile_models');
    }
};
