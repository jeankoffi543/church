<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
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
     * Download an image from an external URL server-side and re-host it on our
     * CORS-enabled media route, so an operator-pasted URL is drawable on the
     * program-out canvas (and survives the source going away).
     */
    public function storeFromUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'url', 'max:2048'],
        ]);

        $url = $validated['url'];
        abort_unless(Str::startsWith($url, ['http://', 'https://']), 422, 'URL invalide.');

        try {
            $response = Http::timeout(15)->get($url);
        } catch (Throwable) {
            abort(422, "Impossible de télécharger l'image depuis l'URL.");
        }

        abort_unless($response->successful(), 422, "Impossible de télécharger l'image depuis l'URL.");

        $contentType = (string) $response->header('Content-Type');
        abort_unless(Str::startsWith($contentType, 'image/'), 422, "L'URL ne pointe pas vers une image.");

        $body = $response->body();
        abort_if(strlen($body) > 25 * 1024 * 1024, 422, 'Image trop volumineuse (max 25 Mo).');

        $ext = match (true) {
            Str::contains($contentType, 'png') => 'png',
            Str::contains($contentType, 'webp') => 'webp',
            Str::contains($contentType, 'gif') => 'gif',
            Str::contains($contentType, 'avif') => 'avif',
            default => 'jpg',
        };
        $name = 'url-'.Str::lower(Str::random(24)).'.'.$ext;
        Storage::disk('public')->put('studio/images/'.$name, $body);

        return response()->json([
            'data' => [
                'url' => route('api.v1.public.studio.media.stream', ['file' => $name]),
                'name' => basename((string) parse_url($url, PHP_URL_PATH)) ?: $name,
            ],
        ], 201);
    }
}
