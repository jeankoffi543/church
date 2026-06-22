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
            ['key' => 'contact_subjects', 'group' => 'contact', 'value' => ['Question générale', 'Sujet de prière', 'Témoignage', 'Autre']],

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

            // ── Phase 8 · Prayers ─────────────────────────────
            ['key' => 'prayer_success_ui_message', 'group' => 'prayers', 'value' => 'Merci ! Votre requête est entrée dans la chaîne d\'intercession de MFM Ficgayo. Notre équipe prie pour vous et vous contactera bientôt.'],
            ['key' => 'prayer_automated_notification_message', 'group' => 'prayers', 'value' => 'Bonjour {{name}}, l\'équipe d\'intercession de MFM Ficgayo a bien reçu votre demande de prière concernant « {{category}} ». Soyez assuré(e) que nous prions avec ferveur pour vous. — MFM Ficgayo'],
            ['key' => 'prayer_categories', 'group' => 'prayers', 'value' => ['Délivrance', 'Santé', 'Finances', 'Famille', 'Destinée', 'Autre']],

            // ── Presentation & Pastor Long Message ────────────────────
            [
                'key' => 'church_presentation_banner',
                'group' => 'eglise',
                'value' => [
                    'eyebrow' => 'Présentation MFM Ficgayo',
                    'quote' => '« Soyez les bienvenus sur cette page Prophétique... »',
                    'short_description' => 'Découvrez l\'exhortation prophétique du Pasteur David Odion Victor sur la puissance...',
                    'button_text' => 'Lire le message',
                ],
            ],
            [
                'key' => 'pastor_long_message',
                'group' => 'eglise',
                'value' => [
                    'preacher_id' => 1,
                    'custom_eyebrow' => 'Message de Bienvenue',
                    'custom_title' => 'Mot du Surintendant Régional',
                    'guarantees_title' => 'En parcourant ce site, 3 choses vous sont prophétiquement garanties :',
                    'guarantees_list' => [
                        'Le salut de votre âme.',
                        'La délivrance de toute forme d’oppression et de possession.',
                        'Une grande grâce saisira votre vie au nom de JÉSUS. (Actes 4:33)',
                    ],
                    'html_content' => '<p class="mt-8 text-justify font-medium">S’il vous plaît, lisez attentivement ceci :</p>' .
                        '<p class="text-justify"><strong class="text-indigo">Actes 3:1</strong> — Une chose miraculeuse se produisit dans la vie d’un homme né boiteux depuis le sein de sa mère.</p>' .
                        '<blockquote class="border-l-4 border-gold-dark bg-indigo-mid/[0.04] p-4 rounded-r-xl italic text-indigo font-display text-left">« Verset 1 — Pierre et Jean montèrent ensemble au temple à l’heure de la prière... »</blockquote>' .
                        '<p class="text-justify font-bold text-indigo mt-4">Notons ces deux expressions :</p>' .
                        '<div class="space-y-4 pl-4 border-l-2 border-white/60">' .
                        '<p class="text-justify">• <strong class="text-indigo">Ils montèrent... :</strong> Frères et sœurs, lorsque vous cultivez un style de vie à savoir « la vie de prière », vous êtes connecté au DIEU qui est dans les cieux. Autrement dit, un chrétien qui prie s’élève à un niveau au-dessus de ses ennemis.</p>' .
                        '<p class="text-justify">• <strong class="text-indigo">Ils montèrent... volant comme des aigles :</strong> Toujours au verset 1, « ...au temple à l’heure de la prière ». Bien-aimés, une église qui ne prie pas est une église morte ; JÉSUS a dit : <span class="italic">« ma maison sera appelée une maison de prière »</span>.</p>' .
                        '</div>' .
                        '<p class="text-justify">Le Ministère de la Montagne de Feu et des Miracles (MFM) est une église de prière où vos mains sont exercées à la guerre et vos doigts au combat. Votre temps de prière est votre temps de puissance, votre temps de prière est votre temps de connexion, votre temps de prière est votre temps d’intimité. Une intimité avec le Saint-Esprit sous-entend que rien ne pourra s’introduire dans votre temps de prière.</p>' .
                        '<p class="text-justify"><strong class="text-indigo">Verset 2</strong> — Et un certain « homme qui était boiteux de naissance », depuis l’utérus de sa mère. C’est étrange que la vie et la destinée de cet homme aient été défigurées depuis l’utérus de sa mère. Le livre de Jean parle également d’un homme aveugle de naissance.</p>' .
                        '<div class="my-6 rounded-xl border border-indigo-mid/10 bg-indigo-mid/[0.02] p-5 space-y-3">' .
                        '<p class="flex items-center gap-2 font-semibold text-indigo">Bien-aimés, posez-vous ces questions :</p>' .
                        '<ul class="list-disc pl-5 space-y-2 text-justify text-sm">' .
                        '<li>Savez-vous que votre vie débute 5 minutes après la conception ?</li>' .
                        '<li>Savez-vous que depuis l’utérus, le voyage de la vie commence ?</li>' .
                        '<li>Savez-vous que le choix Divin se fait depuis l’utérus ? <span class="text-[#c8902e] font-mono text-xs">(Jérémie 1:5, Jérémie a été sanctifié et choisi depuis le sein maternel)</span>.</li>' .
                        '<li>Savez-vous que la gloire d’une personne peut être avalée déjà étant dans l’utérus ?</li>' .
                        '</ul>' .
                        '</div>' .
                        '<p class="text-justify">Peut-être que cet homme avait été, depuis l’utérus, prédestiné par le Seigneur à être un médecin ou un prophète, mais à cause de la négligence et de l’ignorance de ses parents, l’ennemi l’a rendu boiteux.</p>' .
                        '<p class="text-justify">Que peut un homme qui est boiteux, si ce n’est de mendier pour survivre ? Certains parmi nous étaient supposés survoler et parcourir les nations, mais l’ennemi a eu accès à nous déjà étant dans le sein maternel et a porté sur nous ses actes de méchanceté.</p>' .
                        '<p class="font-semibold text-indigo">Faisons une pause et prions ensemble :</p>' .
                        '<div class="rounded-2xl border border-red-500/20 bg-ink p-5 text-center shadow-lg relative overflow-hidden my-4">' .
                        '<div class="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold tracking-wider text-red-400 uppercase">Point de prière</div>' .
                        '<p class="mt-2 font-display text-base md:text-lg font-bold italic text-white leading-relaxed">« Tout pouvoir qui a paralysé ma destinée depuis l’utérus, laisse-moi aller et meurs au nom de JÉSUS ! »</p>' .
                        '</div>' .
                        '<p class="text-justify">Ce même homme était transporté « ...tous les jours à la porte du temple appelée la Belle, pour qu’il demande l’aumône ».</p>' .
                        '<p class="text-justify">Peut-être que ses parents donnaient l’impression de l’aider mais en réalité ils l’utilisaient pour mendier. Comme c’est triste. Il m’est arrivé de voir des parents donner l’impression d’aider la personne qu’ils accompagnaient mais en réalité ils étaient la source du problème. J’ai vu une mère trimballer son jeune homme chez les prophètes alors qu’elle était à la base du problème de son fils qui souffrait d’insuffisance rénale. Quelle méchanceté.</p>' .
                        '<div class="rounded-2xl border border-red-500/20 bg-ink p-5 text-center shadow-lg relative overflow-hidden my-4">' .
                        '<div class="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold tracking-wider text-red-400 uppercase">Point de prière</div>' .
                        '<p class="mt-2 font-display text-base md:text-lg font-bold italic text-white leading-relaxed">« Tout pouvoir qui utilise ma gloire pour prospérer, meurs au nom de JÉSUS ! »</p>' .
                        '</div>' .
                        '<p class="text-justify">Le mystère est ceci : ses parents le transportaient à la porte et entraient dans le temple. Quand ils en sortaient, ils récupéraient son dû et le ramenaient à la maison. C’est-à-dire qu’à cet âge, il vivait encore avec ses parents, vu que la Bible ne fait mention nulle part de sa femme et de ses enfants ; il n’avait encore rien accompli dans sa vie.</p>' .
                        '<p class="text-justify">C’est le cas de plusieurs qui, jusqu’à un certain âge, n’arrivent pas à accomplir quelque chose dans la vie parce qu’il y a des pouvoirs qui traitent avec eux et qui dispersent ce qu’ils rassemblent. Cet homme a souffert plusieurs années durant. Pourquoi la Bible l’a appelé « l’homme » ? Je pense qu’il devait être âgé de 40 ans et plus. N’ayant pas de solution, il était un instrument de subsistance pour sa famille.</p>' .
                        '<p class="text-justify font-bold text-indigo italic">Je prophétise dans la vie de tous ceux dont la destinée est boiteuse depuis la naissance : par le pouvoir qui a ressuscité JÉSUS-CHRIST du tombeau, lève-toi et commence à marcher, à courir et à t’envoler au nom de JÉSUS !</p>' .
                        '<p class="text-justify"><strong class="text-indigo">Verset 6</strong> — « Pierre dit : Je n’ai ni argent ni or... » Cet homme demandait de l’argent ou de l’or, mais il reçut au-delà de ce qu’il avait demandé. Pierre dit : <span class="italic">« ce que j’ai, je te le donne ; au nom de JÉSUS-CHRIST de Nazareth, lève-toi et marche »</span>.</p>' .
                        '<p class="text-justify"><strong class="text-indigo">Verset 7</strong> — « Et le prenant par la main droite, il le fit lever. Au même instant, ses pieds et les os de sa cheville devinrent fermes. » Pierre, en lui prenant la main droite, avait posé un acte violent de foi.</p>' .
                        '<p class="text-justify">La révélation libère la foi et la foi libère les miracles. Pierre eut la révélation sur le nom de JÉSUS-CHRIST, il l’utilisa avec foi et elle produisit le résultat escompté. Le nom de JÉSUS-CHRIST is chargé de pouvoir. Le nom de JÉSUS apporte la délivrance, la guérison et la restauration. Le nom de JÉSUS-CHRIST donne accès à la bénédiction de DIEU.</p>' .
                        '<p class="text-justify">Le nom de JÉSUS nous positionne au-dessus de toutes les principautés, des pouvoirs et de la méchanceté spirituelle dans les lieux élevés. Le diable fléchit le genou lorsque le nom de JÉSUS est invoqué. Le nom de JÉSUS brise toutes les barrières et enlève toutes les limitations. Le nom de JÉSUS provoque le tremblement de terre et le tonnerre dans le camp de l’ennemi.</p>' .
                        '<p class="text-justify"><strong class="text-indigo">Verset 8</strong> — « Et se tint debout d’un bond, et marcha, et entra avec eux dans le temple, marchant, sautant et louant DIEU. » Quel grand miracle. Depuis l’enfance, cet homme avait vu des hommes et des femmes entrer dans le temple sans pouvoir y entrer lui-même parce qu’il était infirme boiteux. Pendant que les gens priaient à l’intérieur du temple, il ne le pouvait pas parce qu’il était boiteux. Son problème l’a retenu hors de la présence de DIEU. Son problème lui fermait la porte de la gloire. À peine reçut-il sa délivrance qu’il se précipita dans le temple, vu qu’il attendait ce moment depuis toujours.</p>' .
                        '<p class="text-justify font-bold text-indigo italic">Comme quelqu’un lit ces paroles, je prie que les miracles majeurs qui vont fermer la bouche de vos moqueurs, vous les receviez au nom de JÉSUS ! Le miracle majeur qui amènera les hommes et les femmes à louer DIEU, recevez-le au nom de JÉSUS ! Le DIEU des nouvelles choses se manifestera d’une nouvelle manière dans votre vie, au nom de JÉSUS !</p>' .
                        '<p class="text-justify">Cet homme a reçu des injures dans sa vie, vu que tous ne lui donnaient pas de l’argent ; je prie que vos insultes se transforment en résultats positifs dans votre vie. Cet homme était assis à la porte appelée Belle mais faisait face à des luttes. Certains viennent à l’église bien vêtus mais souffrent de l’intérieur. D’autres montrent une face de bien-être mais confrontent des difficultés en secret. Certains donnent l’apparence de briller mais sont infirmes boiteux à l’intérieur.</p>' .
                        '<p class="text-justify font-bold text-indigo">Je prie que le pouvoir qui a relevé cet homme vous relève et, alors que vous parcourez ce site, vous receviez votre délivrance au nom de JÉSUS. Amen.</p>',
                ],
            ],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'], 'group' => $setting['group']],
            );
        }
    }
}
