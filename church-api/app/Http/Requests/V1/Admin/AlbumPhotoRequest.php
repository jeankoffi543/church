<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class AlbumPhotoRequest extends FormRequest
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
            // Bulk upload — up to 50 images at once.
            'photos' => ['required', 'array', 'max:50'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'photos.max' => 'Vous pouvez téléverser au maximum 50 images à la fois.',
            'photos.*.image' => 'Chaque fichier doit être une image (JPG, PNG, WEBP).',
        ];
    }
}
