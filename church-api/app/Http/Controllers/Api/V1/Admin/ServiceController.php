<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\ServiceRequest;
use App\Http\Resources\V1\ServiceResource;
use App\Models\Service;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ServiceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Service::query()->with(['offeringCollections', 'attendances'])->orderByDesc('date');

        $query->searchOnRequest()->filterOnRequest()->sortOnRequest();

        return ServiceResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(ServiceRequest $request): JsonResponse
    {
        $service = Service::create($request->validated());

        return (new ServiceResource($service))->response()->setStatusCode(201);
    }

    public function show(Service $service): ServiceResource
    {
        return new ServiceResource($service->load(['offeringCollections', 'attendances']));
    }

    public function update(ServiceRequest $request, Service $service): ServiceResource
    {
        $service->update($request->validated());

        return new ServiceResource($service->load(['offeringCollections', 'attendances']));
    }

    public function destroy(Service $service): JsonResponse
    {
        try {
            $service->delete();
        } catch (QueryException) {
            return response()->json([
                'message' => 'Impossible de supprimer ce culte : des collectes ou des présences y sont déjà rattachées.',
            ], 422);
        }

        return response()->json(status: 204);
    }
}
