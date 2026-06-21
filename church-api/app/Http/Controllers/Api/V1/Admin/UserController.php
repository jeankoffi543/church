<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\UserRequest;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    /**
     * Display a listing of the servants / administrators.
     */
    public function index(): AnonymousResourceCollection
    {
        $users = User::with('roles')->orderBy('name')->get();

        return UserResource::collection($users);
    }

    /**
     * Store a newly created servant and assign their Groups / Departments.
     */
    public function store(UserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $user->syncRoles($validated['roles'] ?? []);

        return response()->json([
            'message' => 'Serviteur créé avec succès.',
            'data' => new UserResource($user->load('roles')),
        ], 201);
    }

    /**
     * Display the specified servant.
     */
    public function show(User $user): UserResource
    {
        return new UserResource($user->load('roles'));
    }

    /**
     * Update the specified servant's profile, status and Groups.
     */
    public function update(UserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        $user->fill([
            'name' => $validated['name'] ?? $user->name,
            'email' => $validated['email'] ?? $user->email,
            'is_active' => $validated['is_active'] ?? $user->is_active,
        ]);

        // Only rotate the password when a new one is explicitly provided.
        if (! empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        $user->save();

        if (array_key_exists('roles', $validated)) {
            $user->syncRoles($validated['roles']);
        }

        return response()->json([
            'message' => 'Serviteur mis à jour avec succès.',
            'data' => new UserResource($user->load('roles')),
        ]);
    }

    /**
     * Remove the specified servant. An administrator cannot delete themselves.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->is($user)) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Serviteur supprimé.']);
    }
}
