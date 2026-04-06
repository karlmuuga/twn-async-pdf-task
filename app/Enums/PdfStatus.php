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
    case CANCELLED = 'cancelled';
}
