<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SettingsUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation by decoding the settings JSON string if sent via form-data.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('settings'))) {
            $decoded = json_decode($this->input('settings'), true);
            if (is_array($decoded)) {
                $this->merge([
                    'settings' => $decoded,
                ]);
            }
        }
    }

    /**
     * Bulk upsert of settings. Each item carries a unique `key`, a free-form
     * JSON `value` (scalar or structure) and an optional `group`.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string', 'max:255'],
            'settings.*.value' => ['present'],
            'settings.*.group' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            foreach ($this->input('settings', []) as $index => $setting) {
                if ($setting['key'] === 'live_embed_url' && !empty($setting['value'])) {
                    $value = $setting['value'];
                    $isIframeUrl = preg_match('/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\//', $value);
                    $isHlsUrl = str_ends_with($value, '.m3u8');
                    $isLocalhost = str_contains($value, '127.0.0.1') || str_contains($value, 'localhost');
                    
                    if (!$isIframeUrl && !$isHlsUrl && !$isLocalhost) {
                        $validator->errors()->add(
                            "settings.{$index}.value",
                            "L'URL du flux doit être une URL d'intégration valide (YouTube/Vimeo) ou un flux de streaming HLS (.m3u8)."
                        );
                    }
                }
            }
        });
    }
}
