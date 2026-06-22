<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EventRequest extends FormRequest
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
            'title' => [$required, 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('events', 'slug')->ignore($this->route('event')),
            ],
            'type' => ['nullable', 'string', 'max:100'],
            'description' => [$required, 'string'],
            'location' => [$required, 'string', 'max:255'],
            'host' => ['nullable', 'string', 'max:255'],
            'start_date' => [$required, 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'remove_image' => ['nullable', 'boolean'],
            'highlights' => ['nullable', 'array'],
            'highlights.*' => ['string', 'max:255'],
            'is_featured' => ['boolean'],
        ];
    }
}
