<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MemberRequest extends FormRequest
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
            'gender' => ['nullable', Rule::in(['homme', 'femme'])],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'address' => ['nullable', 'string', 'max:255'],
            'marital_status' => ['nullable', 'string', 'max:50'],
            'join_date' => ['nullable', 'date'],
            'member_type' => ['nullable', Rule::in(['visiteur', 'membre', 'leader'])],
            'home_group_id' => ['nullable', 'integer', 'exists:home_groups,id'],
            'status' => ['nullable', Rule::in(['actif', 'inactif', 'transfere', 'decede'])],
            'photo' => ['nullable', 'string', 'max:2048'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
