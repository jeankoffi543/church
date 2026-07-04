"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Search, Plus, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductModal, ProductPayload } from "./_components/product-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { assetUrl } from "@/lib/asset-url";
import { useServerList } from "../_components/use-server-list";
import { Pagination } from "../_components/pagination";
import { QueryBuilder, serializeFiltersForQueryMaster } from "@/components/admin/query-builder";
import type { FilterField, ActiveFilter } from "@/components/admin/query-builder";

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
  unlimited_stock?: boolean;
  low_stock_threshold?: number;
  badge: string;
  images: string[];
  variants: VariantGroup[];
  shortDesc: string;
  longDesc: string;
  featured: boolean;
}

const INITIAL_CATEGORIES = ["Livres", "Vêtements", "Musique", "Accessoires", "Onction"];

const PRODUCT_SORT_FIELD: Record<string, string> = {
  name: "title",
  category: "category",
  price: "base_price",
};

const filterFields: FilterField[] = [
  { id: "category", label: "Catégorie", type: "select", options: INITIAL_CATEGORIES.map(c => ({ value: c, label: c })) },
  { 
    id: "is_featured", 
    label: "Statut Vedette", 
    type: "select", 
    options: [
      { value: "1", label: "En Vedette" },
      { value: "0", label: "Standard" }
    ] 
  },
];

const mapApiProductToFrontendProduct = (p: any): Product => {
  const stockCount = p.variants && p.variants.length > 0 
    ? p.variants.reduce((acc: number, v: any) => acc + (v.stock_count || 0), 0)
    : 10;
  
  const localVariants = (p.attributes || []).map((attr: any) => {
    return {
      name: attr.name,
      type: attr.type === "color" ? "color" : "text",
      options: (attr.values || []).map((val: any) => {
        if (typeof val === "object" && val !== null) {
          return {
            value: val.value,
            color: val.color || undefined,
            image: val.image || undefined,
            price: val.price || undefined,
            oldPrice: val.oldPrice || undefined,
            stock: val.stock !== undefined ? val.stock : undefined,
            description: val.description || undefined,
            unlimited_stock: val.unlimited_stock !== undefined ? Boolean(val.unlimited_stock) : undefined,
            low_stock_threshold: val.low_stock_threshold !== undefined ? Number(val.low_stock_threshold) : undefined,
          };
        }
        const isColor = attr.type === "color";
        return {
          value: String(val),
          color: isColor ? String(val) : undefined,
        };
      }),
    };
  });

  return {
    id: Number(p.id),
    name: p.title,
    category: p.category,
    price: Number(p.base_price),
    oldPrice: p.old_price ? Number(p.old_price) : undefined,
    stock: stockCount,
    unlimited_stock: Boolean(p.unlimited_stock),
    low_stock_threshold: p.low_stock_threshold !== null && p.low_stock_threshold !== undefined ? Number(p.low_stock_threshold) : undefined,
    badge: p.badge || "",
    images: p.images ? p.images.map((img: any) => typeof img === "string" ? (assetUrl(img) || img) : "").filter(Boolean) : [],
    variants: localVariants,
    shortDesc: p.description || "",
    longDesc: p.description || "",
    featured: Boolean(p.is_featured),
  };
};

