<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\BranchResource;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BranchController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return BranchResource::collection(
            Branch::query()->with('pastor')->orderBy('title')->paginate(20)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:branches,slug',
            'description' => 'nullable|string',
            'address' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'hours' => 'required|string|max:255',
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'website' => 'nullable|string|max:255',
            'pastor_id' => 'nullable|integer|exists:users,id',
        ]);

        $branch = Branch::create($validated);

        return (new BranchResource($branch->load('pastor')))->response()->setStatusCode(201);
    }

    public function show(Branch $branch): BranchResource
    {
        return new BranchResource($branch->load('pastor'));
    }

    public function update(Request $request, Branch $branch): BranchResource
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:branches,slug,' . $branch->id,
            'description' => 'nullable|string',
            'address' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'hours' => 'required|string|max:255',
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'website' => 'nullable|string|max:255',
            'pastor_id' => 'nullable|integer|exists:users,id',
        ]);

        $branch->update($validated);

        return new BranchResource($branch->load('pastor'));
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $branch->delete();

        return response()->json(status: 204);
    }
}
