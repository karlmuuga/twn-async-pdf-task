<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DestroyPdfGenerationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the validation request by merging the pdf_generation_id from the route.
     * This is necessary because the pdf_generation_id is not part of the request body.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'pdf_generation_id' => $this->route('id') ?? $this->route('pdf_generation'),
        ]);
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'uuid'],
            'pdf_generation_id' => [
                'required',
                'integer',
                Rule::exists('pdf_generations', 'id')
                    ->where(fn ($query) => $query->where('user_id', $this->input('user_id'))),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'The user_id field is required.',
            'user_id.uuid' => 'The user_id must be a valid UUID.',
            'pdf_generation_id.required' => 'The pdf_generation_id route parameter is required.',
            'pdf_generation_id.integer' => 'The pdf_generation_id must be an integer.',
            'pdf_generation_id.exists' => 'The selected pdf_generation_id is invalid.',
        ];
    }
}
