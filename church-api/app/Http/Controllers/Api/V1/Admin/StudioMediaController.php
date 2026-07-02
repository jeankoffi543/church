<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudioMediaController extends Controller
{
    /**
     * Store a local video uploaded from the Live Studio "Vidéo" source and
     * return a stable, Range-capable stream URL to persist on the layer.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimetypes:video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska', 'max:512000'],
        ]);

        $path = $validated['file']->store('studio/videos', 'public');
        $name = basename($path);

        return response()->json([
            'data' => [
                'url' => route('api.v1.public.studio.media.stream', ['file' => $name]),
                'name' => $request->file('file')->getClientOriginalName(),
            ],
        ], 201);
    }
}
