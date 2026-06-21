<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\HomeGroupResource;
use App\Models\HomeGroup;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HomeGroupController extends Controller
{
    /**
     * Active home groups (cellules) for the /eglise map + list.
     */
    public function index(): AnonymousResourceCollection
    {
        $groups = HomeGroup::query()->active()->ordered()->get();

        return HomeGroupResource::collection($groups);
    }
}
