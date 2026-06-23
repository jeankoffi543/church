<?php

namespace Database\Seeders;

use App\Models\Donation;
use Illuminate\Database\Seeder;

class DonationSeeder extends Seeder
{
    public function run(): void
    {
        if (Donation::query()->exists()) {
            return;
        }

        // ~140 gifts spread across the last ~14 months so the finance KPIs and
        // month/year filters have something rich to chew on.
        foreach (range(0, 139) as $i) {
            Donation::factory()->create([
                'created_at' => now()->subDays($i * 3)->subHours(fake()->numberBetween(0, 23)),
            ]);
        }
    }
}
