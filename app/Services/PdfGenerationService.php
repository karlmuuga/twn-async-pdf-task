<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PdfStatus;
use App\Repositories\PdfGenerationRepository;
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

    public function process(int $pdfId): void
    {
        $claimed = false;
        $pdf = null;

        try {
            // Atomically claim this record for processing to avoid duplicate generation.
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
            $processingTime = random_int(3, 15);

            sleep($processingTime);

            // 2. Finalize record
            $fileName = "doc_{$pdf->id}_" . now()->timestamp . '_' . Str::lower(Str::random(6)) . ".pdf";
            $this->repository->markAsCompleted($pdf, $fileName, $processingTime);

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
}
