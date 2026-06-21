<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class HomeGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:255'],
            'leader' => [$required, 'string', 'max:255'],
            'address' => [$required, 'string', 'max:255'],
            'schedule' => ['nullable', 'string', 'max:255'],
            'coordinates' => ['nullable', 'array'],
            // Accept either map percentages (top/left) or lat/lng pairs.
            'coordinates.top' => ['nullable', 'string', 'max:20'],
            'coordinates.left' => ['nullable', 'string', 'max:20'],
            'coordinates.lat' => ['nullable', 'numeric'],
            'coordinates.lng' => ['nullable', 'numeric'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}
