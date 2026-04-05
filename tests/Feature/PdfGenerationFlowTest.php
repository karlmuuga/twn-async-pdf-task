<?php

declare(strict_types=1);

use App\Enums\PdfStatus;
use App\Events\PdfGenerationStatusChanged;
use App\Models\PdfGeneration;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Sleep;
use Illuminate\Support\Str;

beforeEach(function () {
    Sleep::fake();
});

describe('POST /api/pdf-generations (happy path)', function () {
    it('completes sync flow, persists DB state, and dispatches PdfGenerationStatusChanged', function () {
        Event::fake([PdfGenerationStatusChanged::class]);

        $userId = (string) Str::uuid();

        // Send the request to create a PDF generation
        $response = $this->postJson('/api/pdf-generations', [
            'user_id' => $userId,
            'pdf_count' => 1,
        ]);

        $response->assertCreated();

        // Assert the database has the expected state
        $this->assertDatabaseHas('pdf_generations', [
            'user_id' => $userId,
            'status' => PdfStatus::COMPLETED->value,
        ]);

        // Assert the PDF generation was created for the correct user
        $pdf = PdfGeneration::where('user_id', $userId)->first();
        expect($pdf)->not->toBeNull()
            ->and($pdf->file_name)->not->toBeNull()
            ->and($pdf->processing_time)->toBeGreaterThanOrEqual(3)
            ->and($pdf->processing_time)->toBeLessThanOrEqual(15);

        Event::assertDispatched(
            PdfGenerationStatusChanged::class,
            fn (PdfGenerationStatusChanged $e) => $e->from === PdfStatus::WAITING
                && $e->to === PdfStatus::PROCESSING
        );
        Event::assertDispatched(
            PdfGenerationStatusChanged::class,
            fn (PdfGenerationStatusChanged $e) => $e->from === PdfStatus::PROCESSING
                && $e->to === PdfStatus::COMPLETED
        );
    });
});

describe('GET /api/pdf-generations/aggregate (user specific separation)', function () {
    it('returns user-specific status statistics without jobs from other users', function () {
        $userId = (string) Str::uuid();

        // Two completed + one processing + two waiting for the main user
        PdfGeneration::factory()
            ->count(5)
            ->sequence(
                ['status' => PdfStatus::COMPLETED->value],
                ['status' => PdfStatus::COMPLETED->value],
                ['status' => PdfStatus::PROCESSING->value],
                ['status' => PdfStatus::WAITING->value],
                ['status' => PdfStatus::WAITING->value],
            )
            ->create(['user_id' => $userId]);

        // Noise: waiting job for another user
        PdfGeneration::factory()->create([
            'status' => PdfStatus::WAITING->value,
        ]);

        $response = $this->json('GET', '/api/pdf-generations/aggregate', [
            'user_id' => $userId,
        ]);

        $response->assertOk();

        // Assert the response contains the expected data and counts
        $response->assertJsonPath('completed', 2)
            ->assertJsonPath('processing', 1)
            ->assertJsonPath('waiting', 2)
            ->assertJsonPath('total', 5);
    });
});

describe('POST /api/pdf-generations (simple validation)', function () {
    it('fails if user requests more than 100 pdfs', function () {
        $response = $this->postJson('/api/pdf-generations', [
            'user_id' => (string) Str::uuid(),
            'pdf_count' => 101,
        ]);

        $response->assertUnprocessable()
                 ->assertJsonValidationErrors(['pdf_count']);
    });

    it('fails if user requests less than 1 pdf', function () {
        $response = $this->postJson('/api/pdf-generations', [
            'user_id' => (string) Str::uuid(),
            'pdf_count' => 0,
        ]);

        $response->assertUnprocessable()
                 ->assertJsonValidationErrors(['pdf_count']);
    });
});

describe('DELETE /api/pdf-generations/{id} (cancellation functionality)', function () {
    it('allows a user to cancel a waiting job', function () {
        $pdf = PdfGeneration::factory()->create([
            'status' => PdfStatus::WAITING->value,
        ]);

        $response = $this->deleteJson("/api/pdf-generations/{$pdf->id}", [
            'user_id' => $pdf->user_id,
        ]);

        $response->assertOk()
            ->assertJson(['cancelled' => true]);

        $this->assertDatabaseHas('pdf_generations', [
            'id' => $pdf->id,
            'status' => PdfStatus::CANCELLED->value,
        ]);
    });

    it('does not cancel a job that is already processing', function () {
        $pdf = PdfGeneration::factory()->create([
            'status' => PdfStatus::PROCESSING->value,
        ]);

        $response = $this->deleteJson("/api/pdf-generations/{$pdf->id}", [
            'user_id' => $pdf->user_id,
        ]);

        $response->assertOk()
            ->assertJson(['cancelled' => false]);

        $this->assertDatabaseHas('pdf_generations', [
            'id' => $pdf->id,
            'status' => PdfStatus::PROCESSING->value,
        ]);
    });

    it('prevents a user from cancelling a job of another user', function () {
        $pdf = PdfGeneration::factory()->create([
            'status' => PdfStatus::WAITING->value,
        ]);

        // Send the request to cancel the job with a random user_id
        $response = $this->deleteJson("/api/pdf-generations/{$pdf->id}", [
            'user_id' => (string) Str::uuid(),
        ]);

        /*
         * Since validation is handled by FormRequest, a mismatch between user_id
         * and pdf_generation_id will result in a 422 Unprocessable Entity.
         */
        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['pdf_generation_id']);
    });
});
