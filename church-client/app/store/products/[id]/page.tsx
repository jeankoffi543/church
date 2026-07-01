import { ProductView } from "./product-view";
import { Product } from "@/lib/store";

// Simulated product database fetch
const MOCK_PRODUCTS: Record<string, Product> = {
  "1": {
    id: "1",
    title: "Livre : L'Audace de la Foi",
    description: "Découvrez les clés spirituelles pour vaincre le doute et surmonter les obstacles du quotidien à travers des exemples inspirants et des méditations guidées pour fortifier votre esprit et marcher selon les desseins de Dieu.",
    base_price: 15,
    images: [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80"
    ],
    is_digital: false,
    status: "active",
    attributes: [
      { name: "Format", type: "select", values: ["Relié", "Broché"] },
      { name: "Couleur", type: "color", values: ["#e2b85f", "#b270ff", "#130d22"] }
    ],
    variants: [
      { id: "v1", sku: "audace-relie-or", stock_count: 15, price_override: 18, attributes: { Format: "Relié", Couleur: "#e2b85f" } },
      { id: "v2", sku: "audace-relie-violet", stock_count: 8, price_override: 18, attributes: { Format: "Relié", Couleur: "#b270ff" } },
      { id: "v3", sku: "audace-relie-sombre", stock_count: 0, price_override: 15, attributes: { Format: "Relié", Couleur: "#130d22" } },
      { id: "v4", sku: "audace-broche-or", stock_count: 25, price_override: 15, attributes: { Format: "Broché", Couleur: "#e2b85f" } },
      { id: "v5", sku: "audace-broche-violet", stock_count: 20, price_override: 15, attributes: { Format: "Broché", Couleur: "#b270ff" } },
      { id: "v6", sku: "audace-broche-sombre", stock_count: 12, price_override: 12, attributes: { Format: "Broché", Couleur: "#130d22" } }
    ]
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
