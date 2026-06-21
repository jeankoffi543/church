<?php

namespace Database\Seeders;

use App\Models\Sermon;
use Illuminate\Database\Seeder;

class SermonSeeder extends Seeder
{
    public function run(): void
    {
        $sermons = [
            ['title' => 'La grâce qui transforme', 'speaker' => 'Pasteur David Odion Victor', 'series' => 'Vivre par la foi', 'book' => 'Romains', 'preached_at' => '2026-06-14', 'duration' => '48 min', 'description' => 'Comment la grâce de Dieu ne se contente pas de pardonner — elle transforme.'],
            ['title' => "Le feu de l'intercession", 'speaker' => 'Pasteur David Odion Victor', 'series' => 'Prière', 'book' => 'Luc', 'preached_at' => '2026-06-07', 'duration' => '52 min'],
            ['title' => 'Une maison bâtie sur le roc', 'speaker' => 'Sœur Esther Mbarga', 'series' => 'Fondations', 'book' => 'Matthieu', 'preached_at' => '2026-05-31', 'duration' => '39 min'],
            ['title' => 'Marcher dans la lumière', 'speaker' => 'Pasteur Daniel Adeyemi', 'series' => 'Vivre par la foi', 'book' => '1 Jean', 'preached_at' => '2026-05-24', 'duration' => '45 min'],
            ['title' => 'Le Dieu qui restaure', 'speaker' => 'Sœur Esther Mbarga', 'series' => 'Fondations', 'book' => 'Joël', 'preached_at' => '2026-05-17', 'duration' => '41 min'],
            ['title' => 'Briser les limites', 'speaker' => 'Pasteur David Odion Victor', 'series' => 'Prière', 'book' => 'Josué', 'preached_at' => '2026-05-10', 'duration' => '56 min'],
        ];

        foreach ($sermons as $sermon) {
            Sermon::updateOrCreate(
                ['title' => $sermon['title']],
                [...$sermon, 'is_published' => true],
            );
        }
    }
}
