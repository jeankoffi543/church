<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudioMediaController extends Controller
{
    /**
     * Stream an uploaded Live Studio video with HTTP Range support (206) so the
     * browser can autoplay/seek it — the `/storage` symlink is not Range-capable
     * under `php artisan serve`. The `{file}` route is constrained to a safe
     * basename (no path separators), so traversal is impossible.
     */
    public function stream(string $file): BinaryFileResponse
    {
        $relativePath = 'studio/videos/'.$file;

        abort_unless(Storage::disk('public')->exists($relativePath), 404);

        return response()->file(Storage::disk('public')->path($relativePath));
    }
}
