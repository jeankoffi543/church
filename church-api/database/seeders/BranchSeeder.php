<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        $pastors = User::take(4)->get();
        $adminPastor = $pastors->first();

        $branches = [
            [
                'title' => 'Siège de Yopougon Ficgayo',
                'slug' => 'siege-yopougon-ficgayo',
                'description' => 'Le temple principal et le cœur spirituel de la région MFM Ficgayo. Un lieu de combat spirituel, de délivrance et de prières de feu.',
                'address' => 'Yopougon Ficgayo, Abidjan',
                'phone' => '+225 07 00 00 00 00',
                'hours' => 'Dimanche 09h00 · Mardi 18h30 · Vendredi 22h00',
                'lat' => 5.348633,
                'lng' => -4.072223,
                'website' => 'https://mfm-ficgayo.ci',
                'pastor_id' => $adminPastor?->id,
            ],
            [
                'title' => 'Extension Cocody Angré',
                'slug' => 'extension-cocody-angre',
                'description' => 'Notre branche dynamique située à Cocody Angré, accueillant tous les croyants pour des moments intenses d’intercession.',
                'address' => 'Cocody Angré, Abidjan',
                'phone' => '+225 05 11 11 11 11',
                'hours' => 'Dimanche 08h30 · Mercredi 18h00',
                'lat' => 5.405781,
                'lng' => -3.979342,
                'website' => null,
                'pastor_id' => $pastors->skip(1)->first()?->id ?? $adminPastor?->id,
            ],
            [
                'title' => 'Extension Marcory Zone 4',
                'slug' => 'extension-marcory-zone-4',
                'description' => 'Un campus dynamique au sud d’Abidjan pour propager la prière de feu et restaurer les vies brisées.',
                'address' => 'Marcory Zone 4, Abidjan',
                'phone' => '+225 01 22 22 22 22',
                'hours' => 'Dimanche 10h00 · Jeudi 18h30',
                'lat' => 5.312984,
                'lng' => -3.985921,
                'website' => null,
                'pastor_id' => $pastors->skip(2)->first()?->id ?? $adminPastor?->id,
            ],
            [
                'title' => 'Extension Abobo Sogephia',
                'slug' => 'extension-abobo-sogephia',
                'description' => 'La maison de feu à Abobo pour des prières prophétiques et l’édification spirituelle des familles.',
                'address' => 'Abobo Sogephia, Abidjan',
                'phone' => '+225 07 33 33 33 33',
                'hours' => 'Dimanche 08h00 · Mardi 18h00',
                'lat' => 5.419082,
                'lng' => -4.015243,
                'website' => null,
                'pastor_id' => $pastors->skip(3)->first()?->id ?? $adminPastor?->id,
            ],
        ];

        foreach ($branches as $branch) {
            Branch::updateOrCreate(
                ['slug' => $branch['slug']],
                $branch
            );
        }
    }
}
