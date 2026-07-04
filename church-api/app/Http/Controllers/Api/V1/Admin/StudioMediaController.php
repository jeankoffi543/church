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
     * Store a local video, image or audio file uploaded from a Live Studio source
     * and return a stable stream URL to persist on the layer. Serving through this
     * `api/*` route (not the `/storage` symlink) means the response carries CORS
     * headers, so the program-out `<canvas>` can draw the media — and Web Audio
     * can mix an audio file — without tainting it.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'mimetypes:video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,'.
                'image/jpeg,image/png,image/webp,image/gif,image/avif,'.
                'audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/flac,audio/x-m4a',
                'max:512000',
            ],
        ]);

        $mime = (string) $validated['file']->getMimeType();
        $dir = match (true) {
            str_starts_with($mime, 'image/') => 'studio/images',
            str_starts_with($mime, 'audio/') => 'studio/audio',
            default => 'studio/videos',
        };
        $path = $validated['file']->store($dir, 'public');
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
        $isAudio = Str::startsWith($contentType, 'audio/');
        if (! $isImage && ! $isVideo && ! $isAudio) {
            @unlink($tmp);
            abort(422, "L'URL ne pointe pas vers une image, une vidéo ou un audio.");
        }

        $maxBytes = $isImage ? 25 * 1024 * 1024 : 512 * 1024 * 1024;
        if ((filesize($tmp) ?: 0) > $maxBytes) {
            @unlink($tmp);
            abort(422, 'Média trop volumineux.');
        }

        [$dir, $prefix, $ext] = match (true) {
            $isImage => ['studio/images', 'url-', match (true) {
                Str::contains($contentType, 'png') => 'png',
                Str::contains($contentType, 'webp') => 'webp',
                Str::contains($contentType, 'gif') => 'gif',
                Str::contains($contentType, 'avif') => 'avif',
                default => 'jpg',
            }],
            $isAudio => ['studio/audio', 'aud-', match (true) {
                Str::contains($contentType, 'mpeg') => 'mp3',
                Str::contains($contentType, 'wav') => 'wav',
                Str::contains($contentType, 'ogg') => 'ogg',
                Str::contains($contentType, 'flac') => 'flac',
                Str::contains($contentType, 'aac') => 'aac',
                Str::contains($contentType, 'mp4'), Str::contains($contentType, 'm4a') => 'm4a',
                default => 'mp3',
            }],
            default => ['studio/videos', 'vid-', match (true) {
                Str::contains($contentType, 'webm') => 'webm',
                Str::contains($contentType, 'quicktime') => 'mov',
                Str::contains($contentType, 'matroska') => 'mkv',
                Str::contains($contentType, 'ogg') => 'ogv',
                default => 'mp4',
            }],
        };
        $name = $prefix.Str::lower(Str::random(24)).'.'.$ext;
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
