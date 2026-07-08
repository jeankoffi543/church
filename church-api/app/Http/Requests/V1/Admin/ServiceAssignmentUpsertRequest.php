<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ServiceAssignmentUpsertRequest extends FormRequest
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
        return [
            'lines' => ['present', 'array'],
            'lines.*.member_id' => ['required', 'integer', 'exists:members,id'],
            'lines.*.team_id' => ['nullable', 'integer', 'exists:teams,id'],
            'lines.*.role' => ['required', 'string', 'max:100'],
            'lines.*.status' => ['nullable', Rule::in(['prevu', 'confirme', 'absent'])],
            'lines.*.notes' => ['nullable', 'string'],
        ];
    }
}
