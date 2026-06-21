<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\RoleRequest;
use App\Http\Requests\V1\Admin\SyncPermissionsRequest;
use App\Http\Resources\V1\RoleResource;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * Display every Group / Department with its permissions and member count.
     */
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')->withCount('users')->orderBy('name')->get();

        return response()->json(['data' => RoleResource::collection($roles)]);
    }

    /**
     * Store a newly created Group / Department.
     */
    public function store(RoleRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        if (array_key_exists('permissions', $validated)) {
            $role->syncPermissions($validated['permissions']);
        }

        return response()->json([
            'message' => 'Groupe créé avec succès.',
            'data' => new RoleResource($role->load('permissions')->loadCount('users')),
        ], 201);
    }

    /**
     * Display the specified Group / Department.
     */
    public function show(Role $role): JsonResponse
    {
        return response()->json([
            'data' => new RoleResource($role->load('permissions')->loadCount('users')),
        ]);
    }

    /**
     * Update the specified Group / Department.
     */
    public function update(RoleRequest $request, Role $role): JsonResponse
    {
        if ($this->isProtected($role) && $request->filled('name')) {
            return response()->json([
                'message' => 'Le groupe Super Admin ne peut pas être renommé.',
            ], 422);
        }

        $validated = $request->validated();

        if (array_key_exists('name', $validated)) {
            $role->update(['name' => $validated['name']]);
        }

        if (array_key_exists('permissions', $validated)) {
            $role->syncPermissions($validated['permissions']);
        }

        return response()->json([
            'message' => 'Groupe mis à jour avec succès.',
            'data' => new RoleResource($role->load('permissions')->loadCount('users')),
        ]);
    }

    /**
     * Synchronise the security-matrix selection for this Group in one call.
     */
    public function syncPermissions(SyncPermissionsRequest $request, Role $role): JsonResponse
    {
        $role->syncPermissions($request->validated('permissions'));

        return response()->json([
            'message' => 'Privilèges du groupe enregistrés.',
            'data' => new RoleResource($role->load('permissions')->loadCount('users')),
        ]);
    }

    /**
     * Remove the specified Group / Department.
     */
    public function destroy(Role $role): JsonResponse
    {
        if ($this->isProtected($role)) {
            return response()->json([
                'message' => 'Le groupe Super Admin ne peut pas être supprimé.',
            ], 422);
        }

        $role->delete();

        return response()->json(['message' => 'Groupe supprimé.']);
    }

    /**
     * The Super Admin group is structural and must never be altered/removed.
     */
    private function isProtected(Role $role): bool
    {
        return $role->name === AccessControl::SUPER_ADMIN;
    }
}
