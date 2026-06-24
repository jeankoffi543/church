<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\BranchResource;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BranchController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Branch::query()->with('pastor');

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->orderBy('title');
        }

        return BranchResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function show(string $slug): BranchResource
    {
        $branch = Branch::query()->with('pastor')->where('slug', $slug)->firstOrFail();

        return new BranchResource($branch);
    }
}
