<?php

namespace App\Console\Commands;

use App\Enums\CentralRole;
use App\Models\CentralUser;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

#[Signature('platform:create-super-admin
    {email : Login email for the platform super-admin}
    {--name=Platform Super Admin : Display name}
    {--password= : Password (a strong one is generated when omitted)}')]
#[Description('Create (or update) a platform super-admin in the central DB — the landlord account, separate from any church Super Admin (CHR-138).')]
class CreatePlatformSuperAdmin extends Command
{
    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $generated = $this->option('password') === null;
        $password = (string) ($this->option('password') ?? Str::password(20));

        $user = CentralUser::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => (string) $this->option('name'),
                'password' => Hash::make($password),
                'role' => CentralRole::SuperAdmin,
                'is_active' => true,
            ],
        );

        $this->info("Platform super-admin ready: {$user->email} (id {$user->id}).");

        if ($generated) {
            $this->warn("Generated password (shown once): {$password}");
        }

        return self::SUCCESS;
    }
}
