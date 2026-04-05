<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\PdfStatus;
use App\Models\PdfGeneration;

/**
 * Atomic status transitions for PdfGeneration (single UPDATE with expected prior status).
 */
class PdfGenerationLifecycleRepository
{
    /**
     * Atomically move one row from $from to $to. Optional columns (e.g. file metadata)
     * are applied in the same UPDATE as the status change.
     */
    public function transition(
        int $id,
        PdfStatus $from,
        PdfStatus $to,
        array $extra = []
    ): bool {
        $payload = array_merge($extra, ['status' => $to->value]);

        $updatedRows = PdfGeneration::query()
            ->where('id', $id)
            ->where('status', $from->value)
            ->update($payload);

        return $updatedRows > 0;
    }
}
