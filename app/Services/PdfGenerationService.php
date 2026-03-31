<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PdfStatus;
use App\Repositories\PdfGenerationRepository;
use Illuminate\Support\Facades\Log;
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
        $pdf = $this->repository->findById($pdfId);

        // Check if the PDF generation record exists
        if (!$pdf) {
            Log::warning("PDF Generation attempt on non-existent record", ['id' => $pdfId]);
            return;
        }

        // Check if the PDF generation record is already completed or currently processing
        // If it's already COMPLETED or currently PROCESSING, exit immediately
        if (in_array($pdf->status, [PdfStatus::COMPLETED, PdfStatus::PROCESSING], true)) {
            Log::info("Skipping PDF generation: record is already completed or in progress", [
                'id' => $pdfId,
                'current_status' => $pdf->status->value,
            ]);
            return;
        }

        try {
            Log::info("Starting PDF generation lifecycle", [
                'id' => $pdf->id,
                'user_id' => $pdf->user_id,
            ]);

            // 1. Mark as processing
            $this->repository->updateStatus($pdf, PdfStatus::PROCESSING);

            // 2. Simulate heavy workload (Requirement: 3-15s)
            // This can later be replaced with a real PDF generation process
            $processingTime = rand(3, 15);

            Log::debug("Simulating heavy PDF workload", [
                'id' => $pdf->id,
                'seconds' => $processingTime,
            ]);

            sleep($processingTime);

            // 3. Finalize record
            $fileName = "doc_{$pdf->id}_" . now()->timestamp . ".pdf";
            $this->repository->markAsCompleted($pdf, $fileName, $processingTime);

            Log::info("PDF generation lifecycle completed successfully", [
                'id' => $pdf->id,
                'file' => $fileName,
                'duration' => $processingTime . 's',
            ]);

        } catch (Throwable $e) {
            Log::error("PDF Generation lifecycle failed", [
                'id' => $pdf->id,
                'error' => $e->getMessage(),
            ]);

            $this->repository->updateStatus($pdf, PdfStatus::FAILED);
            throw $e; // Re-throw so the job knows it failed
        }
    }
}
