<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ScriptureBroadcastRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'action' => ['required', 'in:show,hide'],

            // Verse payload (required when showing).
            'verse' => ['required_if:action,show', 'array'],
            'verse.reference' => ['required_if:action,show', 'string', 'max:120'],
            'verse.text' => ['nullable', 'string', 'max:2000'],
            'verse.texts' => ['nullable', 'array'],
            'verse.book' => ['nullable', 'string', 'max:60'],
            'verse.chapter' => ['nullable', 'integer', 'min:1'],
            'verse.verse' => ['nullable', 'integer', 'min:1'],

            // Graphic settings.
            'settings' => ['nullable', 'array'],
        ];
    }
}
