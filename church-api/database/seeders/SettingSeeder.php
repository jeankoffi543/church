<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Seed every key-value setting across phases 1, 4, 5 and 6.
     */
    public function run(): void
    {
        $settings = [
            // ── Phase 1 · Landing — general texts ──────────────────────
            ['key' => 'church_name', 'group' => 'general', 'value' => '✦ Église MFM Ficgayo ✦'],
            ['key' => 'hero_title', 'group' => 'general', 'value' => 'Bienvenue à la Maison'],
            ['key' => 'hero_description', 'group' => 'general', 'value' => 'Un lieu de grâce, de feu et de miracles. Peu importe ton histoire, il y a une place pour toi à cette table.'],

            // ── Phase 1 · Fixed weekly schedule ────────────────────────
            ['key' => 'weekly_schedule', 'group' => 'schedule', 'value' => [
                ['day' => 'DIMANCHE', 'time' => '09:00', 'label' => 'Culte principal'],
                ['day' => 'MARDI', 'time' => '18:30', 'label' => 'Étude biblique'],
                ['day' => 'VENDREDI', 'time' => '22:00', 'label' => 'Veillée de prière'],
            ]],

            // ── Phase 1 · Offerings / "Semer" ──────────────────────────
            ['key' => 'offering_methods', 'group' => 'offerings', 'value' => ['VISA', 'Mastercard', 'Orange Money', 'Wave']],
            ['key' => 'offering_types', 'group' => 'offerings', 'value' => [
                ['key' => 'dime', 'label' => 'Dîme'],
                ['key' => 'offrande', 'label' => 'Offrande'],
                ['key' => 'projet', 'label' => 'Projet Maison de Feu'],
                ['key' => 'missions', 'label' => 'Missions'],
            ]],
            ['key' => 'offering_presets', 'group' => 'offerings', 'value' => [2000, 5000, 10000, 20000]],
            ['key' => 'offering_custom_limits', 'group' => 'offerings', 'value' => ['min' => 500, 'max' => 5000000]],
            ['key' => 'offering_currency', 'group' => 'offerings', 'value' => 'FCFA'],

            // ── Phase 4 & 5 · Footer & Contact ─────────────────────────
            ['key' => 'socials', 'group' => 'contact', 'value' => [
                ['label' => 'Facebook', 'url' => 'https://facebook.com/mfmficgayo'],
                ['label' => 'YouTube', 'url' => 'https://youtube.com/@mfmficgayo'],
                ['label' => 'Instagram', 'url' => 'https://instagram.com/mfmficgayo'],
            ]],
            ['key' => 'address', 'group' => 'contact', 'value' => ['Yopougon Ficgayo', "Abidjan, Côte d'Ivoire"]],
            ['key' => 'phones', 'group' => 'contact', 'value' => ['+225 07 00 00 00 00']],
            ['key' => 'emails', 'group' => 'contact', 'value' => ['bonjour@mfm-ficgayo.ci']],
            ['key' => 'map_hint', 'group' => 'contact', 'value' => 'Abidjan · Yopougon & environs'],
            ['key' => 'legal_mentions', 'group' => 'contact', 'value' => '© 2026 Église MFM Ficgayo. Tous droits réservés.'],

            // ── Phase 6 · Live / streaming ─────────────────────────────
            ['key' => 'live_embed_url', 'group' => 'live', 'value' => 'https://www.youtube.com/embed/live_stream?channel=MFM'],
            ['key' => 'live_status', 'group' => 'live', 'value' => false],
            ['key' => 'live_chat_enabled', 'group' => 'live', 'value' => true],
            ['key' => 'live_title', 'group' => 'live', 'value' => 'Culte du dimanche'],
            ['key' => 'live_description', 'group' => 'live', 'value' => 'Diffusion en direct depuis le temple principal MFM Ficgayo'],
            ['key' => 'live_sermon_title', 'group' => 'live', 'value' => 'La grâce qui transforme'],
            ['key' => 'live_sermon_reference', 'group' => 'live', 'value' => 'Romains 5.1-11'],
            ['key' => 'live_sermon_points', 'group' => 'live', 'value' => [
                ['id' => '01', 'text' => 'Justifiés par la foi, nous avons la paix avec Dieu', 'verse' => 'Romains 5.1'],
                ['id' => '02', 'text' => 'Par lui nous avons accès à cette grâce', 'verse' => 'Romains 5.2'],
                ['id' => '03', 'text' => 'Nous nous glorifions même dans la tribulation', 'verse' => 'Romains 5.3-4'],
                ['id' => '04', 'text' => 'L\'amour de Dieu répandu dans nos cœurs', 'verse' => 'Romains 5.5'],
                ['id' => '05', 'text' => 'Christ est mort pour nous, pécheurs', 'verse' => 'Romains 5.8'],
            ]],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'], 'group' => $setting['group']],
            );
        }
    }
}
