<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\EvangelismCampaignRequest;
use App\Http\Resources\V1\EvangelismCampaignResource;
use App\Models\EvangelismCampaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EvangelismCampaignController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = EvangelismCampaign::query()->withCount('converts')->orderByDesc('date');

        $query->searchOnRequest()->filterOnRequest()->sortOnRequest();

        return EvangelismCampaignResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(EvangelismCampaignRequest $request): JsonResponse
    {
        $campaign = EvangelismCampaign::create($request->validated());

        return (new EvangelismCampaignResource($campaign))->response()->setStatusCode(201);
    }

    public function show(EvangelismCampaign $evangelismCampaign): EvangelismCampaignResource
    {
        return new EvangelismCampaignResource($evangelismCampaign->loadCount('converts'));
    }

    public function update(EvangelismCampaignRequest $request, EvangelismCampaign $evangelismCampaign): EvangelismCampaignResource
    {
        $evangelismCampaign->update($request->validated());

        return new EvangelismCampaignResource($evangelismCampaign->loadCount('converts'));
    }

    public function destroy(EvangelismCampaign $evangelismCampaign): JsonResponse
    {
        $evangelismCampaign->delete();

        return response()->json(status: 204);
    }
}
