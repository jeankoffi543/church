<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MinistryRequest extends FormRequest
{
    /**
     * Access is gated by the `auth:sanctum` middleware on the route group.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalise multipart string flags ("1"/"true") into real booleans so the
     * validator and Eloquent receive proper types.
     */
    protected function prepareForValidation(): void
    {
        foreach (['is_active', 'remove_image'] as $flag) {
            if ($this->has($flag)) {
                $this->merge([
                    $flag => filter_var($this->input($flag), FILTER_VALIDATE_BOOLEAN),
                ]);
            }
        }
    }

    /**
     * On update (PUT/PATCH) every field becomes optional via `sometimes`.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'schedule' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            // Designated leader; `null` clears the assignment.
            'chef_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            // Cover image upload + an explicit "remove existing image" flag.
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_image' => ['boolean'],
        ];
    }
}
