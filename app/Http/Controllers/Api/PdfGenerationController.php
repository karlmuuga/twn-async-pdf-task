<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DestroyPdfGenerationRequest;
use App\Http\Requests\PdfGenerationUserRequest;
use App\Http\Requests\StorePdfGenerationRequest;
use App\Services\PdfGenerationService;
use Illuminate\Http\JsonResponse;

class PdfGenerationController extends Controller
{
    public function __construct(
        protected PdfGenerationService $service
    ) {}

    public function index(PdfGenerationUserRequest $request): JsonResponse
    {
        $pdfs = $this->service->getByUserId($request->validated('user_id'));

        return response()->json($pdfs);
    }

    public function store(StorePdfGenerationRequest $request): JsonResponse
    {
        $pdfs = $this->service->createMany(
            $request->validated('user_id'),
            (int) $request->validated('pdf_count')
        );

        return response()->json($pdfs, 201);
    }

    public function destroy(DestroyPdfGenerationRequest $request, int $id): JsonResponse
    {
        $cancelled = $this->service->cancel($id);

        return response()->json([
            'cancelled' => $cancelled,
        ]);
    }

    public function aggregate(PdfGenerationUserRequest $request): JsonResponse
    {
        $stats = $this->service->getStatsByUserId($request->validated('user_id'));

        return response()->json($stats);
    }
}
