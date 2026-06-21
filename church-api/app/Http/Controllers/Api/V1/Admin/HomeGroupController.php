<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\HomeGroupRequest;
use App\Http\Resources\V1\HomeGroupResource;
use App\Models\HomeGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HomeGroupController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return HomeGroupResource::collection(HomeGroup::query()->ordered()->get());
    }

    public function store(HomeGroupRequest $request): JsonResponse
    {
        $group = HomeGroup::create($request->validated());

        return (new HomeGroupResource($group))->response()->setStatusCode(201);
    }

    public function show(HomeGroup $homeGroup): HomeGroupResource
    {
        return new HomeGroupResource($homeGroup);
    }

    public function update(HomeGroupRequest $request, HomeGroup $homeGroup): HomeGroupResource
    {
        $homeGroup->update($request->validated());

        return new HomeGroupResource($homeGroup);
    }

    public function destroy(HomeGroup $homeGroup): JsonResponse
    {
        $homeGroup->delete();

        return response()->json(status: 204);
    }
}
