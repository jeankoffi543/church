<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SermonRequest extends FormRequest
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
            'series' => ['nullable', 'string', 'max:255'],
            'title' => [$required, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'speaker' => [$required, 'string', 'max:255'],
            'book' => ['nullable', 'string', 'max:255'],
            'preached_at' => [$required, 'date'],
            'duration' => ['nullable', 'string', 'max:50'],
            'video_url' => ['nullable', 'url', 'max:2048'],
            'audio_url' => ['nullable', 'url', 'max:2048'],
            'is_published' => ['boolean'],
        ];
    }
}
