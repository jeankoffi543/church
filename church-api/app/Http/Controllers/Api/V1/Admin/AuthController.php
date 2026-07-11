<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\LoginRequest;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate an administrator and issue a Sanctum token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email'))->first();

        if ($user === null || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants invalides.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Votre accès a été suspendu. Contactez un administrateur.'],
            ]);
        }

        $token = $user->createToken(
            $request->string('device_name')->toString() ?: 'admin-backoffice',
            ['admin'],
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'user' => $this->profilePayload($user),
        ]);
    }

    /**
     * The currently authenticated administrator, with their resolved Groups and
     * the flat list of permissions used to gate the front-end UI.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->profilePayload($request->user()),
            // The tenant's active features let the admin UI hide modules that
            // aren't in the church's plan (CHR-140).
            'features' => tenant()?->activeFeatures() ?? [],
        ]);
    }

    /**
     * Shared identity + access payload. Super Admins report every permission so
     * the front-end mirrors the back-end `Gate::before` immunity.
     *
     * @return array<string, mixed>
     */
    private function profilePayload(User $user): array
    {
        $isSuperAdmin = $user->hasRole(AccessControl::SUPER_ADMIN);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => (bool) $user->is_active,
            'is_super_admin' => $isSuperAdmin,
            'roles' => $user->getRoleNames()->all(),
            'permissions' => $isSuperAdmin
                ? AccessControl::permissions()
                : $user->getAllPermissions()->pluck('name')->all(),
        ];
    }

    /**
     * Revoke the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    /**
     * List all users.
     */
    public function users(): JsonResponse
    {
        return response()->json(['data' => User::query()->get(['id', 'name', 'email'])]);
    }
}
