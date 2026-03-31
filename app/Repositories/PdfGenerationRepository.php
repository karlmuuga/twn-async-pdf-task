<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\PdfStatus;
use App\Models\PdfGeneration;

/**
 * Repository: PdfGenerationRepository
 * Responsible for all database interactions regarding PDF generation lifecycle tracking.
 */
class PdfGenerationRepository
{
    public function findById(int $id): ?PdfGeneration
    {
        return PdfGeneration::find($id);
    }

    public function create(array $data): PdfGeneration
    {
        return PdfGeneration::create($data);
    }

    public function updateStatus(PdfGeneration $pdf, PdfStatus $status): bool
    {
        return $pdf->update(['status' => $status]);
    }

    public function markAsCompleted(PdfGeneration $pdf, string $fileName, int $processingTime): bool
    {
        return $pdf->update([
            'status' => PdfStatus::COMPLETED,
            'file_name' => $fileName,
            'processing_time' => $processingTime,
        ]);
    }
}
