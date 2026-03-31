<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\PdfGeneration;
use App\Enums\PdfStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

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
            'file_name' => 'document_' . $this->faker->unique()->word() . '.pdf',
            'processing_time' => null, // Initially null as it's not processed yet
        ];
    }

    /**
     * State for a completed job.
     * Improves test readability by explicitly setting the status.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PdfStatus::COMPLETED,
            'processing_time' => $this->faker->numberBetween(3, 15),
        ]);
    }
}
