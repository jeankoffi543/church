<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConvertRequest extends FormRequest
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
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'decision_type' => ['nullable', Rule::in(['nouvelle_conversion', 'reengagement'])],
            'decision_date' => [$required, 'date'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'evangelism_campaign_id' => ['nullable', 'integer', 'exists:evangelism_campaigns,id'],
            'assigned_counselor_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', Rule::in(['nouveau', 'en_cours_de_suivi', 'integre', 'perdu_de_vue'])],
            'notes' => ['nullable', 'string'],
        ];
    }
}
