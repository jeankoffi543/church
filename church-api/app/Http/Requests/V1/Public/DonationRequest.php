<?php

namespace App\Http\Requests\V1\Public;

use App\Enums\DonationFrequency;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class DonationRequest extends FormRequest
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
            'donor_name' => ['required', 'string', 'max:255'],
            'donor_email' => ['required', 'email', 'max:255'],
            'donor_phone' => ['nullable', 'string', 'max:40'],
            'purpose_key' => ['required', 'string', 'max:50'],
            // Real amount (e.g. 5000 XOF). Paystack's minimum is ~100.
            'amount' => ['required', 'integer', 'min:100', 'max:100000000'],
            'frequency' => ['required', new Enum(DonationFrequency::class)],
            'currency' => ['nullable', Rule::in(['XOF', 'NGN', 'GHS', 'USD'])],
        ];
    }
}
