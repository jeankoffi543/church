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
                        'path' => $this->diskPathFromUrl($disk, $path),
                        'disk' => $disk,
                    ];

                    $item['value'] = $path;
                }
            }

            return $settings;
        } catch (Exception $e) {
            // Rollback: delete any files that were stored during this request execution
            foreach ($uploadedPaths as $file) {
                if ($file['path'] !== null) {
                    Storage::disk($file['disk'])->delete($file['path']);
                }
            }
            throw $e;
        }
    }

    /**
     * Delete a previously stored file given its stored reference (a relative
     * `/storage/...` path or an absolute cloud URL). No-op for null/empty values
     * or external URLs we don't own (e.g. a pasted YouTube link).
     */
    protected function deleteStoredFile(?string $url, string $disk = 'public'): void
    {
        if (empty($url)) {
            return;
        }

        $path = $this->diskPathFromUrl($disk, $url);

        if ($path !== null && $path !== '') {
            Storage::disk($disk)->delete($path);
        }
    }

    /**
     * Store a single uploaded file and return its public reference.
     *
     * The file lands on the given disk which, under an initialized tenancy, is
     * already scoped to the current tenant (local disks are suffixed with the
     * tenant id, S3 is prefixed with `tenants/{id}/`) — so isolation is handled
     * by the filesystem bootstrapper, not here.
     *
     * @param  string  $folder  Folder inside the disk (e.g. the group name)
     * @param  string  $disk  The storage disk to use (default: 'public')
     * @return string Relative `/storage/...` path (local disks) or absolute URL (cloud disks)
     *
     * @throws Exception
     */
    protected function uploadSingleFile(UploadedFile $file, string $folder, string $disk = 'public'): string
    {
        try {
            $path = $file->store($folder, $disk);

            return $this->storedFileUrl($disk, $path);
        } catch (Exception $e) {
            throw new Exception("Erreur lors de l'upload du fichier : ".$e->getMessage(), 0, $e);
        }
    }

    /**
     * The reference persisted for a freshly stored file. Local disks keep the
     * app's relative `/storage/...` convention (resolved by the front-end and
     * served per-tenant); cloud disks return their absolute, already
     * tenant-prefixed URL.
     */
    protected function storedFileUrl(string $disk, string $path): string
    {
        if ($this->isCloudDisk($disk)) {
            return Storage::disk($disk)->url($path);
        }

        return '/storage/'.$path;
    }

    /**
     * Reverse of {@see storedFileUrl()}: resolve a stored reference back to a
     * disk-relative path, or null if the reference isn't one we own on this disk.
     */
    protected function diskPathFromUrl(string $disk, string $url): ?string
    {
        if (str_starts_with($url, '/storage/')) {
            return substr($url, strlen('/storage/'));
        }

        if ($this->isCloudDisk($disk) && str_starts_with($url, 'http')) {
            $base = rtrim(Storage::disk($disk)->url(''), '/').'/';

            return str_starts_with($url, $base) ? substr($url, strlen($base)) : null;
        }

        return null;
    }

    /**
     * Whether the disk is an object store (S3) whose files are referenced by
     * absolute URL rather than the local `/storage/...` convention.
     */
    protected function isCloudDisk(string $disk): bool
    {
        return config("filesystems.disks.{$disk}.driver") === 's3';
    }
}
