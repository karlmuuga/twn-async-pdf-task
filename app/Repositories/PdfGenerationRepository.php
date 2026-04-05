<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\PdfGeneration;
use Illuminate\Support\Collection;

/**
 * Persistence and queries for PdfGeneration (reads, create, aggregates).
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
