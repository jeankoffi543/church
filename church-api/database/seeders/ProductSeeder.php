<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'title' => "Bible d'étude « Maison du Feu »",
                'slug' => 'bible-detude-maison-du-feu',
                'description' => "Une Bible d'étude complète pour approfondir votre marche spirituelle et méditer la Parole de Dieu au quotidien.",
                'base_price' => 25000,
                'old_price' => null,
                'category' => 'Livres',
                'badge' => 'Vedette',
                'is_digital' => false,
                'is_featured' => true,
                'status' => 'active',
                'images' => [
                    'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=80&auto=format&fit=crop',
                ],
                'attributes' => [
                    [
                        'name' => 'Couleur',
                        'type' => 'color',
                        'values' => ['#160f33', '#c8902e', '#c9536b'],
                    ],
                ],
                'variants' => [
                    [
                        'id' => 'v-bible-indigo',
                        'sku' => 'BIB-MDF-IND',
                        'price_override' => null,
                        'stock_count' => 15,
                        'attributes' => ['Couleur' => '#160f33'],
                    ],
                    [
                        'id' => 'v-bible-or',
                        'sku' => 'BIB-MDF-OR',
                        'price_override' => 28000,
                        'stock_count' => 10,
                        'attributes' => ['Couleur' => '#c8902e'],
                    ],
                    [
                        'id' => 'v-bible-rouge',
                        'sku' => 'BIB-MDF-RG',
                        'price_override' => null,
                        'stock_count' => 10,
                        'attributes' => ['Couleur' => '#c9536b'],
                    ],
                ],
            ],
            [
                'title' => 'Recueil « Vivre par la Foi »',
                'slug' => 'recueil-vivre-par-la-foi',
                'description' => 'Recueil de cantiques, prières et témoignages inspirants pour fortifier votre foi chrétienne.',
                'base_price' => 12000,
                'old_price' => 15000,
                'category' => 'Livres',
                'badge' => 'Nouveau',
                'is_digital' => false,
                'is_featured' => false,
                'status' => 'active',
                'images' => [
                    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80&auto=format&fit=crop',
                ],
                'attributes' => [],
                'variants' => [],
            ],
            [
                'title' => 'T-shirt « Génération Feu »',
                'slug' => 't-shirt-generation-feu',
                'description' => 'T-shirt premium en coton bio, arborant fièrement le logo de la Génération Feu.',
                'base_price' => 9000,
                'old_price' => null,
                'category' => 'Vêtements',
                'badge' => null,
                'is_digital' => false,
                'is_featured' => true,
                'status' => 'active',
                'images' => [
                    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80&auto=format&fit=crop',
                ],
                'attributes' => [
                    [
                        'name' => 'Taille',
                        'type' => 'text',
                        'values' => ['S', 'M', 'L', 'XL'],
                    ],
                    [
                        'name' => 'Couleur',
                        'type' => 'color',
                        'values' => ['#ffffff', '#160f33', '#c9536b'],
                    ],
                ],
                'variants' => [
                    [
                        'id' => 'v-tshirt-s-blanc',
                        'sku' => 'TSH-GF-S-BL',
                        'price_override' => null,
                        'stock_count' => 20,
                        'attributes' => ['Taille' => 'S', 'Couleur' => '#ffffff'],
                    ],
                    [
                        'id' => 'v-tshirt-m-blanc',
                        'sku' => 'TSH-GF-M-BL',
                        'price_override' => null,
                        'stock_count' => 25,
                        'attributes' => ['Taille' => 'M', 'Couleur' => '#ffffff'],
                    ],
                    [
                        'id' => 'v-tshirt-l-blanc',
                        'sku' => 'TSH-GF-L-BL',
                        'price_override' => null,
                        'stock_count' => 15,
                        'attributes' => ['Taille' => 'L', 'Couleur' => '#ffffff'],
                    ],
                    [
                        'id' => 'v-tshirt-xl-blanc',
                        'sku' => 'TSH-GF-XL-BL',
                        'price_override' => 10000,
                        'stock_count' => 5,
                        'attributes' => ['Taille' => 'XL', 'Couleur' => '#ffffff'],
                    ],
                    [
                        'id' => 'v-tshirt-m-noir',
                        'sku' => 'TSH-GF-M-NR',
                        'price_override' => null,
                        'stock_count' => 20,
                        'attributes' => ['Taille' => 'M', 'Couleur' => '#160f33'],
                    ],
                ],
            ],
            [
                'title' => 'Casquette brodée MFM',
                'slug' => 'casquette-brodee-mfm',
                'description' => 'Casquette stylée avec broderie fine du logo MFM, idéale pour le quotidien.',
                'base_price' => 7500,
                'old_price' => 9000,
                'category' => 'Vêtements',
                'badge' => 'Promo',
                'is_digital' => false,
                'is_featured' => false,
                'status' => 'active',
                'images' => [
                    'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80&auto=format&fit=crop',
                ],
                'attributes' => [
                    [
                        'name' => 'Couleur',
                        'type' => 'color',
                        'values' => ['#160f33', '#c8902e', '#ffffff'],
                    ],
                ],
                'variants' => [
                    [
                        'id' => 'v-casquette-noir',
                        'sku' => 'CAS-MFM-NR',
                        'price_override' => null,
                        'stock_count' => 15,
                        'attributes' => ['Couleur' => '#160f33'],
                    ],
                    [
                        'id' => 'v-casquette-or',
                        'sku' => 'CAS-MFM-OR',
                        'price_override' => 8000,
                        'stock_count' => 10,
                        'attributes' => ['Couleur' => '#c8902e'],
                    ],
                ],
            ],
            [
                'title' => 'Mug « Grâce chaque matin »',
                'slug' => 'mug-grace-chaque-matin',
                'description' => 'Mug en céramique de haute qualité, pour bien commencer la journée sous la grâce divine.',
                'base_price' => 5000,
                'old_price' => null,
                'category' => 'Accessoires',
                'badge' => null,
                'is_digital' => false,
                'is_featured' => false,
                'status' => 'active',
                'images' => [
                    'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80&auto=format&fit=crop',
                ],
                'attributes' => [],
                'variants' => [],
            ],
            [
                'title' => 'Tote bag « Maison du Feu »',
                'slug' => 'tote-bag-maison-du-feu',
                'description' => 'Tote bag en toile de coton robuste, très pratique pour transporter vos livres de prières.',
                'base_price' => 6000,
                'old_price' => null,
                'category' => 'Accessoires',
                'badge' => 'Nouveau',
                'is_digital' => false,
                'is_featured' => false,
                'status' => 'active',
                'images' => [
                    'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600&q=80&auto=format&fit=crop',
                ],
                'attributes' => [],
                'variants' => [],
            ],
            [
                'title' => 'Album Louange « Feu du Ciel »',
                'slug' => 'album-louange-feu-du-ciel',
                'description' => 'Album de louange et d\'adoration du groupe musical de la Maison du Feu, disponible en CD ou téléchargement.',
                'base_price' => 8000,
                'old_price' => null,
                'category' => 'Musique',
                'badge' => null,
                'is_digital' => true,
                'is_featured' => true,
                'status' => 'active',
                'images' => [
                    'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&q=80&auto=format&fit=crop',
                ],
                'attributes' => [],
                'variants' => [],
            ],
            [
                'title' => 'Bougie de prière parfumée',
                'slug' => 'bougie-de-priere-parfumee',
                'description' => 'Bougie parfumée aux huiles essentielles de cèdre et d\'encens, idéale pour créer une atmosphère propice à la méditation.',
                'base_price' => 4500,
                'old_price' => null,
                'category' => 'Onction',
                'badge' => null,
                'is_digital' => false,
                'is_featured' => false,
                'status' => 'active',
                'images' => [
                    'https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80&auto=format&fit=crop',
                ],
                'attributes' => [],
                'variants' => [],
            ],
        ];

        foreach ($products as $p) {
            Product::create($p);
        }

        // Seed 100 additional products for rich catalog and pagination
        $categories = ['Livres', 'Vêtements', 'Musique', 'Accessoires', 'Onction'];
        $badges = [null, 'Nouveau', 'Vedette', 'Promo', 'Populaire'];
        $titles = [
            'Livres' => [
                'Manuel de Prière Vocale', 'Guide de l\'Intercesseur', 'Les Secrets de la Foi', 'Vaincre par le Sang de Jésus',
                'Méditations Quotidiennes', 'Révélation de la Grâce', 'L\'Armure du Croyant', 'Marche Spirituelle Victorieuse',
                'La Puissance de l\'Adoration', 'Les Fondements du Salut', 'Sagesse pour le Foyer', 'Éducation Chrétienne',
            ],
            'Vêtements' => [
                'Polo Brodé Maison du Feu', 'Sweat à capuche Génération Feu', 'Casquette Mesh MFM', 'T-shirt Louange MFM',
                'Chaussettes Coton MFM', 'Écharpe Broderie Or', 'T-shirt Enfants de Dieu', 'Casquette Plate MFM',
            ],
            'Musique' => [
                'Album Adoration Profonde Vol. 1', 'Album Live Célébration', 'Chants de Gloire et Victoire', 'Symphonie du Ciel',
                'Feu Sacré (Instrumental)', 'Compilation Chœurs de Feu', 'Album Louange d\'Ensemble', 'Hymnes de Résurrection',
            ],
            'Accessoires' => [
                'Mug Céramique MFM Worship', 'Gourde Métal Génération Feu', 'Sac à Dos Intercesseur', 'Porte-clés MFM Or',
                'Carnet de Notes en Cuir MFM', 'Stylo Gravé Grâce divine', 'Coque Téléphone Croix', 'Marque-page Métal Gravé',
            ],
            'Onction' => [
                'Huile d\'Onction d\'Encens', 'Huile d\'Onction de Myrrhe', 'Encens Naturel de Prière', 'Huile Parfumée Cèdre',
                'Kit d\'Onction Familial', 'Flacon d\'Onction de Voyage', 'Huile d\'Onction d\'Olive Vierge', 'Bougie d\'Onction d\'Albâtre',
            ],
        ];

        $featuredCount = 0;
        for ($i = 1; $i <= 100; $i++) {
            $category = $categories[array_rand($categories)];
            $subList = $titles[$category];
            $baseTitle = $subList[array_rand($subList)];
            $title = $baseTitle.' (Édition #'.$i.')';
            $slug = Str::slug($title);

            $basePrice = rand(3, 40) * 1000;
            $oldPrice = (rand(1, 10) <= 3) ? ($basePrice + rand(1, 5) * 1000) : null;
            $badge = $badges[array_rand($badges)];

            $unlimitedStock = (rand(1, 100) <= 15);
            $stock = $unlimitedStock ? 0 : rand(3, 150);
            $threshold = $unlimitedStock ? null : rand(5, 15);

            $isFeatured = false;
            if ($badge === 'Vedette' && $featuredCount < 2) {
                $isFeatured = true;
                $featuredCount++;
            } elseif ($badge === 'Vedette') {
                $badge = 'Populaire';
            }

            $attrs = [];
            $variants = [];
            if ($category === 'Vêtements') {
                $attrs = [
                    [
                        'name' => 'Taille',
                        'type' => 'text',
                        'values' => ['M', 'L', 'XL'],
                    ],
                ];
                $variants = [
                    [
                        'id' => 'v-gen-m-'.$i,
                        'sku' => strtoupper(substr($slug, 0, 8)).'-M-'.$i,
                        'price_override' => null,
                        'stock_count' => $unlimitedStock ? 0 : rand(5, 50),
                        'attributes' => ['Taille' => 'M'],
                    ],
                    [
                        'id' => 'v-gen-l-'.$i,
                        'sku' => strtoupper(substr($slug, 0, 8)).'-L-'.$i,
                        'price_override' => null,
                        'stock_count' => $unlimitedStock ? 0 : rand(5, 50),
                        'attributes' => ['Taille' => 'L'],
                    ],
                ];
            } elseif ($category === 'Onction' || $category === 'Accessoires') {
                $attrs = [
                    [
                        'name' => 'Modèle',
                        'type' => 'text',
                        'values' => ['Standard', 'Premium'],
                    ],
                ];
                $variants = [
                    [
                        'id' => 'v-opt-std-'.$i,
                        'sku' => strtoupper(substr($slug, 0, 8)).'-STD-'.$i,
                        'price_override' => null,
                        'stock_count' => $unlimitedStock ? 0 : rand(5, 50),
                        'attributes' => ['Modèle' => 'Standard'],
                    ],
                    [
                        'id' => 'v-opt-pre-'.$i,
                        'sku' => strtoupper(substr($slug, 0, 8)).'-PRE-'.$i,
                        'price_override' => $basePrice + rand(1, 5) * 1000,
                        'stock_count' => $unlimitedStock ? 0 : rand(2, 20),
                        'attributes' => ['Modèle' => 'Premium'],
                    ],
                ];
            }

            Product::create([
                'title' => $title,
                'slug' => $slug,
                'description' => "Ce produit est une édition exclusive conçue spécialement pour l'édification de la communauté. Catégorie ".$category.'.',
                'base_price' => $basePrice,
                'old_price' => $oldPrice,
                'category' => $category,
                'badge' => $badge,
                'is_digital' => ($category === 'Musique' && rand(1, 2) === 1),
                'is_featured' => $isFeatured,
                'status' => 'active',
                'unlimited_stock' => $unlimitedStock,
                'low_stock_threshold' => $threshold,
                'images' => [
                    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
                ],
                'attributes' => $attrs,
                'variants' => $variants,
            ]);
        }

        // Add some mock orders to make the admin immediately populated and beautiful
        $orders = [
            [
                'reference' => 'MFM-2041',
                'customer_first_name' => 'Grâce',
                'customer_last_name' => 'Aka',
                'customer_phone' => '07 01 02 03 04',
                'customer_email' => 'grace.aka@email.com',
                'subtotal' => 25000 + 9000,
                'delivery_fee' => 2000,
                'total_amount' => 36000,
                'delivery_key' => 'abidjan',
                'delivery_label' => 'Livraison Abidjan',
                'payment_method' => 'Orange Money',
                'payment_status' => 'paid',
                'fulfillment_status' => 'nouvelle',
                'notes' => 'Laisser le colis chez le gardien si absent.',
                'created_at' => now()->subHours(2),
                'items' => [
                    [
                        'product_title' => "Bible d'étude « Maison du Feu »",
                        'quantity' => 1,
                        'price' => 25000,
                        'selected_attributes' => ['Couleur' => '#160f33'],
                    ],
                    [
                        'product_title' => 'Bougie de prière parfumée',
                        'quantity' => 2,
                        'price' => 4500,
                        'selected_attributes' => [],
                    ],
                ],
            ],
            [
                'reference' => 'MFM-2040',
                'customer_first_name' => 'Emmanuel',
                'customer_last_name' => 'Koffi',
                'customer_phone' => '05 44 55 66 77',
                'customer_email' => 'emma.koffi@email.com',
                'subtotal' => 18000,
                'delivery_fee' => 0,
                'total_amount' => 18000,
                'delivery_key' => 'church_retrait',
                'delivery_label' => "Retrait à l'église",
                'payment_method' => 'Wave',
                'payment_status' => 'paid',
                'fulfillment_status' => 'preparation',
                'notes' => null,
                'created_at' => now()->subDay(),
                'items' => [
                    [
                        'product_title' => 'T-shirt « Génération Feu »',
                        'quantity' => 2,
                        'price' => 9000,
                        'selected_attributes' => ['Taille' => 'M', 'Couleur' => '#160f33'],
                    ],
                ],
            ],
            [
                'reference' => 'MFM-2039',
                'customer_first_name' => 'Sarah',
                'customer_last_name' => 'Obi',
                'customer_phone' => '01 22 33 44 55',
                'customer_email' => 'sarah.obi@email.com',
                'subtotal' => 13000,
                'delivery_fee' => 5000,
                'total_amount' => 18000,
                'delivery_key' => 'interieur',
                'delivery_label' => 'Livraison intérieur',
                'payment_method' => 'Carte bancaire',
                'payment_status' => 'paid',
                'fulfillment_status' => 'expediee',
                'notes' => 'Expédier via UTB Bouaké.',
                'created_at' => now()->subDays(2),
                'items' => [
                    [
                        'product_title' => 'Album Louange « Feu du Ciel »',
                        'quantity' => 1,
                        'price' => 8000,
                        'selected_attributes' => [],
                    ],
                    [
                        'product_title' => 'Mug « Grâce chaque matin »',
                        'quantity' => 1,
                        'price' => 5000,
                        'selected_attributes' => [],
                    ],
                ],
            ],
            [
                'reference' => 'MFM-2038',
                'customer_first_name' => 'Paul',
                'customer_last_name' => 'Diby',
                'customer_phone' => '07 88 99 00 11',
                'customer_email' => 'paul.diby@email.com',
                'subtotal' => 13500,
                'delivery_fee' => 2000,
                'total_amount' => 15500,
                'delivery_key' => 'abidjan',
                'delivery_label' => 'Livraison Abidjan',
                'payment_method' => 'MTN Money',
                'payment_status' => 'paid',
                'fulfillment_status' => 'livree',
                'notes' => null,
                'created_at' => now()->subDays(4),
                'items' => [
                    [
                        'product_title' => 'Casquette brodée MFM',
                        'quantity' => 1,
                        'price' => 7500,
                        'selected_attributes' => ['Couleur' => '#160f33'],
                    ],
                    [
                        'product_title' => 'Tote bag « Maison du Feu »',
                        'quantity' => 1,
                        'price' => 6000,
                        'selected_attributes' => [],
                    ],
                ],
            ],
            [
                'reference' => 'MFM-2037',
                'customer_first_name' => 'Marie',
                'customer_last_name' => 'Aka',
                'customer_phone' => '05 66 77 88 99',
                'customer_email' => 'marie.aka@email.com',
                'subtotal' => 36000,
                'delivery_fee' => 0,
                'total_amount' => 36000,
                'delivery_key' => 'church_retrait',
                'delivery_label' => "Retrait à l'église",
                'payment_method' => 'Orange Money',
                'payment_status' => 'paid',
                'fulfillment_status' => 'livree',
                'notes' => null,
                'created_at' => now()->subDays(5),
                'items' => [
                    [
                        'product_title' => 'Recueil « Vivre par la Foi »',
                        'quantity' => 3,
                        'price' => 12000,
                        'selected_attributes' => [],
                    ],
                ],
            ],
        ];

        foreach ($orders as $o) {
            $items = $o['items'];
            unset($o['items']);
            $order = Order::create($o);
            foreach ($items as $item) {
                $item['order_id'] = $order->id;
                OrderItem::create($item);
            }
        }
    }
}
