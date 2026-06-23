<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\SermonMediaType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class SermonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalise multipart payloads: decode the JSON scriptures array and coerce
     * the published flag into a real boolean.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('scriptures'))) {
            $decoded = json_decode($this->input('scriptures'), true);
            $this->merge(['scriptures' => is_array($decoded) ? $decoded : []]);
        }

        if (is_string($this->input('books_category'))) {
            $decoded = json_decode($this->input('books_category'), true);
            $this->merge(['books_category' => is_array($decoded) ? $decoded : []]);
        }

        if ($this->has('is_published')) {
            $this->merge(['is_published' => filter_var($this->input('is_published'), FILTER_VALIDATE_BOOLEAN)]);
        }

        // An empty media_type means "notes only" — normalise it to null so the
        // nullable rule applies and the controller clears any existing media.
        if ($this->input('media_type') === '') {
            $this->merge(['media_type' => null]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isCreating = $this->isMethod('post');
        $required = $isCreating ? 'required' : 'sometimes';

        $type = $this->enum('media_type', SermonMediaType::class);
        // On update, an upload is only required when switching to a file type
        // and no file already exists.
        $fileRequired = $type?->isFile() && ($isCreating || ! $this->routeSermonHasMedia());
        $urlRequired = $type !== null && ! $type->isFile();

        return [
            'series' => ['nullable', 'string', 'max:255'],
            'title' => [$required, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            // The preacher is now a linked user; `speaker` text is derived from
            // it server-side, but stays accepted for legacy/API callers.
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'speaker' => [$isCreating ? 'required_without:user_id' : 'sometimes', 'nullable', 'string', 'max:255'],
            'book' => ['nullable', 'string', 'max:255'],
            'preached_at' => [$required, 'date'],
            'duration' => ['nullable', 'string', 'max:50'],
            'is_published' => ['boolean'],

            // Nullable: a sermon may carry no media (text / notes only).
            'media_type' => ['nullable', new Enum(SermonMediaType::class)],
            // External link (video_url / audio_url).
            'media_url' => [$urlRequired ? 'required' : 'nullable', 'url', 'max:2048'],
            // Raw uploaded file (video_file / audio_file).
            'media' => [$fileRequired ? 'required' : 'nullable', 'file', 'mimes:mp4,webm,mov,mp3,wav,m4a,ogg', 'max:204800'],

            'background_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'remove_background_image' => ['boolean'],

            'scriptures' => ['nullable', 'array'],
            'scriptures.*' => ['string', 'max:255'],

            // Canonical Bible books (multi-select categories).
            'books_category' => ['nullable', 'array'],
            'books_category.*' => ['string', 'max:255'],
        ];
    }

    /**
     * On update, whether the targeted sermon already has an uploaded file (so a
     * new upload is not mandatory).
     */
    private function routeSermonHasMedia(): bool
    {
        $sermon = $this->route('sermon');

        return $sermon !== null && ! empty($sermon->media_path);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'media.required' => 'Veuillez téléverser le fichier média pour ce type.',
            'media_url.required' => 'Veuillez fournir une URL valide pour ce type.',
        ];
    }
}
