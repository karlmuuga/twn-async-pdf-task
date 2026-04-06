<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PdfStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model: PdfGeneration
 * Tracks the lifecycle of a PDF generation request. 
 * Supports logging status changes and processing metadata.
 * @property int $id
 * @property string $user_id           // UUID string representing the user's session
 * @property PdfStatus $status         // Enum-casted status: waiting, processing, completed, failed, cancelled
 * @property string|null $file_name    // Final name of the generated document
 * @property int|null $processing_time // Simulated time taken (3-15 seconds)
 */
class PdfGeneration extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'status',
        'file_name',
        'processing_time',
    ];

    /**
     * Cast attributes to native PHP types or enum values.
     * @var array<string, string>
     */
    protected $casts = [
        'status' => PdfStatus::class,
    ];
}
