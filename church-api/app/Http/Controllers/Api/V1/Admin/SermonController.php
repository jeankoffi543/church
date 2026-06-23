<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\SermonMediaType;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\SermonRequest;
use App\Http\Resources\V1\SermonResource;
use App\Models\Sermon;
use App\Models\User;
use App\Traits\HandlesFileUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SermonController extends Controller
{
    use HandlesFileUploads;

    public function index(): AnonymousResourceCollection
    {
        return SermonResource::collection(
            Sermon::query()->with('scriptures')->latestFirst()->paginate(20)
        );
    }

    public function store(SermonRequest $request): JsonResponse
    {
        $sermon = Sermon::create($this->mediaPayload($request));
        $this->syncScriptures($sermon, $request);

        return (new SermonResource($sermon->load('scriptures')))->response()->setStatusCode(201);
    }

    public function show(Sermon $sermon): SermonResource
    {
        return new SermonResource($sermon->load('scriptures'));
    }

    public function update(SermonRequest $request, Sermon $sermon): SermonResource
    {
        $sermon->update($this->mediaPayload($request, $sermon));
        $this->syncScriptures($sermon, $request);

        return new SermonResource($sermon->load('scriptures'));
    }

    public function destroy(Sermon $sermon): JsonResponse
    {
        $this->deleteStoredFile($sermon->media_path);
        $this->deleteStoredFile($sermon->background_image);
        $sermon->delete();

        return response()->json(status: 204);
    }

    /**
     * Build the persisted attributes, resolving the media source (file upload
     * vs external URL) and the optional cover image.
     *
     * @return array<string, mixed>
     */
    private function mediaPayload(SermonRequest $request, ?Sermon $sermon = null): array
    {
        $data = collect($request->validated())
            ->except(['media', 'background_image', 'remove_background_image', 'scriptures'])
            ->all();

        // Keep the legacy single `book` in sync with the first selected category.
        if (array_key_exists('books_category', $data)) {
            $data['book'] = $data['books_category'][0] ?? null;
        }

        // The preacher is selected as a user; mirror their name into `speaker`
        // so the public rendering (which reads `speaker`) never regresses.
        if ($request->filled('user_id')) {
            $user = User::find($request->integer('user_id'));
            if ($user !== null) {
                $data['speaker'] = $user->name;
            }
        }

        // An explicitly-sent media_type wins (including null for notes-only);
        // otherwise keep the sermon's current type (partial update).
        $type = $request->has('media_type')
            ? $request->enum('media_type', SermonMediaType::class)
            : $sermon?->media_type;

        if ($type !== null && $type->isFile()) {
            if ($request->hasFile('media')) {
                $this->deleteStoredFile($sermon?->media_path);
                // Dynamic destination: separate raw videos from raw audios.
                $folder = $type === SermonMediaType::VideoFile ? 'sermons/videos' : 'sermons/audios';
                $data['media_path'] = $this->uploadSingleFile($request->file('media'), $folder);
            }
            $data['media_url'] = null;
        } elseif ($type !== null) {
            $this->deleteStoredFile($sermon?->media_path);
            $data['media_path'] = null;
            $data['media_url'] = $request->validated('media_url');
        } else {
            // Notes only — drop any stored file and external link.
            $this->deleteStoredFile($sermon?->media_path);
            $data['media_type'] = null;
            $data['media_path'] = null;
            $data['media_url'] = null;
        }

        if ($request->hasFile('background_image')) {
            $this->deleteStoredFile($sermon?->background_image);
            $data['background_image'] = $this->uploadSingleFile($request->file('background_image'), 'sermons/covers');
        } elseif ($request->boolean('remove_background_image')) {
            $this->deleteStoredFile($sermon?->background_image);
            $data['background_image'] = null;
        }

        return $data;
    }

    /**
     * Replace the sermon's Bible references with the submitted, de-duplicated set.
     */
    private function syncScriptures(Sermon $sermon, SermonRequest $request): void
    {
        if (! $request->has('scriptures')) {
            return;
        }

        $references = collect($request->validated('scriptures', []))
            ->map(fn (string $r): string => trim($r))
            ->filter()
            ->unique()
            ->values();

        $sermon->scriptures()->delete();
        $sermon->scriptures()->createMany(
            $references->map(fn (string $reference): array => ['reference' => $reference])->all()
        );
    }
}
