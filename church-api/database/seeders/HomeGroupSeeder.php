<?php

namespace Database\Seeders;

use App\Models\HomeGroup;
use Illuminate\Database\Seeder;

class HomeGroupSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            ['name' => 'Cellule Bethel', 'leader' => 'Fr. Jean Koffi', 'address' => 'Yopougon Ficgayo', 'schedule' => 'Mardi · 19h00', 'coordinates' => ['top' => '46%', 'left' => '28%']],
            ['name' => 'Cellule Sion', 'leader' => 'Sr. Marie Aka', 'address' => 'Cocody Angré', 'schedule' => 'Mercredi · 18h30', 'coordinates' => ['top' => '30%', 'left' => '64%']],
            ['name' => 'Cellule Emmanuel', 'leader' => 'Fr. Paul Diby', 'address' => 'Abobo', 'schedule' => 'Jeudi · 19h00', 'coordinates' => ['top' => '20%', 'left' => '42%']],
            ['name' => 'Cellule Shalom', 'leader' => 'Sr. Grâce Obi', 'address' => 'Marcory', 'schedule' => 'Vendredi · 19h00', 'coordinates' => ['top' => '68%', 'left' => '58%']],
        ];

        foreach ($groups as $index => $group) {
            HomeGroup::updateOrCreate(
                ['name' => $group['name']],
                [...$group, 'sort_order' => $index, 'is_active' => true],
            );
        }
    }
}
