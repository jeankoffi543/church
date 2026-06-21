<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\MinistryRequest;
use App\Http\Resources\V1\MinistryResource;
use App\Models\Ministry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MinistryController extends Controller
{
    /**
     * All ministries (including inactive) for management.
     */
    public function index(): AnonymousResourceCollection
    {
        return MinistryResource::collection(Ministry::query()->ordered()->get());
    }

    public function store(MinistryRequest $request): JsonResponse
    {
        $ministry = Ministry::create($request->validated());

        return (new MinistryResource($ministry))->response()->setStatusCode(201);
    }

    public function show(Ministry $ministry): MinistryResource
    {
        return new MinistryResource($ministry);
    }

    public function update(MinistryRequest $request, Ministry $ministry): MinistryResource
    {
        $ministry->update($request->validated());

        return new MinistryResource($ministry);
    }

    public function destroy(Ministry $ministry): JsonResponse
    {
        $ministry->delete();

        return response()->json(status: 204);
    }
}
