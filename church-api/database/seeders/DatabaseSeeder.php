<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database with the live MFM Ficgayo content.
     */
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'admin@mfm-ficgayo.ci'],
            ['name' => 'Administrateur MFM', 'password' => Hash::make('password')],
        );

        $this->call([
            AccessControlSeeder::class,
            SettingSeeder::class,
            MinistrySeeder::class,
            SermonSeeder::class,
            EventSeeder::class,
            HomeGroupSeeder::class,
            GallerySeeder::class,
            DemoSeeder::class,
            BranchSeeder::class,
        ]);
    }
}
