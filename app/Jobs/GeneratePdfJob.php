<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\PdfGenerationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

/**
 * Job: GeneratePdfJob
 *
 * Responsible for orchestrating the background processing of a PDF.
 * Specifically targets the 'pdf-tasks' queue for high-volume scaling.
 */
class GeneratePdfJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     * Only pass the ID to keep the job payload light in Redis.
     */
    public function __construct(
        public readonly int $pdfGenerationId
    ) {
        // Direct this job to the scalable queue defined in Horizon config
        $this->onQueue('pdf-tasks');
    }

    /**
     * Execute the job.
     * Laravel automatically injects the service via dependency injection.
     */
    public function handle(PdfGenerationService $service): void
    {
        $service->process($this->pdfGenerationId);
    }

    /**
     * Handle a job failure.
     * If the worker times out or crashes, the system logs it.
     */
    public function failed(Throwable $exception): void
    {
        // The Service already handles status updates,
        // if needed, add emergency logging here
    }
}
