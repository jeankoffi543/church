<?php

namespace App\Traits;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

trait HandlesFileUploads
{
    /**
     * Process uploads from a request and map them to the settings array based on keys.
     * Matches setting keys to request files, stores them, and updates their values to the public URL.
     * Supports rollbacks (deleting stored files if an exception is thrown).
     *
     * @param  Request  $request  The incoming request
     * @param  array  $settings  The settings array (e.g. [['key' => '...', 'value' => '...', 'group' => '...']])
     * @param  string  $disk  Storage disk
     * @return array Updated settings array with file URLs
     *
     * @throws Exception
     */
    protected function mapRequestUploadsToSettings(Request $request, array $settings, string $disk = 'public'): array
    {
        $uploadedPaths = [];

        try {
            foreach ($settings as &$item) {
                if (! isset($item['key'])) {
                    continue;
                }

                $key = $item['key'];
                $group = $item['group'] ?? 'general';

                // Check if a file exists in the request matching the setting key name
                if ($request->hasFile($key)) {
                    $file = $request->file($key);
                    $path = $this->uploadSingleFile($file, $group, $disk);

                    // Keep track of stored paths to allow deletion/rollback on failure
                    $uploadedPaths[] = [
                        'path' => str_replace('/storage/', '', $path),
                        'disk' => $disk,
                    ];

                    $item['value'] = $path;
                }
            }

            return $settings;
        } catch (Exception $e) {
            // Rollback: delete any files that were stored during this request execution
            foreach ($uploadedPaths as $file) {
                Storage::disk($file['disk'])->delete($file['path']);
            }
            throw $e;
        }
    }

    /**
     * Delete a previously stored file given its public URL (e.g. /storage/x.jpg).
     * No-op for null/empty values or external (http) URLs.
     */
    protected function deleteStoredFile(?string $url, string $disk = 'public'): void
    {
        if (empty($url) || ! str_starts_with($url, '/storage/')) {
            return;
        }

        Storage::disk($disk)->delete(str_replace('/storage/', '', $url));
    }

    /**
     * Store a single uploaded file and return its public URL.
     *
     * @param  string  $folder  Folder inside the disk (e.g. the group name)
     * @param  string  $disk  The storage disk to use (default: 'public')
     * @return string Public URL prefixed with /storage/
     *
     * @throws Exception
     */
    protected function uploadSingleFile(UploadedFile $file, string $folder, string $disk = 'public'): string
    {
        try {
            $path = $file->store($folder, $disk);

            return '/storage/'.$path;
        } catch (Exception $e) {
            throw new Exception("Erreur lors de l'upload du fichier : ".$e->getMessage(), 0, $e);
        }
    }
}
