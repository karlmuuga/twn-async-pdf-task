<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PdfStatus;
use App\Jobs\GeneratePdfJob;
use App\Models\PdfGeneration;
use App\Repositories\PdfGenerationRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Service: PdfGenerationService
 * Orchestrates the PDF generation process.
 * Handles the lifecycle of a PDF generation request.
 */
class PdfGenerationService
{
    public function __construct(
        protected PdfGenerationRepository $repository
    ) {}


    public function create(string $userId): PdfGeneration
    {
        $pdf = $this->repository->create([
            'user_id' => $userId,
            'status' => PdfStatus::WAITING,
        ]);

        GeneratePdfJob::dispatch($pdf->id);

        return $pdf;
    }

    /**
     * Create and queue multiple PDF generations for one user.
     *
     * @return Collection<int, PdfGeneration>
     */
    public function createMany(string $userId, int $pdfCount): Collection
    {
        $pdfs = collect();

        for ($i = 0; $i < $pdfCount; $i++) {
            $pdfs->push($this->create($userId));
        }

        return $pdfs;
    }

    public function process(int $pdfId): void
    {
        $claimed = false;
        $pdf = null;

        try {
            // Atomically claim this record for processing to avoid duplicate generation
            $claimed = $this->repository->claimForProcessing($pdfId);

            if (!$claimed) {
                $current = $this->repository->findById($pdfId);

                Log::info("PDF generation skipped", [
                    'id' => $pdfId,
                    'current_status' => $current?->status?->value,
                ]);
                return;
            }

            $pdf = $this->repository->findById($pdfId);

            // Handles the case where the PDF generation record is deleted after claiming
            if (!$pdf) {
                throw new RuntimeException("PDF generation record missing after claim: {$pdfId}");
            }

            Log::info("PDF generation claimed", [
                'id' => $pdf->id,
                'user_id' => $pdf->user_id,
            ]);

            // 1. Simulate heavy workload (Requirement: 3-15s)
            // This can later be replaced with a real PDF generation process
            $processingTime = $this->getProcessingTime();
            $this->simulateProcessing($processingTime);

            // 2. Finalize record
            $fileName = "doc_{$pdf->id}_" . now()->timestamp . '_' . Str::lower(Str::random(6)) . ".pdf";
            $completed = $this->repository->markAsCompleted($pdf, $fileName, $processingTime);
            if (!$completed) {
                throw new RuntimeException("Failed to mark PDF generation as completed: {$pdfId}");
            }

            Log::info("PDF generation completed", [
                'id' => $pdf->id,
                'file' => $fileName,
                'duration' => $processingTime . 's',
            ]);

        } catch (Throwable $e) {
            Log::error("PDF generation failed", [
                'id' => $pdfId,
                'error' => $e->getMessage(),
            ]);

            if ($claimed) {
                if ($pdf) {
                    $this->repository->updateStatus($pdf, PdfStatus::FAILED);
                } else {
                    $this->repository->updateStatusById($pdfId, PdfStatus::FAILED);
                }
            }

            throw $e; // Re-throw so the job knows it failed
        }
    }

    /**
     * Attempts to cancel a queued PDF generation before processing starts.
     * Returns true only when the status transition WAITING -> CANCELLED succeeds.
     */
    public function cancel(int $pdfId): bool
    {
        $cancelled = $this->repository->cancelIfWaiting($pdfId);

        if ($cancelled) {
            Log::info("PDF generation cancelled", [
                'id' => $pdfId,
            ]);

            return true;
        }

        $current = $this->repository->findById($pdfId);

        Log::info("PDF generation cancel skipped", [
            'id' => $pdfId,
            'current_status' => $current?->status?->value,
        ]);

        return false;
    }

    /**
     * Get all PDF generation records for a single user.
     *
     * @return Collection<int, PdfGeneration>
     */
    public function getByUserId(string $userId): Collection
    {
        return $this->repository->getByUserId($userId);
    }

    /**
     * Get normalized status stats for a user.
     *
     * @return array<string, int>
     */
    public function getStatsByUserId(string $userId): array
    {
        $countsByStatus = $this->repository->getStatsByUserId($userId);
        $stats = [
            'total' => (int) $countsByStatus->sum(),
        ];

        // Loop through all statuses and add the count to the stats array
        // This way we don't need to manually update the stats array when a new status is added
        foreach (PdfStatus::cases() as $status) {
            $stats[$status->value] = (int) ($countsByStatus[$status->value] ?? 0);
        }

        return $stats;
    }

    /**
     * Helper method to get the randomized processing time.
     * @return int The processing time in seconds.
     */
    protected function getProcessingTime(): int
    {
        return random_int(3, 15);
    }

    /**
     * Helper method to simulate the processing time.
     * @param int $processingTime The processing time in seconds.
     */
    protected function simulateProcessing(int $processingTime): void
    {
        sleep($processingTime);
    }
}
