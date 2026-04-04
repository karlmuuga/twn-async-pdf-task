<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\PdfGeneration;
use App\Enums\PdfStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<PdfGeneration>
 */
class PdfGenerationFactory extends Factory
{
    protected $model = PdfGeneration::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Generate a random UUID to simulate a guest session
            'user_id' => $this->faker->uuid(),
            'status' => PdfStatus::WAITING,
            'file_name' => 'document_' . $this->faker->word() . '_' . Str::lower(Str::random(6)) . '.pdf',
            'processing_time' => null, // Initially null as it's not processed yet
        ];
    }
}
