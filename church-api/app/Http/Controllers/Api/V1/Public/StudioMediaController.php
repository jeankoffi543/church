<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudioMediaController extends Controller
{
    /**
     * Stream an uploaded Live Studio media file (video or image) with HTTP Range
     * support (206) so the browser can autoplay/seek — the `/storage` symlink is
     * not Range-capable under `php artisan serve`, and this `api/*` route also
     * carries CORS headers so the program-out canvas can draw it. The `{file}`
     * route is constrained to a safe basename (no path separators), so traversal
     * is impossible.
     */
    public function stream(string $file): BinaryFileResponse
    {
        foreach (['studio/images/', 'studio/videos/'] as $prefix) {
            $relativePath = $prefix.$file;
            if (Storage::disk('public')->exists($relativePath)) {
                return response()->file(Storage::disk('public')->path($relativePath));
            }
        }

        abort(404);
    }
}
