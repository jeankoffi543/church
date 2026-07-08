<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FollowUpRequest extends FormRequest
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
        $creating = $this->isMethod('post');

        return [
            'followable_type' => [$creating ? 'required' : 'prohibited', Rule::in(['convert', 'member'])],
            'followable_id' => [$creating ? 'required' : 'prohibited', 'integer'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', Rule::in(['nouveau', 'contacte', 'visite_programmee', 'integre', 'abandonne'])],
            'next_action_date' => ['nullable', 'date'],
        ];
    }
}
