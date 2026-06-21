<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    /**
     * Return the permission catalogue grouped by category, used to render the
     * columns of the interactive security matrix on the front-end.
     */
    public function index(): JsonResponse
    {
        $categories = collect(AccessControl::catalog())
            ->map(fn (array $permissions, string $category): array => [
                'category' => $category,
                'permissions' => $permissions,
            ])
            ->values();

        return response()->json(['data' => $categories]);
    }
}
