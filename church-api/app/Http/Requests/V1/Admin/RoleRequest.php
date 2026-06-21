<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
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
        $isCreating = $this->isMethod('post');
        $roleId = $this->route('role')?->id;

        return [
            'name' => [
                $isCreating ? 'required' : 'sometimes',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->ignore($roleId),
            ],
            // Optional permission set applied on create/update.
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
        ];
    }
}
