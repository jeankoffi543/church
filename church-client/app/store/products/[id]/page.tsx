import { notFound } from "next/navigation";
import { ProductView } from "./product-view";
import { ProductRich } from "./product-view";

// Complete simulated product database with rich attribute options
const MOCK_PRODUCTS: Record<string, ProductRich> = {};

import { getStoreProduct } from "@/lib/api";
import { assetUrl } from "@/lib/asset-url";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function ProductDetailPage({ params }: PageProps) {
  // Direct compatibility check for Promise-based params in Next.js 15+
  const resolvedParams = params instanceof Promise ? await params : params;
  const id = resolvedParams?.id || "1";

  const rawProduct = await getStoreProduct(id);
  let product: ProductRich;

  if (rawProduct) {
    const formattedAttrs = (rawProduct.attributes || []).map((attr: any) => {
      return {
        name: attr.name,
        type: attr.type === "color" ? "color" : "text",
        values: (attr.values || []).map((v: any) => {
          if (typeof v === "string") {
            const isColor = attr.type === "color";
            return {
              value: v,
              color: isColor ? v : undefined,
            };
          }
          return v;
        }),
      };
    });

    const images = (rawProduct.images || []).map((img: any) => typeof img === "string" ? (assetUrl(img) || img) : "").filter(Boolean);
    if (images.length === 0) {
      images.push("https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80");
    }

    const variants = (rawProduct.variants || []).map((v: any) => {
      return {
        id: v.id,
        sku: v.sku,
        price_override: v.price_override ? Number(v.price_override) : undefined,
        old_price_override: v.old_price_override ? Number(v.old_price_override) : undefined,
        stock_count: Number(v.stock_count) ?? 10,
        image_override: v.image_override ? (assetUrl(v.image_override) || v.image_override) : undefined,
        description_override: v.description_override || undefined,
        unlimited_stock: v.unlimited_stock !== undefined ? Boolean(v.unlimited_stock) : undefined,
        low_stock_threshold: v.low_stock_threshold !== undefined ? Number(v.low_stock_threshold) : undefined,
        attributes: v.attributes || {},
      };
    });

    product = {
      id: String(rawProduct.id),
      title: rawProduct.title,
      description: rawProduct.description || "",
      base_price: Number(rawProduct.base_price) || 0,
      oldPrice: rawProduct.old_price ? Number(rawProduct.old_price) : undefined,
      images,
      is_digital: Boolean(rawProduct.is_digital),
      unlimited_stock: Boolean(rawProduct.unlimited_stock),
      low_stock_threshold: rawProduct.low_stock_threshold !== null && rawProduct.low_stock_threshold !== undefined ? Number(rawProduct.low_stock_threshold) : undefined,
      status: rawProduct.status || "active",
      attributes: formattedAttrs,
      variants,
      category: rawProduct.category || "Autre",
      badge: rawProduct.badge || undefined,
    };
  } else {
    notFound();
  }

  return <ProductView product={product!} />;
}
