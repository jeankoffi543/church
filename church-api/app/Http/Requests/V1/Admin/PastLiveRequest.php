<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PastLiveRequest extends FormRequest
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
            'description' => ['nullable', 'string'],
            'youtube_id' => ['nullable', 'string', 'max:64'],
            'video' => ['nullable', 'file', 'mimes:mp4,webm,mov', 'max:512000'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'series_name' => ['nullable', 'string', 'max:255'],
            'preacher_id' => ['nullable', 'integer', 'exists:users,id'],
            'duration' => ['nullable', 'string', 'max:50'],
            'broadcasted_at' => [$required, 'date'],
        ];
    }
}
