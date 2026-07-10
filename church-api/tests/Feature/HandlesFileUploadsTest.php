<?php

use App\Traits\HandlesFileUploads;
use Illuminate\Support\Facades\Storage;

/*
| CHR-136 — HandlesFileUploads keeps the relative `/storage/...` convention for
| local disks but returns/deletes absolute URLs for cloud (S3) disks, which are
| already tenant-prefixed by the filesystem bootstrapper.
*/

function uploader(): object
{
    return new class
    {
        use HandlesFileUploads {
            storedFileUrl as public pubStoredFileUrl;
            diskPathFromUrl as public pubDiskPathFromUrl;
        }
    };
}

it('keeps the relative /storage convention for local disks', function () {
    $u = uploader();

    expect($u->pubStoredFileUrl('public', 'sermons/x.jpg'))->toBe('/storage/sermons/x.jpg')
        ->and($u->pubDiskPathFromUrl('public', '/storage/sermons/x.jpg'))->toBe('sermons/x.jpg')
        // An external URL on a local disk is not ours to delete.
        ->and($u->pubDiskPathFromUrl('public', 'https://youtu.be/abc'))->toBeNull();
});

it('returns and resolves absolute tenant-prefixed URLs for cloud disks', function () {
    $disk = Mockery::mock();
    $disk->shouldReceive('url')->with('sermons/x.jpg')->andReturn('https://cdn.example/tenants/abc/sermons/x.jpg');
    $disk->shouldReceive('url')->with('')->andReturn('https://cdn.example/tenants/abc/');
    Storage::shouldReceive('disk')->with('s3')->andReturn($disk);

    $u = uploader();

    expect($u->pubStoredFileUrl('s3', 'sermons/x.jpg'))->toBe('https://cdn.example/tenants/abc/sermons/x.jpg')
        // Reverses the absolute URL back to the disk-relative key for deletion.
        ->and($u->pubDiskPathFromUrl('s3', 'https://cdn.example/tenants/abc/sermons/x.jpg'))->toBe('sermons/x.jpg')
        // A foreign absolute URL on the S3 disk is not ours.
        ->and($u->pubDiskPathFromUrl('s3', 'https://other.example/whatever.jpg'))->toBeNull();
});
