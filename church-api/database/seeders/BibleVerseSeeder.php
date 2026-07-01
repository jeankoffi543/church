<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * A curated, accurate starter set of well-known public-domain Louis Segond 1910
 * verses — enough for the Live Studio search, version list and "verset suivant"
 * / "chapitre suivant" navigation to work out of the box, with contiguous runs
 * (Psaume 23, Jean 3:16-17, 1 Corinthiens 13:4-7, Philippiens 4:6-7…).
 *
 * Load a full multi-version Bible with `php artisan bible:import path/to/bible.json`.
 */
class BibleVerseSeeder extends Seeder
{
    public function run(): void
    {
        $translation = 'LSG';

        /** @var array<int, array{0:string,1:int,2:int,3:string}> $verses */
        $verses = [
            ['Genèse', 1, 1, 'Au commencement, Dieu créa les cieux et la terre.'],

            ['Josué', 1, 9, "Ne t'ai-je pas donné cet ordre : Fortifie-toi et prends courage ? Ne t'effraie point et ne t'épouvante point, car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras."],

            ['Proverbes', 3, 5, "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse ;"],
            ['Proverbes', 3, 6, 'reconnais-le dans toutes tes voies, et il aplanira tes sentiers.'],

            ['Psaumes', 23, 1, "L'Éternel est mon berger : je ne manquerai de rien."],
            ['Psaumes', 23, 2, 'Il me fait reposer dans de verts pâturages, il me dirige près des eaux paisibles.'],
            ['Psaumes', 23, 3, 'Il restaure mon âme, il me conduit dans les sentiers de la justice, à cause de son nom.'],
            ['Psaumes', 23, 4, "Quand je marche dans la vallée de l'ombre de la mort, je ne crains aucun mal, car tu es avec moi : ta houlette et ton bâton me rassurent."],
            ['Psaumes', 23, 5, "Tu dresses devant moi une table, en face de mes adversaires ; tu oins d'huile ma tête, et ma coupe déborde."],
            ['Psaumes', 23, 6, "Oui, le bonheur et la grâce m'accompagneront tous les jours de ma vie, et j'habiterai dans la maison de l'Éternel jusqu'à la fin de mes jours."],

            ['Psaumes', 46, 1, 'Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans la détresse.'],
            ['Psaumes', 91, 1, "Celui qui demeure sous l'abri du Très-Haut repose à l'ombre du Tout-Puissant."],
            ['Psaumes', 121, 1, 'Je lève mes yeux vers les montagnes… D\'où me viendra le secours ?'],
            ['Psaumes', 121, 2, 'Le secours me vient de l\'Éternel, qui a fait les cieux et la terre.'],

            ['Ésaïe', 40, 31, "Mais ceux qui se confient en l'Éternel renouvellent leur force. Ils prennent le vol comme les aigles ; ils courent, et ne se lassent point, ils marchent, et ne se fatiguent point."],
            ['Ésaïe', 41, 10, 'Ne crains rien, car je suis avec toi ; ne promène pas des regards inquiets, car je suis ton Dieu ; je te fortifie, je viens à ton secours, je te soutiens de ma droite triomphante.'],

            ['Jérémie', 29, 11, "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance."],

            ['Matthieu', 6, 33, 'Cherchez premièrement le royaume et la justice de Dieu ; et toutes ces choses vous seront données par-dessus.'],
            ['Matthieu', 11, 28, 'Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.'],
            ['Matthieu', 11, 29, 'Prenez mon joug sur vous et recevez mes instructions, car je suis doux et humble de cœur ; et vous trouverez du repos pour vos âmes.'],
            ['Matthieu', 11, 30, 'Car mon joug est doux, et mon fardeau léger.'],
            ['Matthieu', 28, 19, 'Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit,'],
            ['Matthieu', 28, 20, 'et enseignez-leur à observer tout ce que je vous ai prescrit. Et voici, je suis avec vous tous les jours, jusqu\'à la fin du monde.'],

            ['Jean', 1, 1, 'Au commencement était la Parole, et la Parole était avec Dieu, et la Parole était Dieu.'],
            ['Jean', 3, 16, "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle."],
            ['Jean', 3, 17, "Dieu, en effet, n'a pas envoyé son Fils dans le monde pour qu'il juge le monde, mais pour que le monde soit sauvé par lui."],
            ['Jean', 8, 12, 'Jésus leur parla de nouveau, et dit : Je suis la lumière du monde ; celui qui me suit ne marchera pas dans les ténèbres, mais il aura la lumière de la vie.'],
            ['Jean', 14, 6, 'Jésus lui dit : Je suis le chemin, la vérité, et la vie. Nul ne vient au Père que par moi.'],
            ['Jean', 15, 5, 'Je suis le cep, vous êtes les sarments. Celui qui demeure en moi et en qui je demeure porte beaucoup de fruit, car sans moi vous ne pouvez rien faire.'],

            ['Romains', 5, 8, 'Mais Dieu prouve son amour envers nous, en ce que, lorsque nous étions encore des pécheurs, Christ est mort pour nous.'],
            ['Romains', 8, 28, 'Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein.'],
            ['Romains', 8, 38, "Car j'ai l'assurance que ni la mort ni la vie, ni les anges ni les dominations, ni les choses présentes ni les choses à venir, ni les puissances,"],
            ['Romains', 8, 39, "ni la hauteur, ni la profondeur, ni aucune autre créature ne pourra nous séparer de l'amour de Dieu manifesté en Jésus-Christ notre Seigneur."],
            ['Romains', 10, 9, "Si tu confesses de ta bouche le Seigneur Jésus, et si tu crois dans ton cœur que Dieu l'a ressuscité des morts, tu seras sauvé."],
            ['Romains', 12, 2, "Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l'intelligence, afin que vous discerniez quelle est la volonté de Dieu, ce qui est bon, agréable et parfait."],

            ['1 Corinthiens', 13, 4, "La charité est patiente, elle est pleine de bonté ; la charité n'est point envieuse ; la charité ne se vante point, elle ne s'enfle point d'orgueil,"],
            ['1 Corinthiens', 13, 5, "elle ne fait rien de malhonnête, elle ne cherche point son intérêt, elle ne s'irrite point, elle ne soupçonne point le mal,"],
            ['1 Corinthiens', 13, 6, 'elle ne se réjouit point de l\'injustice, mais elle se réjouit de la vérité ;'],
            ['1 Corinthiens', 13, 7, 'elle excuse tout, elle croit tout, elle espère tout, elle supporte tout.'],

            ['2 Corinthiens', 5, 17, "Si quelqu'un est en Christ, il est une nouvelle créature. Les choses anciennes sont passées ; voici, toutes choses sont devenues nouvelles."],

            ['Galates', 2, 20, "J'ai été crucifié avec Christ ; et si je vis, ce n'est plus moi qui vis, c'est Christ qui vit en moi ; si je vis maintenant dans la chair, je vis dans la foi au Fils de Dieu, qui m'a aimé et qui s'est livré lui-même pour moi."],

            ['Éphésiens', 2, 8, "Car c'est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c'est le don de Dieu."],
            ['Éphésiens', 2, 9, 'Ce n\'est point par les œuvres, afin que personne ne se glorifie.'],

            ['Philippiens', 4, 6, 'Ne vous inquiétez de rien ; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces.'],
            ['Philippiens', 4, 7, 'Et la paix de Dieu, qui surpasse toute intelligence, gardera vos cœurs et vos pensées en Jésus-Christ.'],
            ['Philippiens', 4, 13, 'Je puis tout par celui qui me fortifie.'],
            ['Philippiens', 4, 19, 'Et mon Dieu pourvoira à tous vos besoins selon sa richesse, avec gloire, en Jésus-Christ.'],

            ['Hébreux', 11, 1, "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas."],
            ['Hébreux', 13, 8, 'Jésus-Christ est le même hier, aujourd\'hui, et éternellement.'],

            ['Jacques', 1, 2, 'Mes frères, regardez comme un sujet de joie complète les diverses épreuves auxquelles vous pouvez être exposés,'],
            ['Jacques', 1, 3, 'sachant que l\'épreuve de votre foi produit la patience.'],

            ['1 Pierre', 5, 7, 'et déchargez-vous sur lui de tous vos soucis, car lui-même prend soin de vous.'],

            ['1 Jean', 1, 9, 'Si nous confessons nos péchés, il est fidèle et juste pour nous les pardonner, et pour nous purifier de toute iniquité.'],
            ['1 Jean', 4, 8, 'Celui qui n\'aime pas n\'a pas connu Dieu, car Dieu est amour.'],

            ['Apocalypse', 3, 20, "Voici, je me tiens à la porte, et je frappe. Si quelqu'un entend ma voix et ouvre la porte, j'entrerai chez lui, je souperai avec lui, et lui avec moi."],
            ['Apocalypse', 21, 4, "Il essuiera toute larme de leurs yeux, et la mort ne sera plus, et il n'y aura plus ni deuil, ni cri, ni douleur, car les premières choses ont disparu."],
        ];

        $now = now();
        $rows = array_map(fn (array $v): array => [
            'book' => $v[0],
            'chapter' => $v[1],
            'verse' => $v[2],
            'text' => $v[3],
            'translation' => $translation,
            'created_at' => $now,
            'updated_at' => $now,
        ], $verses);

        DB::table('bible_verses')->upsert(
            $rows,
            ['translation', 'book', 'chapter', 'verse'],
            ['text', 'updated_at']
        );
    }
}
