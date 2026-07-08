<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\ResourceRequest;
use App\Http\Resources\V1\ResourceModelResource;
use App\Models\Resource;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ResourceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Resource::query()->withCount('bookings')->orderBy('name');

        $query->searchOnRequest()->filterOnRequest()->sortOnRequest();

        return ResourceModelResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(ResourceRequest $request): JsonResponse
    {
        $resource = Resource::create($request->validated());
        $resource->refresh();

        return (new ResourceModelResource($resource))->response()->setStatusCode(201);
    }

    public function show(Resource $resource): ResourceModelResource
    {
        return new ResourceModelResource($resource->loadCount('bookings'));
    }

    public function update(ResourceRequest $request, Resource $resource): ResourceModelResource
    {
        $resource->update($request->validated());

        return new ResourceModelResource($resource->loadCount('bookings'));
    }

    public function destroy(Resource $resource): JsonResponse
    {
        try {
            $resource->delete();
        } catch (QueryException) {
            return response()->json([
                'message' => 'Impossible de supprimer cette ressource : des réservations y sont déjà rattachées.',
            ], 422);
        }

        return response()->json(status: 204);
    }
}
