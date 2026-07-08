<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\TeamRequest;
use App\Http\Resources\V1\TeamResource;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeamController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Team::query()->withCount('members')->orderBy('name');

        $query->searchOnRequest()->filterOnRequest()->sortOnRequest();

        return TeamResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(TeamRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $team = Team::create(collect($validated)->except('member_ids')->all());
        $team->refresh();

        if (isset($validated['member_ids'])) {
            $team->members()->sync($validated['member_ids']);
        }

        return (new TeamResource($team->loadCount('members')->load('members')))
            ->response()->setStatusCode(201);
    }

    public function show(Team $team): TeamResource
    {
        return new TeamResource($team->loadCount('members')->load('members'));
    }

    public function update(TeamRequest $request, Team $team): TeamResource
    {
        $validated = $request->validated();
        $team->update(collect($validated)->except('member_ids')->all());

        if (isset($validated['member_ids'])) {
            $team->members()->sync($validated['member_ids']);
        }

        return new TeamResource($team->loadCount('members')->load('members'));
    }

    public function destroy(Team $team): JsonResponse
    {
        $team->delete();

        return response()->json(status: 204);
    }
}
