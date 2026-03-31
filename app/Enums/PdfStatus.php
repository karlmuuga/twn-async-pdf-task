<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Enum: PdfStatus
 * Type-safe states for PDF generation jobs.
 */
enum PdfStatus: string
{
    case WAITING = 'waiting';
    case PROCESSING = 'processing';
    case COMPLETED = 'completed';
    case FAILED = 'failed';

    /**
     * Helper to get a human-readable Estonian label if needed for the UI.
     */
    public function label(): string
    {
        return match($this) {
            self::WAITING => 'Ootel',
            self::PROCESSING => 'Töötlemisel',
            self::COMPLETED => 'Valmis',
            self::FAILED => 'Ebaõnnestus',
        };
    }
}
