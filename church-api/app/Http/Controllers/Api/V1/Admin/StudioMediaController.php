<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class StudioMediaController extends Controller
{
    /**
     * Store a local video or image uploaded from a Live Studio source and return
     * a stable stream URL to persist on the layer. Serving through this `api/*`
     * route (not the `/storage` symlink) means the response carries CORS headers,
     * so the program-out `<canvas>` can draw the media without tainting it.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'mimetypes:video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,image/jpeg,image/png,image/webp,image/gif,image/avif',
                'max:512000',
            ],
        ]);

        $isImage = str_starts_with((string) $validated['file']->getMimeType(), 'image/');
        $path = $validated['file']->store($isImage ? 'studio/images' : 'studio/videos', 'public');
        $name = basename($path);

        return response()->json([
            'data' => [
                'url' => route('api.v1.public.studio.media.stream', ['file' => $name]),
                'name' => $request->file('file')->getClientOriginalName(),
            ],
        ], 201);
    }

    /**
     * Download an image OR video from an external URL server-side and re-host it
     * on our CORS-enabled media route, so an operator-pasted URL is drawable on
     * the program-out canvas (and survives the source going away). The download
     * streams straight to disk (`sink`) so a large video never loads into memory.
     */
    public function storeFromUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'url', 'max:2048'],
        ]);

        $url = $validated['url'];
        abort_unless(Str::startsWith($url, ['http://', 'https://']), 422, 'URL invalide.');

        $tmp = (string) tempnam(sys_get_temp_dir(), 'studio_');

        try {
            $response = Http::timeout(120)->sink($tmp)->get($url);
        } catch (Throwable) {
            @unlink($tmp);
            abort(422, "Impossible de télécharger le média depuis l'URL.");
        }

        if (! $response->successful()) {
            @unlink($tmp);
            abort(422, "Impossible de télécharger le média depuis l'URL.");
        }

        $contentType = (string) $response->header('Content-Type');
        if ($contentType === '' && function_exists('mime_content_type')) {
            $contentType = (string) (mime_content_type($tmp) ?: '');
        }

        $isImage = Str::startsWith($contentType, 'image/');
        $isVideo = Str::startsWith($contentType, 'video/');
        if (! $isImage && ! $isVideo) {
            @unlink($tmp);
            abort(422, "L'URL ne pointe pas vers une image ou une vidéo.");
        }

        $maxBytes = $isVideo ? 512 * 1024 * 1024 : 25 * 1024 * 1024;
        if ((filesize($tmp) ?: 0) > $maxBytes) {
            @unlink($tmp);
            abort(422, 'Média trop volumineux.');
        }

        $ext = match (true) {
            Str::contains($contentType, 'png') => 'png',
            Str::contains($contentType, 'webp') => 'webp',
            Str::contains($contentType, 'gif') => 'gif',
            Str::contains($contentType, 'avif') => 'avif',
            Str::contains($contentType, 'webm') => 'webm',
            Str::contains($contentType, 'quicktime') => 'mov',
            Str::contains($contentType, 'matroska') => 'mkv',
            Str::contains($contentType, 'ogg') => 'ogv',
            Str::contains($contentType, 'mp4') => 'mp4',
            $isVideo => 'mp4',
            default => 'jpg',
        };
        $dir = $isImage ? 'studio/images' : 'studio/videos';
        $name = ($isImage ? 'url-' : 'vid-').Str::lower(Str::random(24)).'.'.$ext;
        Storage::disk('public')->putFileAs($dir, new File($tmp), $name);
        @unlink($tmp);

        return response()->json([
            'data' => [
                'url' => route('api.v1.public.studio.media.stream', ['file' => $name]),
                'name' => basename((string) parse_url($url, PHP_URL_PATH)) ?: $name,
            ],
        ], 201);
    }
}
