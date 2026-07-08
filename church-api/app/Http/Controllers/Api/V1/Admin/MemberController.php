<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\MemberRequest;
use App\Http\Resources\V1\MemberResource;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MemberController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Member::query()->with('homeGroup')->orderByDesc('created_at');

        $query->searchOnRequest()->filterOnRequest()->sortOnRequest();

        return MemberResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(MemberRequest $request): JsonResponse
    {
        $member = Member::create($request->validated());
        // member_type/status have DB-level defaults; the in-memory instance
        // from create() doesn't know them until reloaded.
        $member->refresh();

        return (new MemberResource($member->load('homeGroup')))->response()->setStatusCode(201);
    }

    public function show(Member $member): MemberResource
    {
        return new MemberResource($member->load('homeGroup'));
    }

    public function update(MemberRequest $request, Member $member): MemberResource
    {
        $member->update($request->validated());

        return new MemberResource($member->load('homeGroup'));
    }

    public function destroy(Member $member): JsonResponse
    {
        $member->delete();

        return response()->json(status: 204);
    }
}
