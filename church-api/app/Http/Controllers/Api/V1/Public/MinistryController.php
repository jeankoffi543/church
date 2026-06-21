<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\MinistryResource;
use App\Models\Ministry;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MinistryController extends Controller
{
    /**
     * Active ministries, ordered. The client decides whether to show the
     * "Voir plus" button when the list exceeds 4.
     */
    public function index(): AnonymousResourceCollection
    {
        $ministries = Ministry::query()->active()->ordered()->get();

        return MinistryResource::collection($ministries);
    }
}
