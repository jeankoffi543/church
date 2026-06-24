<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\HomeGroupResource;
use App\Models\HomeGroup;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HomeGroupController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = HomeGroup::query()->active();

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->ordered();
        }

        $groups = $query->get();

        $zones = HomeGroup::query()->active()->whereNotNull('zone_name')->distinct()->pluck('zone_name')->sort()->values()->all();
        $days = HomeGroup::query()->active()->whereNotNull('meeting_day')->distinct()->pluck('meeting_day')->sort()->values()->all();

        return HomeGroupResource::collection($groups)->additional([
            'meta' => [
                'zones' => $zones,
                'days' => $days,
            ],
        ]);
    }
}
