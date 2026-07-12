<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Identity;

use App\Http\Controllers\Controller;
use App\Models\Identity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Authentication for global end-user identities — churchgoers (CHR-165). Runs in
 * central context (no tenancy middleware) and issues tokens on the `identity`
 * guard, a realm distinct from tenant users and platform staff.
 */
class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['required', 'string', 'min:8'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        // Uniqueness is checked through the model so it hits the CENTRAL connection
        // (the `identities` table lives there, not on the default one — the
        // `unique` validation rule would query the wrong database in production).
        if (Identity::query()->where('email', $validated['email'])->exists()) {
            throw ValidationException::withMessages([
                'email' => ['Cet e-mail est déjà utilisé.'],
            ]);
        }

        $identity = Identity::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => $validated['password'],
        ]);

        return response()->json([
            'token' => $this->issueToken($identity, $validated['device_name'] ?? null),
            'identity' => $this->profilePayload($identity),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $identity = Identity::query()->where('email', $validated['email'])->first();

        if ($identity === null || ! Hash::check($validated['password'], $identity->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants invalides.'],
            ]);
        }

        return response()->json([
            'token' => $this->issueToken($identity, $validated['device_name'] ?? null),
            'identity' => $this->profilePayload($identity),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var Identity $identity */
        $identity = $request->user();

        return response()->json(['data' => $this->profilePayload($identity)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    private function issueToken(Identity $identity, ?string $deviceName): string
    {
        return $identity->createToken($deviceName ?? 'mobile-hub', ['identity'])->plainTextToken;
    }

    /**
     * @return array<string, mixed>
     */
    private function profilePayload(Identity $identity): array
    {
        return [
            'id' => $identity->id,
            'name' => $identity->name,
            'email' => $identity->email,
            'phone' => $identity->phone,
            'avatar_url' => $identity->avatar_url,
            'email_verified' => $identity->email_verified_at !== null,
        ];
    }
}
