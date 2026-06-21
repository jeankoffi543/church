<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\SermonRequest;
use App\Http\Resources\V1\SermonResource;
use App\Models\Sermon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SermonController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return SermonResource::collection(Sermon::query()->latestFirst()->paginate(20));
    }

    public function store(SermonRequest $request): JsonResponse
    {
        $sermon = Sermon::create($request->validated());

        return (new SermonResource($sermon))->response()->setStatusCode(201);
    }

    public function show(Sermon $sermon): SermonResource
    {
        return new SermonResource($sermon);
    }

    public function update(SermonRequest $request, Sermon $sermon): SermonResource
    {
        $sermon->update($request->validated());

        return new SermonResource($sermon);
    }

    public function destroy(Sermon $sermon): JsonResponse
    {
        $sermon->delete();

        return response()->json(status: 204);
    }
}
