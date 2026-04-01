<?php

declare(strict_types=1);

use App\Http\Controllers\Api\PdfGenerationController;
use Illuminate\Support\Facades\Route;

Route::prefix('pdf-generations')->group(function (): void {
    Route::get('/', [PdfGenerationController::class, 'index']);
    Route::get('/aggregate', [PdfGenerationController::class, 'aggregate']);
    Route::post('/', [PdfGenerationController::class, 'store']);
    Route::delete('/{id}', [PdfGenerationController::class, 'destroy']);
});
