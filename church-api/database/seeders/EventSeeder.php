<?php

namespace Database\Seeders;

use App\Models\Event;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    public function run(): void
    {
        $events = [
            [
                'slug' => 'veillee-toute-la-nuit',
                'title' => 'Veillée de prière « Toute la nuit »',
                'type' => 'Veillée',
                'location' => 'Temple central · Yopougon Ficgayo',
                'host' => "Département d'intercession",
                'starts_at' => '2026-06-27 22:00:00',
                'ends_at' => '2026-06-28 05:00:00',
                'description' => 'Une nuit entière dans la présence de Dieu : adoration, intercession et combat spirituel.',
                'highlights' => ["Temps d'adoration prolongée", 'Intercession ciblée par thèmes', 'Ministration et prière individuelle', 'Petit-déjeuner de communion à l’aube'],
                'is_featured' => false,
            ],
            [
                'slug' => 'culte-action-de-grace',
                'title' => "Culte d'action de grâce",
                'type' => 'Culte',
                'location' => 'Temple central · Yopougon Ficgayo',
                'host' => 'Pasteur David Odion Victor',
                'starts_at' => '2026-06-29 09:00:00',
                'description' => 'Un dimanche pour rendre grâce à Dieu pour sa fidélité.',
                'highlights' => ['Louange & adoration en direct', 'Témoignages de la Maison', "Message d'action de grâce"],
                'is_featured' => false,
            ],
            [
                'slug' => 'seminaire-des-couples',
                'title' => 'Séminaire des couples',
                'type' => 'Séminaire',
                'location' => 'Salle des fêtes · Cocody Angré',
                'host' => 'Ministère Couples & Familles',
                'starts_at' => '2026-07-05 15:00:00',
                'description' => "Un après-midi d'enseignement pour bâtir des foyers solides.",
                'highlights' => ['Enseignement biblique sur le couple', 'Ateliers de communication', "Temps d'échange et de prière"],
                'is_featured' => false,
            ],
            [
                'slug' => 'maison-de-feu-2026',
                'title' => 'Conférence « Maison de Feu 2026 »',
                'type' => 'Conférence',
                'location' => 'Temple central · Yopougon Ficgayo',
                'host' => 'Orateurs invités',
                'starts_at' => '2026-07-11 09:00:00',
                'ends_at' => '2026-07-13 21:00:00',
                'description' => "Trois jours de prière, d'adoration et d'enseignement avec des orateurs invités.",
                'highlights' => ['Sessions matin & soir', 'Soirées de réveil et de miracles', 'Séminaires thématiques', 'Orateurs invités nationaux & internationaux'],
                'is_featured' => true,
            ],
        ];

        foreach ($events as $event) {
            Event::updateOrCreate(['slug' => $event['slug']], $event);
        }
    }
}
