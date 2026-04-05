<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PdfStatus;
use App\Jobs\GeneratePdfJob;
use App\Models\PdfGeneration;
use App\Repositories\PdfGenerationRepository;
use Illuminate\Support\Collection;

/**
 * Read model and HTTP-facing commands that enqueue work (create / createMany).
 */
class PdfQueryService
{
    public function __construct(
        protected PdfGenerationRepository $repository,
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

    /**
     * @return Collection<int, PdfGeneration>
     */
    public function getByUserId(string $userId): Collection
    {
        return $this->repository->getByUserId($userId);
    }

    /**
     * @return array<string, int>
     */
    public function getStatsByUserId(string $userId): array
    {
        $countsByStatus = $this->repository->getStatsByUserId($userId);
        $stats = [
            'total' => (int) $countsByStatus->sum(),
        ];

        foreach (PdfStatus::cases() as $status) {
            $stats[$status->value] = (int) ($countsByStatus[$status->value] ?? 0);
        }

        return $stats;
    }
}
