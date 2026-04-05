<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DestroyPdfGenerationRequest;
use App\Http\Requests\PdfGenerationUserRequest;
use App\Http\Requests\StorePdfGenerationRequest;
use App\Services\PdfProcessingService;
use App\Services\PdfQueryService;
use Illuminate\Http\JsonResponse;

class PdfGenerationController extends Controller
{
    public function __construct(
        protected PdfQueryService $query,
        protected PdfProcessingService $processing,
    ) {}

    public function index(PdfGenerationUserRequest $request): JsonResponse
    {
        $pdfs = $this->query->getByUserId($request->validated('user_id'));

        return response()->json($pdfs);
    }

    public function store(StorePdfGenerationRequest $request): JsonResponse
    {
        $pdfs = $this->query->createMany(
            $request->validated('user_id'),
            (int) $request->validated('pdf_count')
        );

        return response()->json($pdfs, 201);
    }

    public function destroy(DestroyPdfGenerationRequest $request, int $id): JsonResponse
    {
        $cancelled = $this->processing->cancel($id);

        return response()->json([
            'cancelled' => $cancelled,
        ]);
    }

    public function aggregate(PdfGenerationUserRequest $request): JsonResponse
    {
        $stats = $this->query->getStatsByUserId($request->validated('user_id'));

        return response()->json($stats);
    }
}
