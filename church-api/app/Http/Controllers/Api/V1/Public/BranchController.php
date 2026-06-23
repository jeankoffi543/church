<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\BranchResource;
use App\Models\Branch;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BranchController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return BranchResource::collection(
            Branch::query()->with('pastor')->orderBy('title')->get()
        );
    }

    public function show(string $slug): BranchResource
    {
        $branch = Branch::query()->with('pastor')->where('slug', $slug)->firstOrFail();

        return new BranchResource($branch);
    }
}
