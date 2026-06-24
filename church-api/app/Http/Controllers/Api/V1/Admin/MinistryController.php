<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\MinistryRequest;
use App\Http\Resources\V1\MinistryResource;
use App\Models\Ministry;
use App\Traits\HandlesFileUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MinistryController extends Controller
{
    use HandlesFileUploads;

    /**
     * All ministries (including inactive) for management.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Ministry::query()->with('chef');

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->ordered();
        }

        return MinistryResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(MinistryRequest $request): JsonResponse
    {
        $data = $request->validated();
        unset($data['image'], $data['remove_image']);

        if ($request->hasFile('image')) {
            $data['image'] = $this->uploadSingleFile($request->file('image'), 'ministries');
        }

        $ministry = Ministry::create($data);

        return (new MinistryResource($ministry->load('chef')))->response()->setStatusCode(201);
    }

    public function show(Ministry $ministry): MinistryResource
    {
        return new MinistryResource($ministry->load('chef'));
    }

    public function update(MinistryRequest $request, Ministry $ministry): MinistryResource
    {
        $data = $request->validated();
        $removeImage = (bool) ($data['remove_image'] ?? false);
        unset($data['image'], $data['remove_image']);

        if ($request->hasFile('image')) {
            $this->deleteStoredFile($ministry->image);
            $data['image'] = $this->uploadSingleFile($request->file('image'), 'ministries');
        } elseif ($removeImage) {
            $this->deleteStoredFile($ministry->image);
            $data['image'] = null;
        }

        $ministry->update($data);

        return new MinistryResource($ministry->load('chef'));
    }

    public function destroy(Ministry $ministry): JsonResponse
    {
        $ministry->delete();

        return response()->json(status: 204);
    }
}
