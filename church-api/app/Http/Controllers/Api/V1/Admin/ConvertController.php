<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\ConvertRequest;
use App\Http\Resources\V1\ConvertResource;
use App\Models\Convert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ConvertController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Convert::query()
            ->with(['evangelismCampaign', 'assignedCounselor'])
            ->orderByDesc('decision_date');

        $query->searchOnRequest()->filterOnRequest()->sortOnRequest();

        return ConvertResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(ConvertRequest $request): JsonResponse
    {
        $convert = Convert::create($request->validated());
        // decision_type/status have DB-level defaults; the in-memory instance
        // from create() doesn't know them until reloaded.
        $convert->refresh();

        return (new ConvertResource($convert->load(['evangelismCampaign', 'assignedCounselor'])))
            ->response()->setStatusCode(201);
    }

    public function show(Convert $convert): ConvertResource
    {
        return new ConvertResource($convert->load(['evangelismCampaign', 'assignedCounselor']));
    }

    public function update(ConvertRequest $request, Convert $convert): ConvertResource
    {
        $convert->update($request->validated());

        return new ConvertResource($convert->load(['evangelismCampaign', 'assignedCounselor']));
    }

    public function destroy(Convert $convert): JsonResponse
    {
        $convert->delete();

        return response()->json(status: 204);
    }
}
