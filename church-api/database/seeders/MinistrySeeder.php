<?php

namespace Database\Seeders;

use App\Models\Ministry;
use Illuminate\Database\Seeder;

class MinistrySeeder extends Seeder
{
    public function run(): void
    {
        $ministries = [
            ['name' => 'Éco-Dim · Enfants', 'description' => 'Une fondation de foi solide dès le plus jeune âge, à travers le jeu, le chant et la Parole.', 'schedule' => 'Dimanche · 9h00'],
            ['name' => 'Jeunesse « Génération Feu »', 'description' => 'Des jeunes passionnés, équipés pour vivre et partager leur foi sans complexe.', 'schedule' => 'Samedi · 16h00'],
            ['name' => 'Couples & Familles', 'description' => "Bâtir des foyers solides, ancrés dans l'amour, le pardon et la fidélité.", 'schedule' => '1er samedi · 15h00'],
            ['name' => 'Louange & Adoration', 'description' => "Conduire l'assemblée dans la présence de Dieu par le chant et la musique.", 'schedule' => 'Répét. · Jeudi 18h'],
            ['name' => 'Intercession', 'description' => "Veiller dans la prière et porter l'église et la nation devant Dieu.", 'schedule' => 'Mardi · 5h00'],
        ];

        foreach ($ministries as $index => $ministry) {
            Ministry::updateOrCreate(
                ['name' => $ministry['name']],
                [...$ministry, 'sort_order' => $index, 'is_active' => true],
            );
        }
    }
}
