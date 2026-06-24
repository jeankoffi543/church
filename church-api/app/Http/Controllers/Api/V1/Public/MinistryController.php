<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\MinistryResource;
use App\Models\Ministry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MinistryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Ministry::query()->active();

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->ordered();
        }

        $ministries = $query->paginate($request->integer('per_page', 8));

        return MinistryResource::collection($ministries);
    }
}