export default function StoreCatalogPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Sorting
  const [sortBy, setSortBy] = useState<"name" | "category" | "price" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  // Filters
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Modal configuration
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Fetch all products once for unpaginated KPI calculations
  useEffect(() => {
    const loadKPIs = async () => {
      try {
        const { getAdminProducts, getAdminProductCategories } = await import("@/lib/admin-api");
        const raw = await getAdminProducts();
        const cats = await getAdminProductCategories();
        if (raw) {
          setAllProducts(raw.map(mapApiProductToFrontendProduct));
        }
        if (cats) {
          setCategories(cats);
        }
      } catch (err) {
        console.error("Error loading KPI products:", err);
      }
    };
    loadKPIs();
  }, []);

  const totalProducts = allProducts.length;
  const totalCategories = categories.length;
  const totalStock = allProducts.reduce((acc, p) => acc + (p.unlimited_stock ? 0 : p.stock), 0);
  const lowStockCount = allProducts.filter((p) => {
    if (p.unlimited_stock) return false;
    const threshold = p.low_stock_threshold !== undefined && p.low_stock_threshold !== null ? p.low_stock_threshold : 10;
    return p.stock <= threshold;
  }).length;

  const productFilters: Record<string, string> = { ...serializeFiltersForQueryMaster(activeFilters) };

  // useServerList for paginated table
  const {
    items: rawItems,
    meta,
    isLoading,
    refresh,
  } = useServerList<any>({
    fetcher: async (params) => {
      const { getAdminProductsPaginated } = await import("@/lib/admin-api");
      return getAdminProductsPaginated(params);
    },
    params: {
      page,
      perPage,
      search,
      sort: sortBy && sortOrder ? { field: PRODUCT_SORT_FIELD[sortBy], dir: sortOrder } : null,
      filters: productFilters,
    },
    initialData: [],
    initialMeta: { current_page: 1, last_page: 1, total: 0, per_page: 10 },
    loadOnMount: true,
  });

  const products = useMemo(() => {
    return (rawItems || []).map(mapApiProductToFrontendProduct);
  }, [rawItems]);

  const handleSort = (column: "name" | "category" | "price") => {
    if (sortBy !== column) {
      setSortBy(column);
      setSortOrder("asc");
    } else {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortBy(null);
        setSortOrder(null);
      }
    }
    setPage(1);
  };

  const renderSortChevron = (column: "name" | "category" | "price") => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="size-3 text-faint shrink-0" />;
    }
    if (sortOrder === "asc") {
      return <ChevronUp className="size-3 text-gold-dark shrink-0" />;
    }
    if (sortOrder === "desc") {
      return <ChevronDown className="size-3 text-gold-dark shrink-0" />;
    }
    return <ChevronsUpDown className="size-3 text-faint shrink-0" />;
  };

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

  const handleDeleteProduct = async (id: number) => {
    if (confirm("Voulez-vous vraiment supprimer ce produit ?")) {
      try {
        const { deleteAdminProduct } = await import("@/lib/admin-api");
        await deleteAdminProduct(id);
        refresh();
      } catch (err: any) {
        alert(err.message || "Erreur de suppression");
      }
    }
  };

  const handleSaveProduct = async (payload: ProductPayload) => {
    if (payload.featured) {
      const count = allProducts.filter((p) => p.featured && p.id !== editingProduct?.id).length;
      if (count >= 5) {
        alert("Le nombre maximum de produits vedettes est limité à 5.");
        return;
      }
    }
    try {
      const { createAdminProduct, updateAdminProduct } = await import("@/lib/admin-api");
      
      const backendAttributes = (payload.variants || []).map((group: any) => {
        return {
          name: group.name,
          type: group.type,
          values: group.options.map((opt: any) => {
            return {
              value: opt.value,
              color: group.type === "color" ? opt.color : undefined,
              image: opt.image || undefined,
              price: opt.price ? Number(opt.price) : undefined,
              oldPrice: opt.oldPrice ? Number(opt.oldPrice) : undefined,
              stock: opt.stock !== undefined ? Number(opt.stock) : undefined,
              description: opt.description || undefined,
              unlimited_stock: opt.unlimited_stock !== undefined ? Boolean(opt.unlimited_stock) : undefined,
              low_stock_threshold: opt.low_stock_threshold !== undefined ? Number(opt.low_stock_threshold) : undefined,
            };
          }),
        };
      });

      const backendVariants = (payload.variants && payload.variants.length > 0)
        ? payload.variants[0].options.map((opt: any, idx: number) => {
            return {
              id: `v-${idx + 1}`,
              sku: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${opt.value.toLowerCase()}`,
              price_override: opt.price ? Number(opt.price) : null,
              stock_count: opt.stock !== undefined ? Number(opt.stock) : Math.floor(payload.stock / payload.variants[0].options.length),
              image_override: opt.image || null,
              attributes: { [payload.variants[0].name]: opt.value },
              unlimited_stock: opt.unlimited_stock !== undefined ? Boolean(opt.unlimited_stock) : undefined,
              low_stock_threshold: opt.low_stock_threshold !== undefined ? Number(opt.low_stock_threshold) : undefined,
            };
          })
        : [
            {
              id: "default",
              sku: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-default`,
              price_override: null,
              stock_count: Number(payload.stock) || 0,
              image_override: null,
              unlimited_stock: payload.unlimited_stock,
              low_stock_threshold: payload.low_stock_threshold,
              attributes: {}
            }
          ];

      const backendPayload = {
        title: payload.name,
        description: payload.shortDesc,
        base_price: payload.price,
        old_price: payload.oldPrice || null,
        category: payload.category,
        badge: payload.badge || null,
        is_digital: payload.category === "Musique",
        is_featured: payload.featured,
        unlimited_stock: payload.unlimited_stock,
        low_stock_threshold: payload.low_stock_threshold !== undefined && payload.low_stock_threshold !== null ? Number(payload.low_stock_threshold) : null,
        status: "active",
        images: payload.images.filter((img) => img && !img.startsWith("blob:")),
        attributes: backendAttributes,
        variants: backendVariants,
      };

      if (editingProduct) {
        await updateAdminProduct(editingProduct.id, backendPayload, (payload as any).imageFiles);
      } else {
        await createAdminProduct(backendPayload, (payload as any).imageFiles);
      }
      
      window.location.reload();
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Erreur de sauvegarde");
    }
  };

  const getVariantSummary = (variants: VariantGroup[]) => {
    if (!variants || variants.length === 0) return "Sans variante";
    return variants.map((g) => `${g.options.length} ${g.name.toLowerCase()}`).join(", ");
  };

  const getStockStatus = (p: any) => {
    if (p.unlimited_stock) {
      return { label: "Illimité", color: "text-[#1f8a5b]", bg: "bg-[rgba(31,138,91,0.12)]" };
    }
    const stock = p.stock || 0;
    if (stock === 0) {
      return { label: "Rupture", color: "text-[#c9536b]", bg: "bg-[rgba(201,83,107,0.12)]" };
    }
    const threshold = p.low_stock_threshold !== undefined && p.low_stock_threshold !== null ? p.low_stock_threshold : 10;
    if (stock <= threshold) {
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

      {/* Products list card */}
      <div className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between border-b border-[#281950]/6 pb-4 flex-wrap z-20 relative">
          <div className="flex flex-1 items-center gap-3 flex-wrap">
            <div className="relative w-full max-w-sm">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
              <Input
                type="text"
                placeholder="Rechercher par titre..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border-[#281950]/14 bg-white pl-9 text-xs text-indigo placeholder:text-faint w-full"
              />
            </div>
            <QueryBuilder
              fields={filterFields}
              activeFilters={activeFilters}
              onChange={(nextFilters) => {
                setActiveFilters(nextFilters);
                setPage(1);
              }}
            />
          </div>
          <span className="text-xs font-bold text-[#9a93ad]">
            {meta.total} produit{meta.total > 1 ? "s" : ""} trouvé{meta.total > 1 ? "s" : ""}
          </span>
        </div>

        {/* Catalog Table grid */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <span className="text-sm font-semibold text-faint">Chargement...</span>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#281950]/6 text-xs font-extrabold uppercase tracking-wider text-[#9a93ad]">
                  <th className="p-[16px_20px] cursor-pointer select-none" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1.5">
                      Produit {renderSortChevron("name")}
                    </div>
                  </th>
                  <th className="p-[16px_20px] cursor-pointer select-none" onClick={() => handleSort("category")}>
                    <div className="flex items-center gap-1.5">
                      Catégorie {renderSortChevron("category")}
                    </div>
                  </th>
                  <th className="p-[16px_20px]">Badge</th>
                  <th className="p-[16px_20px] cursor-pointer select-none" onClick={() => handleSort("price")}>
                    <div className="flex items-center gap-1.5">
                      Prix {renderSortChevron("price")}
                    </div>
                  </th>
                  <th className="p-[16px_20px]">Stock</th>
                  <th className="p-[16px_20px]">Statut</th>
                  <th className="p-[16px_20px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stockStatus = getStockStatus(p);
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
                      <td className="p-[14px_20px]">
                        {p.badge ? (
                          <span className="inline-block rounded-lg bg-amber-500/10 px-[10px] py-[5px] text-xs font-bold text-amber-600">
                            {p.badge}
                          </span>
                        ) : (
                          <span className="text-xs text-[#9a93ad]/60">-</span>
                        )}
                      </td>
                      <td className="p-[14px_20px] text-sm font-bold text-indigo">
                        {p.price.toLocaleString("fr-FR")} FCFA
                      </td>
                      <td className="p-[14px_20px] text-[13.5px] font-bold text-indigo">
                        {p.unlimited_stock ? "Illimité" : p.stock}
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
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination component */}
        <div className="mt-4 border-t border-[#281950]/6 pt-4">
          <Pagination
            page={page}
            pageCount={meta.last_page || 1}
            perPage={perPage}
            total={meta.total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
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
        existingFeaturedCount={allProducts.filter((p) => p.featured).length}
      />
    </div>
  );
}
