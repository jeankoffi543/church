<?php

namespace Database\Seeders;

use App\Models\HomeGroup;
use Illuminate\Database\Seeder;

class HomeGroupSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            ['name' => 'Cellule Bethel', 'leader' => 'Fr. Jean Koffi', 'address' => 'Yopougon Ficgayo, Rue des Jardins', 'zone_name' => 'Yopougon', 'meeting_day' => 'Mardi', 'meeting_time' => '19h00', 'schedule' => 'Mardi · 19h00', 'latitude' => 5.3358, 'longitude' => -4.0846, 'coordinates' => ['top' => '46%', 'left' => '28%']],
            ['name' => 'Cellule Sion', 'leader' => 'Sr. Marie Aka', 'address' => 'Cocody Angré 7e Tranche', 'zone_name' => 'Cocody', 'meeting_day' => 'Mercredi', 'meeting_time' => '18h30', 'schedule' => 'Mercredi · 18h30', 'latitude' => 5.3955, 'longitude' => -3.9870, 'coordinates' => ['top' => '30%', 'left' => '64%']],
            ['name' => 'Cellule Emmanuel', 'leader' => 'Fr. Paul Diby', 'address' => 'Abobo Avocatier', 'zone_name' => 'Abobo', 'meeting_day' => 'Jeudi', 'meeting_time' => '19h00', 'schedule' => 'Jeudi · 19h00', 'latitude' => 5.4291, 'longitude' => -4.0159, 'coordinates' => ['top' => '20%', 'left' => '42%']],
            ['name' => 'Cellule Shalom', 'leader' => 'Sr. Grâce Obi', 'address' => 'Marcory Résidentiel', 'zone_name' => 'Marcory', 'meeting_day' => 'Vendredi', 'meeting_time' => '19h00', 'schedule' => 'Vendredi · 19h00', 'latitude' => 5.2972, 'longitude' => -3.9876, 'coordinates' => ['top' => '68%', 'left' => '58%']],
            ['name' => 'Cellule Rehoboth', 'leader' => 'Fr. Éric Tanoh', 'address' => 'Treichville Arras', 'zone_name' => 'Treichville', 'meeting_day' => 'Vendredi', 'meeting_time' => '18h00', 'schedule' => 'Vendredi · 18h00', 'latitude' => 5.2925, 'longitude' => -4.0078, 'coordinates' => ['top' => '72%', 'left' => '48%']],
            ['name' => 'Cellule Galilée', 'leader' => 'Sr. Esther Bamba', 'address' => 'Cocody Riviera Palmeraie', 'zone_name' => 'Cocody', 'meeting_day' => 'Mardi', 'meeting_time' => '18h30', 'schedule' => 'Mardi · 18h30', 'latitude' => 5.3686, 'longitude' => -3.9543, 'coordinates' => ['top' => '34%', 'left' => '72%']],
            ['name' => 'Cellule Patmos', 'leader' => 'Fr. Serge Koné', 'address' => 'Yopougon Niangon', 'zone_name' => 'Yopougon', 'meeting_day' => 'Jeudi', 'meeting_time' => '19h30', 'schedule' => 'Jeudi · 19h30', 'latitude' => 5.3490, 'longitude' => -4.1006, 'coordinates' => ['top' => '40%', 'left' => '22%']],
            ['name' => 'Cellule Carmel', 'leader' => 'Sr. Ruth Yao', 'address' => 'Abobo Baoulé', 'zone_name' => 'Abobo', 'meeting_day' => 'Mercredi', 'meeting_time' => '19h00', 'schedule' => 'Mercredi · 19h00', 'latitude' => 5.4377, 'longitude' => -4.0291, 'coordinates' => ['top' => '16%', 'left' => '38%']],
        ];

        foreach ($groups as $index => $group) {
            HomeGroup::updateOrCreate(
                ['name' => $group['name']],
                [...$group, 'sort_order' => $index, 'is_active' => true],
            );
        }
    }
}
