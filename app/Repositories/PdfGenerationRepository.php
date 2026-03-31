<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\PdfStatus;
use App\Models\PdfGeneration;
use Illuminate\Support\Collection;

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

    public function updateStatusById(int $id, PdfStatus $status): bool
    {
        $updatedRows = PdfGeneration::query()
            ->where('id', $id)
            ->update(['status' => $status->value]);

        return $updatedRows === 1;
    }

    public function claimForProcessing(int $id): bool
    {
        $updatedRows = PdfGeneration::query()
            ->where('id', $id)
            ->where('status', PdfStatus::WAITING->value)
            ->update(['status' => PdfStatus::PROCESSING->value]);

        return $updatedRows === 1;
    }

    public function cancelIfWaiting(int $id): bool
    {
        $updatedRows = PdfGeneration::query()
            ->where('id', $id)
            ->where('status', PdfStatus::WAITING->value)
            ->update(['status' => PdfStatus::CANCELLED->value]);

        return $updatedRows === 1;
    }

    public function markAsCompleted(PdfGeneration $pdf, string $fileName, int $processingTime): bool
    {
        return $pdf->update([
            'status' => PdfStatus::COMPLETED,
            'file_name' => $fileName,
            'processing_time' => $processingTime,
        ]);
    }

    /**
     * Get all PDF generation records for a single user, sorted by id in descending order.
     *
     * @return Collection<int, PdfGeneration>
     */
    public function getByUserId(string $userId): Collection
    {
        return PdfGeneration::query()
            ->where('user_id', $userId)
            ->latest('id')
            ->get();
    }

    /**
     * Get raw aggregate PdfGeneration counts for one user, grouped by status.
     *
     * @return Collection<string, int>
     */
    public function getStatsByUserId(string $userId): Collection
    {
        return PdfGeneration::query()
            ->where('user_id', $userId)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');
    }
}
