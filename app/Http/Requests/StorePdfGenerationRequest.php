<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePdfGenerationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'uuid'],
            'pdf_count' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'The user_id field is required.',
            'user_id.uuid' => 'The user_id must be a valid UUID.',
            'pdf_count.required' => 'The pdf_count field is required.',
            'pdf_count.integer' => 'The pdf_count must be an integer.',
            'pdf_count.min' => 'The pdf_count must be at least 1.',
            'pdf_count.max' => 'The pdf_count must not be greater than 100.',
        ];
    }
}
