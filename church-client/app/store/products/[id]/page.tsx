import { ProductView } from "./product-view";
import { ProductRich } from "./product-view";

// Complete simulated product database with rich attribute options
const MOCK_PRODUCTS: Record<string, ProductRich> = {
  "1": {
    id: "1",
    title: "Bible d'étude « Maison du Feu »",
    description: "L'édition annotée pensée pour les combattants de la prière. Contient des commentaires de versets, des concordances thématiques complètes et des marges larges pour vos notes personnelles.",
    base_price: 25000,
    oldPrice: 32000,
    images: [
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop"
    ],
    is_digital: false,
    status: "active",
    category: "Livres",
    attributes: [
      { name: "Format", type: "select", values: ["Relié", "Broché"] },
      {
        name: "Couleur",
        type: "color",
        values: [
          { value: "Bordeaux", color: "#800020", image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=80&auto=format&fit=crop" },
          { value: "Noir", color: "#000000", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop" }
        ]
      }
    ],
    variants: [
      { id: "v1", sku: "bible-relie-bordeaux", stock_count: 15, price_override: 28000, attributes: { Format: "Relié", Couleur: "Bordeaux" } },
      { id: "v2", sku: "bible-relie-noir", stock_count: 8, price_override: 28000, attributes: { Format: "Relié", Couleur: "Noir" } },
      { id: "v3", sku: "bible-broche-bordeaux", stock_count: 25, price_override: 25000, attributes: { Format: "Broché", Couleur: "Bordeaux" } },
      { id: "v4", sku: "bible-broche-noir", stock_count: 20, price_override: 25000, attributes: { Format: "Broché", Couleur: "Noir" } }
    ]
  },
  "2": {
    id: "2",
    title: "Recueil « Vivre par la Foi »",
    description: "40 méditations quotidiennes et cantiques pour ancrer chaque journée dans la Parole de Dieu et fortifier son esprit.",
    base_price: 12000,
    images: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop"],
    is_digital: false,
    status: "active",
    category: "Livres",
    attributes: [],
    variants: []
  },
  "3": {
    id: "3",
    title: "T-shirt « Génération Feu »",
    description: "T-shirt haut de gamme en coton biologique épais. Sérigraphie dorée résistante au lavage. Idéal pour afficher votre appartenance à la génération de feu.",
    base_price: 9000,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&auto=format&fit=crop"
    ],
    is_digital: false,
    status: "active",
    category: "Vêtements",
    attributes: [
      { name: "Taille", type: "select", values: ["S", "M", "L", "XL"] },
      {
        name: "Couleur",
        type: "color",
        values: [
          { value: "Blanc", color: "#ffffff", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&auto=format&fit=crop" },
          { value: "Noir", color: "#000000", image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&auto=format&fit=crop" }
        ]
      }
    ],
    variants: [
      { id: "v31", sku: "tshirt-s-blanc", stock_count: 10, price_override: 9000, attributes: { Taille: "S", Couleur: "Blanc" } },
      { id: "v32", sku: "tshirt-s-noir", stock_count: 12, price_override: 9000, attributes: { Taille: "S", Couleur: "Noir" } },
      { id: "v33", sku: "tshirt-m-blanc", stock_count: 15, price_override: 9000, attributes: { Taille: "M", Couleur: "Blanc" } },
      { id: "v34", sku: "tshirt-m-noir", stock_count: 15, price_override: 9000, attributes: { Taille: "M", Couleur: "Noir" } }
    ]
  },
  "4": {
    id: "4",
    title: "Casquette brodée MFM",
    description: "Casquette structurée à visière courbée. Logo MFM finement brodé de fil doré sur le devant. Patte de serrage réglable à l'arrière.",
    base_price: 7500,
    oldPrice: 9000,
    images: ["https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&auto=format&fit=crop"],
    is_digital: false,
    status: "active",
    category: "Vêtements",
    attributes: [
      {
        name: "Couleur",
        type: "color",
        values: [
          { value: "Noir", color: "#000000", image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&auto=format&fit=crop" }
        ]
      }
    ],
    variants: [
      { id: "v41", sku: "casquette-noir", stock_count: 30, price_override: 7500, attributes: { Couleur: "Noir" } }
    ]
  },
  "5": {
    id: "5",
    title: "Mug « Grâce chaque matin »",
    description: "Mug en céramique blanche de haute qualité. Résistant au micro-ondes et lave-vaisselle. Idéal pour vos boissons chaudes pendant vos moments de dévotion matinale.",
    base_price: 5000,
    images: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&auto=format&fit=crop"],
    is_digital: false,
    status: "active",
    category: "Accessoires",
    attributes: [],
    variants: []
  },
  "6": {
    id: "6",
    title: "Tote bag « Maison du Feu »",
    description: "Sac cabas en toile de coton écru très résistante avec de longues anses. Graphisme imprimé de couleur pour transporter vos bibles et cahiers de notes de culte.",
    base_price: 6000,
    images: ["https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600&auto=format&fit=crop"],
    is_digital: false,
    status: "active",
    category: "Accessoires",
    attributes: [],
    variants: []
  },
  "7": {
    id: "7",
    title: "Album Louange « Feu du Ciel »",
    description: "Le nouvel album CD et digital du groupe MFM Worship. Contient 12 titres inspirés pour conduire l'assemblée dans la louange et l'adoration prophétique.",
    base_price: 8000,
    images: ["https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&auto=format&fit=crop"],
    is_digital: true,
    status: "active",
    category: "Musique",
    attributes: [],
    variants: []
  },
  "8": {
    id: "8",
    title: "Bougie de prière parfumée",
    description: "Bougie fabriquée à la main à base de cire de soja 100% naturelle parfumée aux huiles essentielles d'onction. Conçue pour instaurer une atmosphère paisible durant vos temps de prière.",
    base_price: 4500,
    images: ["https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&auto=format&fit=crop"],
    is_digital: false,
    status: "active",
    category: "Onction",
    attributes: [],
    variants: []
  }
};

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function ProductDetailPage({ params }: PageProps) {
  // Direct compatibility check for Promise-based params in Next.js 15+
  const resolvedParams = params instanceof Promise ? await params : params;
  const id = resolvedParams?.id || "1";

  // Fallback to primary mock product if ID doesn't exist
  const product = MOCK_PRODUCTS[id] || MOCK_PRODUCTS["1"];

  return <ProductView product={product} />;
}
