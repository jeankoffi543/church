"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductModal, ProductPayload } from "./_components/product-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface VariantOption {
  value: string;
  color?: string;
}

interface VariantGroup {
  name: string;
  type: "text" | "color";
  options: VariantOption[];
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  stock: number;
  badge: string;
  images: string[];
  variants: VariantGroup[];
  shortDesc: string;
  longDesc: string;
  featured: boolean;
}

const INITIAL_CATEGORIES = ["Livres", "Vêtements", "Musique", "Accessoires", "Onction"];

const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Bible d'étude « Maison du Feu »",
    category: "Livres",
    price: 25000,
    oldPrice: 32000,
    stock: 35,
    badge: "Vedette",
    images: ["https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=80&auto=format&fit=crop"],
    variants: [
      {
        name: "Couleur",
        type: "color",
        options: [
          { value: "Bordeaux", color: "#800020" },
          { value: "Noir", color: "#000000" },
          { value: "Marine", color: "#000080" },
        ],
      },
    ],
    shortDesc: "L'édition annotée pensée pour les combattants de la prière.",
    longDesc: "Description longue...",
    featured: true,
  },
  {
    id: 2,
    name: "Recueil « Vivre par la Foi »",
    category: "Livres",
    price: 12000,
    stock: 60,
    badge: "Nouveau",
    images: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80&auto=format&fit=crop"],
    variants: [],
    shortDesc: "40 méditations pour ancrer chaque journée dans la Parole.",
    longDesc: "Description longue...",
    featured: false,
  },
  {
    id: 3,
    name: "T-shirt « Génération Feu »",
    category: "Vêtements",
    price: 9000,
    stock: 85,
    badge: "",
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80&auto=format&fit=crop"],
    variants: [
      { name: "Taille", type: "text", options: [{ value: "S" }, { value: "M" }, { value: "L" }, { value: "XL" }] },
      {
        name: "Couleur",
        type: "color",
        options: [
          { value: "Blanc", color: "#ffffff" },
          { value: "Noir", color: "#000000" },
          { value: "Violet", color: "#7f00ff" },
        ],
      },
    ],
    shortDesc: "Coton bio épais, sérigraphie dorée.",
    longDesc: "Description longue...",
    featured: false,
  },
  {
    id: 4,
    name: "Casquette brodée MFM",
    category: "Vêtements",
    price: 7500,
    oldPrice: 9000,
    stock: 40,
    badge: "Promo",
    images: ["https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80&auto=format&fit=crop"],
    variants: [
      {
        name: "Couleur",
        type: "color",
        options: [
          { value: "Noir", color: "#000000" },
          { value: "Beige", color: "#f5f5dc" },
          { value: "Marine", color: "#000080" },
        ],
      },
    ],
    shortDesc: "Casquette structurée, logo brodé fil or.",
    longDesc: "Description longue...",
    featured: false,
  },
  {
    id: 5,
    name: "Mug « Grâce chaque matin »",
    category: "Accessoires",
    price: 5000,
    stock: 120,
    badge: "",
    images: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80&auto=format&fit=crop"],
    variants: [],
    shortDesc: "Céramique 350ml, verset inspirant.",
    longDesc: "Description longue...",
    featured: false,
  },
  {
    id: 6,
    name: "Tote bag « Maison du Feu »",
    category: "Accessoires",
    price: 6000,
    stock: 70,
    badge: "Nouveau",
    images: ["https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600&q=80&auto=format&fit=crop"],
    variants: [],
    shortDesc: "Tote bag en toile robuste pour le quotidien.",
    longDesc: "Description longue...",
    featured: false,
  },
  {
    id: 7,
    name: "Album Louange « Feu du Ciel »",
    category: "Musique",
    price: 8000,
    stock: 55,
    badge: "",
    images: ["https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&q=80&auto=format&fit=crop"],
    variants: [],
    shortDesc: "Le nouvel album de louange du groupe MFM Worship.",
    longDesc: "Description longue...",
    featured: false,
  },
  {
    id: 8,
    name: "Bougie de prière parfumée",
    category: "Onction",
    price: 4500,
    stock: 8,
    badge: "",
    images: ["https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80&auto=format&fit=crop"],
    variants: [],
    shortDesc: "Cire de soja naturelle parfumée, idéale pour vos temps de prière.",
    longDesc: "Description longue...",
    featured: false,
  },
];

