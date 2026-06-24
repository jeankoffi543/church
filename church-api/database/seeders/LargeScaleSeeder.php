<?php

namespace Database\Seeders;

use App\Enums\MinistryApplicationStatus;
use App\Enums\SermonMediaType;
use App\Models\Branch;
use App\Models\Event;
use App\Models\HomeGroup;
use App\Models\HomeGroupApplication;
use App\Models\Ministry;
use App\Models\MinistryApplication;
use App\Models\Sermon;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class LargeScaleSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::all();
        if ($users->isEmpty()) {
            $users = User::factory()->count(100)->create();
        } elseif ($users->count() < 100) {
            $users = $users->concat(User::factory()->count(100 - $users->count())->create());
        }

        // 1. SERMONS (Exactly 101 records total)
        $this->seedSermons($users);

        // 2. EVENTS (Exactly 101 records total)
        $this->seedEvents();

        // 3. BRANCHES (Exactly 101 records total)
        $this->seedBranches($users);

        // 4. MINISTRIES (Exactly 101 records total)
        $this->seedMinistries($users);

        // 5. APPLICATIONS (Ministry and HomeGroup, exactly 101 records total each)
        $this->seedApplications($users);
    }

    private function seedSermons($users): void
    {
        $existing = Sermon::count();
        $target = 101;
        $needed = $target - $existing;

        if ($needed <= 0) {
            return;
        }

        // We need titles with specific terms to test search relevance:
        // - At least 20 containing the word "Feu"
        // - At least 15 containing the word "Délivrance"
        // - Titres variés (courts, très longs, caractères spéciaux/accents)
        $feuTitles = [
            'Le Feu de la Pentecôte', 'Embrasé par le Feu divin', 'Le Feu du Saint-Esprit sur nos vies',
            'Marcher dans le Feu de l\'Esprit', 'Le Feu purificateur de l\'autel', 'Attiser le Feu de la prière',
            'Feu dévorant contre les oppressions', 'Un cœur de Feu pour Dieu', 'Le Feu sacré de l\'évangélisation',
            'Feu ! Saint-Esprit descend', 'Brûler du Feu céleste', 'Le Feu de la foi chrétienne',
            'Quand le Feu de Dieu tombe', 'Protéger le Feu divin de l\'apostasie', 'Feu et zèle pour le royaume',
            'La colonne de Feu qui nous guide', 'Une onction de Feu sur ton ministère', 'Esprit de Feu et de force',
            'Feu sur l\'autel de l\'intercession', 'Le Feu de la vérité biblique',
        ];

        $delivranceTitles = [
            'La Délivrance des oppressions familiales', 'Prière intense pour ta Délivrance complète',
            'Le chemin vers la vraie Délivrance', 'Délivrance spirituelle et restauration des âmes',
            'Briser les chaînes de captivité : Délivrance !', 'La Délivrance divine face aux géants',
            'Délivrance de l\'esprit de peur', 'Les secrets d\'une Délivrance durable',
            'Saison de Délivrance et de bénédiction', 'Délivrance des fondations anciennes',
            'Une prière prophétique pour ta Délivrance', 'Vaincre par la Délivrance spirituelle',
            'Délivrance ! Le joug est brisé', 'Délivrance des captifs selon Luc 4',
            'Le sang de Jésus pour notre Délivrance',
        ];

        $accentTitles = [
            'Étude approfondie sur l\'épître aux Éphésiens', 'La Grâce surabondante du Seigneur Jésus-Christ',
            'Culte de Pentecôte extraordinaire', 'Célébration sous la Grâce divine agissante',
            'Éphésiens 6 : Le combat spirituel de l\'Église', 'La Grâce divine au milieu des épreuves',
            'Culte de Pentecôte : Recevoir la puissance de l\'Esprit', 'Sous la Grâce infinie du Père céleste',
            'Méditations sur la Grâce et la vérité', 'Éphésiens : Révélation de notre identité en Christ',
        ];

        $specialTitles = [
            'Foi', 'Grâce', 'Feu !', // Short
            'Une explication théologique et approfondie de la Grâce divine manifestée à travers les âges pour la rédemption complète de l\'humanité entière et la restauration de la communion brisée avec le Créateur suprême', // Very long
            'Prière de Feu & Combat Spirituel : Briser les liens d\'iniquité !', // Special chars
            'Culte Spécial : La Grâce triomphante sur les ténèbres...',
        ];

        // Combine them all
        $customTitles = array_merge($feuTitles, $delivranceTitles, $accentTitles, $specialTitles);

        // Keep counts of custom titles generated to ensure exact targets are met
        $totalCustom = count($customTitles);

        for ($i = 0; $i < $needed; $i++) {
            $title = '';
            if ($i < $totalCustom) {
                $title = $customTitles[$i];
            } else {
                $title = fake()->sentence(fake()->numberBetween(3, 10));
            }

            // Assign status: 70% active/published, 30% draft
            // If total target is 101, 70% is roughly 71 published, 30% is 30 unpublished.
            // Since we top up existing, let's deterministically set is_published to achieve roughly 70/30 ratio for the new records
            $isPublished = ($i % 10 < 7);

            // Temporal distribution: passées (2024, 2025, 2026), aujourd'hui
            $date = null;
            if ($i === 0) {
                // Today
                $date = Carbon::now()->format('Y-m-d');
            } elseif ($i % 3 === 0) {
                // 2024
                $date = Carbon::parse('2024-'.fake()->numberBetween(1, 12).'-'.fake()->numberBetween(1, 28))->format('Y-m-d');
            } elseif ($i % 3 === 1) {
                // 2025
                $date = Carbon::parse('2025-'.fake()->numberBetween(1, 12).'-'.fake()->numberBetween(1, 28))->format('Y-m-d');
            } else {
                // 2026 past/present
                $date = Carbon::parse('2026-'.fake()->numberBetween(1, 6).'-'.fake()->numberBetween(1, 20))->format('Y-m-d');
            }

            // Link randomly to user
            $user = $users->random();

            Sermon::create([
                'title' => $title,
                'series' => fake()->randomElement(['Vivre par la foi', 'Prière de combat', 'Intimité divine', 'Fondations solides']),
                'description' => fake()->paragraph(),
                'speaker' => $user->name,
                'user_id' => $user->id,
                'book' => fake()->randomElement(['Romains', 'Éphésiens', 'Matthieu', 'Psaumes', 'Actes']),
                'books_category' => fake()->randomElement([['Nouveau Testament'], ['Ancien Testament'], ['Épîtres']]),
                'preached_at' => $date,
                'duration' => fake()->numberBetween(35, 65).' min',
                'media_type' => SermonMediaType::VideoUrl,
                'media_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'is_published' => $isPublished,
            ]);
        }
    }

    private function seedEvents(): void
    {
        $existing = Event::count();
        $target = 101;
        $needed = $target - $existing;

        if ($needed <= 0) {
            return;
        }

        // Varied titles with accents/special characters
        $eventTitles = [
            'Culte de Pentecôte mémorable', 'Grande Conférence annuelle de la Grâce',
            'Séminaire intensif sur les Éphésiens', 'Veillée de Feu spirituel',
            'Célébration spéciale de la Grâce divine', 'Prière de Combat & Délivrance',
            'Culte solennel de Pentecôte', 'Conférence : Éphésiens pour notre temps',
            'Séminaire de Délivrance et Guérison', 'Grande Veillée nationale de Feu',
        ];

        for ($i = 0; $i < $needed; $i++) {
            $title = '';
            if ($i < count($eventTitles)) {
                $title = $eventTitles[$i];
            } else {
                $title = fake()->sentence(fake()->numberBetween(3, 8));
            }

            // Status (is_featured): 70% featured/active, 30% not
            $isFeatured = ($i % 10 < 7);

            // Temporal distribution: past, today, future
            $start = null;
            if ($i === 0) {
                // Today
                $start = Carbon::now();
            } elseif ($i % 4 === 0) {
                // 2024 past
                $start = Carbon::parse('2024-'.fake()->numberBetween(1, 12).'-'.fake()->numberBetween(1, 28));
            } elseif ($i % 4 === 1) {
                // 2025 past
                $start = Carbon::parse('2025-'.fake()->numberBetween(1, 12).'-'.fake()->numberBetween(1, 28));
            } elseif ($i % 4 === 2) {
                // 2026 past/present
                $start = Carbon::parse('2026-'.fake()->numberBetween(1, 5).'-'.fake()->numberBetween(1, 28));
            } else {
                // Future dates for Agenda
                $start = Carbon::parse('2026-'.fake()->numberBetween(8, 12).'-'.fake()->numberBetween(1, 28));
            }

            $end = (clone $start)->addHours(3);

            Event::create([
                'title' => $title,
                'slug' => Str::slug($title).'-'.uniqid(),
                'type' => fake()->randomElement(['Veillée', 'Culte', 'Séminaire', 'Conférence']),
                'description' => fake()->paragraph(),
                'location' => fake()->city().', Côte d\'Ivoire',
                'host' => fake()->name(),
                'start_date' => $start,
                'end_date' => $end,
                'image_path' => 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&q=80',
                'highlights' => fake()->sentences(3),
                'is_featured' => $isFeatured,
            ]);
        }
    }

    private function seedBranches($users): void
    {
        $existing = Branch::count();
        $target = 101;
        $needed = $target - $existing;

        if ($needed <= 0) {
            return;
        }

        // Generate branch title variations
        for ($i = 0; $i < $needed; $i++) {
            $city = fake()->unique()->city();
            $title = 'Extension MFM '.$city;

            // Accents / special characters inside titles
            if ($i === 0) {
                $title = 'Extension de Grâce & Bénédiction';
            } elseif ($i === 1) {
                $title = 'Campus des Éphésiens (Pentecôte)';
            }

            Branch::create([
                'title' => $title,
                'slug' => Str::slug($title).'-'.uniqid(),
                'description' => fake()->paragraph(),
                'address' => fake()->address(),
                'phone' => fake()->numerify('+225 0# ## ## ## ##'),
                'hours' => 'Dimanche '.fake()->randomElement(['08h00', '09h00', '10h00']).' · '.fake()->randomElement(['Mardi', 'Mercredi', 'Jeudi']).' 18h30',
                'lat' => fake()->latitude(5.25, 5.45),
                'lng' => fake()->longitude(-4.10, -3.90),
                'website' => fake()->optional()->url(),
                'pastor_id' => $users->random()->id,
            ]);
        }
    }

    private function seedMinistries($users): void
    {
        $existing = Ministry::count();
        $target = 101;
        $needed = $target - $existing;

        if ($needed <= 0) {
            return;
        }

        // Varied titles with accents/special characters
        $ministryNames = [
            'Ministère de Délivrance et Intercession', 'Groupe d\'Étude des Éphésiens',
            'Chorale de la Grâce divine', 'Département de Feu & Combat Spirituel',
            'Ministère d\'Évangélisation de Pentecôte', 'Comité d\'Accueil de Grâce',
        ];

        for ($i = 0; $i < $needed; $i++) {
            $name = '';
            if ($i < count($ministryNames)) {
                $name = $ministryNames[$i];
            } else {
                $name = 'Département '.fake()->unique()->words(2, true);
            }

            // Status (is_active): 70% active, 30% inactive
            $isActive = ($i % 10 < 7);

            Ministry::create([
                'name' => $name,
                'chef_id' => $users->random()->id,
                'description' => fake()->paragraph(),
                'schedule' => fake()->randomElement(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']).' · 18h30',
                'sort_order' => fake()->numberBetween(0, 50),
                'is_active' => $isActive,
            ]);
        }
    }

    private function seedApplications($users): void
    {
        $ministries = Ministry::all();
        $homeGroups = HomeGroup::all();

        if ($homeGroups->isEmpty()) {
            $homeGroups = HomeGroup::factory()->count(10)->create();
        }

        // 5a. MinistryApplications (Exactly 101 records total)
        $existingMinApp = MinistryApplication::count();
        $targetMinApp = 101;
        $neededMinApp = $targetMinApp - $existingMinApp;

        if ($neededMinApp > 0) {
            for ($i = 0; $i < $neededMinApp; $i++) {
                // Status: 70% Approved, 30% Pending/Rejected
                $status = MinistryApplicationStatus::Pending;
                if ($i % 10 < 7) {
                    $status = MinistryApplicationStatus::Approved;
                } elseif ($i % 10 === 8) {
                    $status = MinistryApplicationStatus::Rejected;
                }

                MinistryApplication::create([
                    'user_id' => $users->random()->id,
                    'name' => fake()->name(),
                    'email' => fake()->unique()->safeEmail(),
                    'phone' => fake()->numerify('+225 0# ## ## ## ##'),
                    'ministry_id' => $ministries->random()->id,
                    'motivation' => fake()->paragraph(),
                    'status' => $status,
                    'decision_note' => fake()->sentence(),
                    'decision_note_public' => fake()->boolean(),
                ]);
            }
        }

        // 5b. HomeGroupApplications (Exactly 101 records total)
        $existingHgApp = HomeGroupApplication::count();
        $targetHgApp = 101;
        $neededHgApp = $targetHgApp - $existingHgApp;

        if ($neededHgApp > 0) {
            for ($i = 0; $i < $neededHgApp; $i++) {
                // Status: 70% Approved (approved), 30% Pending (pending)/Rejected (rejected)
                $status = 'pending';
                if ($i % 10 < 7) {
                    $status = 'approved';
                } elseif ($i % 10 === 8) {
                    $status = 'rejected';
                }

                HomeGroupApplication::create([
                    'user_id' => $users->random()->id,
                    'name' => fake()->name(),
                    'email' => fake()->unique()->safeEmail(),
                    'phone' => fake()->numerify('+225 0# ## ## ## ##'),
                    'home_group_id' => $homeGroups->random()->id,
                    'motivation' => fake()->paragraph(),
                    'status' => $status,
                    'processed_by' => $users->random()->id,
                    'decision_note' => fake()->sentence(),
                    'decision_note_public' => fake()->boolean(),
                ]);
            }
        }
    }
}
