<?php

namespace App\Http\Controllers\Api\Platform;

use App\Http\Controllers\Controller;
use App\Models\CentralUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Authentication for platform ("landlord") staff — the central back-office.
 * Mirrors the tenant admin login but resolves against {@see CentralUser} and
 * issues tokens on the `central` guard. Runs in central context (these routes
 * carry no tenancy middleware).
 */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string'],
        ]);

        $user = CentralUser::query()->where('email', $validated['email'])->first();

        if ($user === null || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants invalides.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Votre accès plateforme a été suspendu.'],
            ]);
        }

        $token = $user->createToken(
            $validated['device_name'] ?? 'platform-backoffice',
            ['platform'],
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'user' => $this->profilePayload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var CentralUser $user */
        $user = $request->user();

        return response()->json(['data' => $this->profilePayload($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function profilePayload(CentralUser $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'is_super_admin' => $user->isSuperAdmin(),
        ];
    }
}