export default function StoreCatalogPage() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [search, setSearch] = useState("");

  // Modal configuration
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Statistics calculation
  const totalProducts = products.length;
  const totalCategories = categories.length;
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock < 10).length;

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setModalOpen(true);
  };

  const handleAddCategory = (newCat: string) => {
    if (!categories.includes(newCat)) {
      setCategories((prev) => [...prev, newCat]);
    }
  };

  const handleDeleteProduct = (id: number) => {
    if (confirm("Voulez-vous vraiment supprimer ce produit ?")) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSaveProduct = (payload: ProductPayload) => {
    if (editingProduct) {
      // Edit mode
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                ...payload,
              }
            : p
        )
      );
    } else {
      // Create mode
      const newProduct: Product = {
        id: Date.now(),
        ...payload,
      };
      setProducts((prev) => [newProduct, ...prev]);
    }
    setModalOpen(false);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const getVariantSummary = (variants: VariantGroup[]) => {
    if (!variants || variants.length === 0) return "Sans variante";
    return variants.map((g) => `${g.options.length} ${g.name.toLowerCase()}`).join(", ");
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return { label: "Rupture", color: "text-[#c9536b]", bg: "bg-[rgba(201,83,107,0.12)]" };
    }
    if (stock < 10) {
      return { label: "Stock faible", color: "text-[#c8902e]", bg: "bg-[rgba(200,144,46,0.14)]" };
    }
    return { label: "En vente", color: "text-[#1f8a5b]", bg: "bg-[rgba(31,138,91,0.12)]" };
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gold-dark">
            Catalogue
          </span>
          <h1 className="font-display text-4xl font-bold italic text-indigo">
            Gestion des produits
          </h1>
        </div>
        <Button
          onClick={handleOpenAddModal}
          className="h-[52px] rounded-xl bg-gradient-to-r from-gold to-gold-dark px-6 font-extrabold text-[15px] text-indigo shadow-[0_10px_26px_rgba(200,144,46,0.3)] hover:-translate-y-0.5 hover:opacity-95 transition cursor-pointer"
        >
          <Plus className="mr-1.5 size-4" /> Ajouter un produit
        </Button>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total active products */}
        <div className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-[#9a93ad]">Produits actifs</span>
          <div className="font-display text-3xl font-bold text-indigo mt-1">
            {totalProducts}
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-[#9a93ad]">Catégories</span>
          <div className="font-display text-3xl font-bold text-indigo mt-1">
            {totalCategories}
          </div>
        </div>

        {/* Total stock count */}
        <div className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-[#9a93ad]">Stock total</span>
          <div className="font-display text-3xl font-bold text-indigo mt-1">
            {totalStock}
          </div>
        </div>

        {/* Low Stock alerting count */}
        <div className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-[#9a93ad]">Stock faible</span>
          <div className="font-display text-3xl font-bold text-indigo mt-1 flex items-center gap-2">
            {lowStockCount}
            {lowStockCount > 0 && (
              <span className="inline-block size-2.5 rounded-full bg-[#c9536b] animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Table & Filtering */}
      <div className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#281950]/6 pb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <Input
              type="text"
              placeholder="Rechercher par titre, catégorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-[#281950]/14 bg-white pl-9 text-xs text-indigo placeholder:text-faint w-full"
            />
          </div>
          <span className="text-xs font-bold text-[#9a93ad]">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""} trouvé
            {filteredProducts.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Catalog Table grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#281950]/6 text-xs font-extrabold uppercase tracking-wider text-[#9a93ad]">
                <th className="p-[16px_20px]">Produit</th>
                <th className="p-[16px_20px]">Catégorie</th>
                <th className="p-[16px_20px]">Prix</th>
                <th className="p-[16px_20px]">Stock</th>
                <th className="p-[16px_20px]">Statut</th>
                <th className="p-[16px_20px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const stockStatus = getStockStatus(p.stock);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[#281950]/6 transition-all hover:bg-[#faf8f4]"
                  >
                    <td className="p-[14px_20px]">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#281950]/4">
                          <Image
                            src={p.images[0] || ""}
                            alt={p.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-indigo">
                            {p.name}
                          </div>
                          <div className="text-[11.5px] text-faint truncate flex items-center gap-2 mt-0.5">
                            <span>{getVariantSummary(p.variants)}</span>
                            {/* Visual Color Dots Chips Preview */}
                            {p.variants.some((v) => v.type === "color") && (
                              <div className="flex items-center gap-1">
                                {p.variants
                                  .filter((v) => v.type === "color")
                                  .flatMap((v) => v.options)
                                  .map((opt, i) => (
                                    <div
                                      key={i}
                                      style={{ backgroundColor: opt.color || "#000" }}
                                      className="size-3.5 rounded-full border border-indigo/15"
                                      title={opt.value}
                                    />
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-[14px_20px]">
                      <span className="inline-block rounded-lg bg-lilac px-[10px] py-[5px] text-xs font-bold text-indigo-mid">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-[14px_20px] text-sm font-bold text-indigo">
                      {p.price.toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="p-[14px_20px] text-[13.5px] font-bold text-indigo">
                      {p.stock}
                    </td>
                    <td className="p-[14px_20px]">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-[5px] text-[11px] font-extrabold uppercase",
                          stockStatus.color,
                          stockStatus.bg
                        )}
                      >
                        {stockStatus.label}
                      </span>
                    </td>
                    <td className="p-[14px_20px] text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenEditModal(p)}
                          className="size-[34px] rounded-lg hover:bg-lilac transition text-indigo-mid shrink-0 cursor-pointer"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="size-[34px] rounded-lg hover:bg-destructive/12 transition text-[#c9536b] shrink-0 cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs font-bold text-faint">
                    Aucun produit trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal handles creation and editing */}
      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={editingProduct}
        categories={categories}
        onAddCategory={handleAddCategory}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
