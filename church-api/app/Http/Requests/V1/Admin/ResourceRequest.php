<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResourceRequest extends FormRequest
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
            'type' => [$required, Rule::in(['salle', 'vehicule', 'materiel', 'autre'])],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'condition' => ['nullable', Rule::in(['bon', 'moyen', 'hors_service'])],
            'is_active' => ['boolean'],
        ];
    }
}
