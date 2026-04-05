<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PdfStatus;
use App\Events\PdfGenerationStatusChanged;
use App\Models\PdfGeneration;
use App\Repositories\PdfGenerationLifecycleRepository;
use App\Repositories\PdfGenerationRepository;
use Illuminate\Support\Sleep;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class PdfProcessingService
{
    private const ALLOWED_TRANSITIONS = [
        PdfStatus::WAITING->value => [PdfStatus::PROCESSING->value, PdfStatus::CANCELLED->value],
        PdfStatus::PROCESSING->value => [PdfStatus::COMPLETED->value, PdfStatus::FAILED->value],
    ];

    public function __construct(
        protected PdfGenerationRepository $repository,
        protected PdfGenerationLifecycleRepository $lifecycle,
    ) {}

    /**
     * The main method that orchestrates the whole PDF generation process.
     * It starts the processing, simulates the processing time, generates the file name,
     * marks the PDF generation as completed and fails if the completion fails.
     */
    public function process(int $pdfId): void
    {
        $pdf = $this->startProcessing($pdfId);

        if (!$pdf) {
            return;
        }

        try {
            $processingTime = $this->getProcessingTime();
            $this->simulateProcessing($processingTime);

            $fileName = "doc_{$pdf->id}_" . now()->timestamp . '_' . Str::lower(Str::random(6)) . '.pdf';
            $completed = $this->complete($pdfId, $processingTime, $fileName);

            if (!$completed) {
                throw new RuntimeException("Failed to mark PDF generation as completed: $pdfId");
            }
        } catch (Throwable $e) {
            try {
                $this->fail($pdfId);
            } catch (Throwable $inner) {
                // Preserve the original exception while still reporting transition failures
                report($inner);
            }

            throw $e;
        }
    }

    public function startProcessing(int $id): ?PdfGeneration
    {
        return $this->transitionAndEmit(
            $id,
            PdfStatus::WAITING,
            PdfStatus::PROCESSING
        );
    }

    public function complete(int $id, int $processingTime, string $fileName): ?PdfGeneration
    {
        return $this->transitionAndEmit(
            $id,
            PdfStatus::PROCESSING,
            PdfStatus::COMPLETED,
            [
                'file_name' => $fileName,
                'processing_time' => $processingTime,
            ]
        );
    }

    public function fail(int $id): ?PdfGeneration
    {
        return $this->transitionAndEmit(
            $id,
            PdfStatus::PROCESSING,
            PdfStatus::FAILED
        );
    }

    /**
     * Attempts to cancel a queued PDF generation before processing starts.
     * Returns true only when the transition WAITING -> CANCELLED succeeds.
     */
    public function cancel(int $pdfId): bool
    {
        $cancelled = $this->transitionAndEmit(
            $pdfId,
            PdfStatus::WAITING,
            PdfStatus::CANCELLED
        );

        return $cancelled !== null;
    }

    /**
     * Centralized method for all status transitions.
     * It ensures that the transition is allowed and then calls the lifecycle repository to perform the transition.
     * Finally, it loads the PDF generation and dispatches the event.
     */
    private function transitionAndEmit(
        int $id,
        PdfStatus $from,
        PdfStatus $to,
        array $extra = []
    ): ?PdfGeneration {
        $this->ensureTransitionAllowed($from, $to);

        $updated = $this->lifecycle->transition($id, $from, $to, $extra);

        if (!$updated) {
            return null;
        }

        return $this->loadAndDispatchEvent($id, $from, $to, $extra);
    }

    private function ensureTransitionAllowed(PdfStatus $from, PdfStatus $to): void
    {
        $allowedDestinations = self::ALLOWED_TRANSITIONS[$from->value] ?? [];

        if (!in_array($to->value, $allowedDestinations, true)) {
            throw new RuntimeException("Invalid PDF status transition: {$from->value} -> {$to->value}");
        }
    }

    private function loadAndDispatchEvent(
        int $id,
        PdfStatus $from,
        PdfStatus $to,
        array $extra = []
    ): PdfGeneration
    {
        $model = $this->repository->findById($id);

        if (!$model) {
            throw new RuntimeException("PDF generation record missing after transition: {$id}");
        }

        event(new PdfGenerationStatusChanged($model, $from, $to, $extra));

        return $model;
    }

    protected function getProcessingTime(): int
    {
        return random_int(3, 15);
    }

    protected function simulateProcessing(int $processingTime): void
    {
        Sleep::for($processingTime)->seconds(); // Use Sleep facade for easier mocking in tests
    }
}
