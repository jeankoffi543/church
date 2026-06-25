<?php

namespace Database\Seeders;

use App\Models\BibleVerse;
use Illuminate\Database\Seeder;

/**
 * A curated starter set of well-known, public-domain Louis Segond (1910)
 * verses — enough for the Live Studio to be demonstrable out of the box,
 * including contiguous runs (Psaume 23, Jean 3:16-17, 1 Corinthiens 13:4-7)
 * so the "verset suivant" / "chapitre suivant" navigation works live.
 *
 * Load a full Bible with `php artisan bible:import path/to/bible.json`.
 */
class BibleVerseSeeder extends Seeder
{
    public function run(): void
    {
       BibleVerse::factory()->count(150)->create();
    }
}
