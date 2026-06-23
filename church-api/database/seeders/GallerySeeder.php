<?php

namespace Database\Seeders;

use App\Models\Album;
use App\Models\Event;
use App\Models\PastLive;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class GallerySeeder extends Seeder
{
    /**
     * Unsplash imagery used for demo albums/photos (loads instantly, no upload).
     *
     * @var list<string>
     */
    private array $images = [
        'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1400&q=80',
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&q=80',
        'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1400&q=80',
        'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1400&q=80',
        'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1400&q=80',
        'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&q=80',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1400&q=80',
        'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1400&q=80',
    ];

    public function run(): void
    {
        $preacher = User::query()->first();
        $events = Event::query()->latest('id')->take(3)->get();

        $albums = [
            ['title' => 'Conférence Maison de Feu 2026', 'category_event' => 0, 'created' => '2026-03-15'],
            ['title' => 'Culte de Pâques', 'category_event' => 1, 'created' => '2026-04-05'],
            ['title' => 'Action Sociale & Distribution', 'category_event' => 2, 'created' => '2026-02-20'],
            ['title' => 'Baptêmes & Témoignages', 'category_event' => null, 'created' => '2026-01-12'],
        ];

        foreach ($albums as $i => $data) {
            $album = Album::updateOrCreate(
                ['slug' => Str::slug($data['title'])],
                [
                    'title' => $data['title'],
                    'description' => 'Retour en images sur ce moment fort de la vie de notre église.',
                    'event_id' => $data['category_event'] !== null ? $events->get($data['category_event'])?->id : null,
                    'cover_image' => $this->images[$i % count($this->images)],
                    'created_at' => $data['created'],
                ],
            );

            $album->photos()->delete();
            foreach (range(0, 7) as $order) {
                $album->photos()->create([
                    'image_path' => $this->images[($i + $order) % count($this->images)],
                    'order' => $order,
                ]);
            }
        }

        // Generate a deep archive spread across many months / years so the
        // public page's month grouping, filters and "load more" are testable.
        $titles = [
            'Vaincre les Géants de ta Vie', 'La Puissance de la Foi Agissante', 'Entendre la Voix de Dieu',
            "Marcher Selon l'Esprit", 'Le Combat de la Prière', 'Demeurer en Sa Présence',
            'La Grâce qui Transforme', 'Le Pouvoir du Pardon', 'Réveille le Don en Toi',
            'Bâtir sur le Roc', 'La Joie du Seigneur', "Persévérer dans l'Épreuve",
            'Une Foi Inébranlable', 'Le Feu du Réveil', 'Restaurer les Fondations',
        ];
        // A deliberately large series catalogue so the "Voir plus" facet sheets
        // (séries & années) are needed and testable.
        $seriesPool = [
            'Combats spirituels', 'Vivre par la foi', 'Intimité', 'Action de grâce', 'Réveil',
            'Délivrance', 'La Prière qui Transforme', 'Fondations', 'Vie de Famille', 'Prospérité Divine',
            'Guérison Intérieure', 'Le Sang de Jésus', 'Onction Fraîche', 'Marche Prophétique', 'Sagesse Divine',
            'Adoration Profonde', 'Le Tabernacle', 'Alliance Éternelle', 'Combat de la Foi', 'Héritage des Saints',
            'École du Saint-Esprit', 'Veillées de Feu', 'Jeûne & Consécration', 'Maison de Feu', 'Génération Mandatée',
            'Disciples du Royaume', 'Femmes de Valeur', 'Hommes de Guerre', 'Jeunesse Embrasée', 'Cellules de Vie',
            null, null,
        ];
        $start = Carbon::create(2026, 6, 20, 18, 0, 0);

        // 220 broadcasts, ~30 days apart → ~18 years (2008 → 2026), many months.
        for ($i = 0; $i < 220; $i++) {
            $title = $titles[$i % count($titles)];

            PastLive::updateOrCreate(
                ['slug' => Str::slug($title).'-'.($i + 1)],
                [
                    'title' => $title,
                    'description' => "Rediffusion intégrale de ce moment d'enseignement et d'adoration.",
                    'youtube_id' => 'dQw4w9WgXcQ',
                    'thumbnail_path' => $this->images[$i % count($this->images)],
                    'series_name' => $seriesPool[$i % count($seriesPool)],
                    'preacher_id' => $preacher?->id,
                    'views_count' => random_int(120, 9800),
                    'duration' => random_int(38, 110).' min',
                    'broadcasted_at' => $start->copy()->subDays($i * 30),
                ],
            );
        }
    }
}
