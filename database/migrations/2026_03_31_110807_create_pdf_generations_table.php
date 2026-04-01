<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pdf_generations', function (Blueprint $table): void {
            $table->id();
            $table->string('user_id')->index(); 
            // Using string to store the backed enum value
            $table->string('status')->default('waiting');
            $table->string('file_name')->nullable();
            $table->integer('processing_time')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdf_generations');
    }
};
