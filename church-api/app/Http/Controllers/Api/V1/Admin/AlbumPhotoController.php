<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\AlbumPhotoRequest;
use App\Http\Resources\V1\AlbumPhotoResource;
use App\Models\Album;
use App\Models\AlbumPhoto;
use App\Traits\HandlesFileUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AlbumPhotoController extends Controller
{
    use HandlesFileUploads;

    /**
     * Bulk-upload up to 50 photos into an album, appended after existing ones.
     */
    public function store(AlbumPhotoRequest $request, Album $album): AnonymousResourceCollection
    {
        $order = (int) $album->photos()->max('order');
        $created = collect();

        foreach ($request->file('photos', []) as $file) {
            $created->push($album->photos()->create([
                'image_path' => $this->uploadSingleFile($file, "gallery/albums/{$album->id}"),
                'order' => ++$order,
            ]));
        }

        return AlbumPhotoResource::collection($created);
    }

    public function destroy(AlbumPhoto $albumPhoto): JsonResponse
    {
        $this->deleteStoredFile($albumPhoto->image_path);
        $albumPhoto->delete();

        return response()->json(status: 204);
    }

    /**
     * Persist a new photo ordering (array of photo ids in the desired order).
     */
    public function reorder(Request $request, Album $album): JsonResponse
    {
        $validated = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['integer'],
        ]);

        foreach ($validated['order'] as $position => $photoId) {
            $album->photos()->whereKey($photoId)->update(['order' => $position]);
        }

        return response()->json(status: 204);
    }
}
