<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
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
        $userId = $this->route('user')?->id;

        return [
            'name' => [$isCreating ? 'required' : 'sometimes', 'string', 'max:255'],
            'email' => [
                $isCreating ? 'required' : 'sometimes',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            // Required on create, optional on update (only changed when present).
            'password' => [$isCreating ? 'required' : 'nullable', 'string', 'min:8'],
            'is_active' => ['boolean'],
            // The Groups / Departments the servant belongs to.
            'roles' => ['sometimes', 'array'],
            'roles.*' => ['string', Rule::exists('roles', 'name')],
        ];
    }
}
