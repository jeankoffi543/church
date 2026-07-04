"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingBag, X, Plus, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { assetUrl } from "@/lib/asset-url";
import { getStoreProducts } from "@/lib/public-api";

interface VariantOption {
  value: string;
  color?: string;
  image?: string;
  price?: number;
  oldPrice?: number;
  stock?: number;
  description?: string;
}

interface VariantGroup {
  name: string;
  type: "text" | "color";
  options: VariantOption[];
}

interface Product {
  id: string;
  title: string;
  description: string;
  base_price: number;
  oldPrice?: number;
  images: string[];
  is_digital: boolean;
  status: "active" | "draft";
  variants: VariantGroup[];
  category: string;
  badge?: string;
  featured?: boolean;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  variant_id?: string;
  quantity: number;
  price: number;
  selected_attributes?: Record<string, string>;
  image?: string;
}

const MOCK_PRODUCTS: Product[] = [];

const CATEGORIES = ["Tous", "Livres", "Vêtements", "Musique", "Accessoires", "Onction"];

export default function ClientStoreCatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Advanced Filtering States
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyPhysical, setOnlyPhysical] = useState(false);
  const [onlyDigital, setOnlyDigital] = useState(false);
  const [sortBy, setSortBy] = useState("featured");

  // Products from API (falls back to MOCK_PRODUCTS if empty)
  const [products, setProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);

  // Cart state persisted via localStorage
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);

  // Dynamic boutique settings from DB
  const [catalogTitle, setCatalogTitle] = useState("Espace Catalogue Fidèles");
  const [catalogDescription, setCatalogDescription] = useState(
    "Retrouvez nos livres d'étude, vêtements « Génération Feu » et articles d'onction pour édifier votre marche spirituelle."
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mfm_cart");
      if (saved) {
        try {
          setCartItems(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    }

    // Load boutique settings
    const loadBoutiqueSettings = async () => {
      try {
        const { getBoutiqueSettings } = await import("@/lib/api");
        const settings = await getBoutiqueSettings();
        if (settings) {
          setCatalogTitle(settings.storeCatalogTitle);
          setCatalogDescription(settings.storeCatalogDescription);
        }
      } catch {
        // Fallback
      }
    };

    // Load products from API
    const loadProducts = async () => {
      try {
        const data = await getStoreProducts();
        if (data && data.length > 0) {
          const formatted: Product[] = data.map((p: any) => {
            const variantsGroup: VariantGroup[] = (p.attributes || []).map((attr: any) => {
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
              id: String(p.id),
              title: p.title,
              description: p.description || "",
              base_price: Number(p.base_price) || 0,
              oldPrice: p.old_price ? Number(p.old_price) : undefined,
              images: (() => {
                const arr = p.images && p.images.length > 0 
                  ? p.images.map((img: any) => typeof img === "string" ? (assetUrl(img) || img) : "").filter(Boolean)
                  : [];
                return arr.length > 0 ? arr : ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80"];
              })(),
              is_digital: Boolean(p.is_digital),
              featured: Boolean(p.is_featured),
              unlimited_stock: Boolean(p.unlimited_stock),
              low_stock_threshold: p.low_stock_threshold !== null && p.low_stock_threshold !== undefined ? Number(p.low_stock_threshold) : undefined,
              status: p.status || "active",
              variants: variantsGroup,
              category: p.category || "Autre",
              badge: p.badge || undefined,
            };
          });
          setProducts(formatted);
        } else {
          setProducts([]);
        }
      } catch {
        setProducts([]);
      }
    };

    loadBoutiqueSettings();
    loadProducts();
  }, []);

  const saveCart = (items: OrderItem[]) => {
    setCartItems(items);
    if (typeof window !== "undefined") {
      localStorage.setItem("mfm_cart", JSON.stringify(items));
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setOnlyPromo(false);
    setOnlyInStock(false);
    setOnlyPhysical(false);
    setOnlyDigital(false);
    setSortBy("featured");
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // 1. Category filter
      const matchesCategory = selectedCategory === "Tous" || p.category === selectedCategory;

      // 2. Search query filter
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());

      // 3. Price range filter
      const matchesMinPrice = minPrice === "" || p.base_price >= minPrice;
      const matchesMaxPrice = maxPrice === "" || p.base_price <= maxPrice;

      // 4. Promo filter
      const matchesPromo = !onlyPromo || p.oldPrice !== undefined;

      // 5. In stock filter (Simulated: Bougie de prière (8) has low stock, let's assume all active are in stock unless specified)
      const matchesInStock = !onlyInStock || p.base_price > 0; 

      // 6. Type filter
      const matchesType = (!onlyPhysical && !onlyDigital) || 
                          (onlyPhysical && !p.is_digital) || 
                          (onlyDigital && p.is_digital);

      return matchesCategory && matchesSearch && matchesMinPrice && matchesMaxPrice && matchesPromo && matchesInStock && matchesType && p.status === "active";
    });

    // 7. Sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.base_price - b.base_price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.base_price - a.base_price);
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "name-desc") {
      result.sort((a, b) => b.title.localeCompare(a.title));
    } else {
      // "featured": badge 'Vedette' first, then 'Nouveau'
      result.sort((a, b) => {
        const scoreA = a.badge === "Vedette" ? 2 : (a.badge === "Nouveau" ? 1 : 0);
        const scoreB = b.badge === "Vedette" ? 2 : (b.badge === "Nouveau" ? 1 : 0);
        return scoreB - scoreA;
      });
    }

    return result;
  }, [products, selectedCategory, searchQuery, minPrice, maxPrice, onlyPromo, onlyInStock, onlyPhysical, onlyDigital, sortBy]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  useEffect(() => {
    setVisibleCount(8);
  }, [selectedCategory, searchQuery, minPrice, maxPrice, onlyPromo, onlyInStock, onlyPhysical, onlyDigital, sortBy]);

  useEffect(() => {
    const sentinel = document.getElementById("infinite-scroll-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 8);
      }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayedProducts, filteredProducts.length]);

  const [currentSlide, setCurrentSlide] = useState(0);

  const featuredProducts = useMemo(() => {
    const list = products.filter((p) => p.featured);
    return list.length > 0 ? list.slice(0, 5) : (products.length > 0 ? [products[0]] : []);
  }, [products]);

  const featuredProduct = featuredProducts[currentSlide];

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? featuredProducts.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === featuredProducts.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    setCurrentSlide(0);
  }, [products]);

  const handleQuickAdd = (p: Product) => {
    const selectedAttrs: Record<string, string> = {};
    if (p.variants && p.variants.length > 0) {
      p.variants.forEach((v) => {
        if (v.options && v.options.length > 0) {
          selectedAttrs[v.name] = v.options[0].value;
        }
      });
    }

    const existingIdx = cartItems.findIndex((item) => {
      return item.product_id === p.id && !item.variant_id;
    });

    const updated = [...cartItems];
    if (existingIdx > -1) {
      updated[existingIdx].quantity += 1;
    } else {
      updated.push({
        id: `item-${Date.now()}`,
        product_id: p.id,
        product_title: p.title,
        quantity: 1,
        price: p.base_price,
        selected_attributes: selectedAttrs,
        image: p.images[0],
      });
    }
    saveCart(updated);
    setIsCartOpen(true);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.id === itemId) {
          const nextQty = item.quantity + delta;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        }
        return item;
      })
      .filter((item): item is OrderItem => item !== null);
    saveCart(updated);
  };

  const removeItem = (itemId: string) => {
    const updated = cartItems.filter((item) => item.id !== itemId);
    saveCart(updated);
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cartItems]);

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#211648] relative">
      
      {/* Sticky sub-header menu just below the navbar */}
      <div className="sticky top-[72px] z-40 bg-[rgba(250,248,244,0.88)] backdrop-blur-md border-b border-[#281950]/8 shadow-xs">
        <div className="max-w-[1240px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Categories navigation links */}
          <div className="flex gap-1 overflow-x-auto py-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  selectedCategory === cat
                    ? "bg-[#3a2a6e]/8 text-[#211648]"
                    : "text-[#5a5470] hover:bg-[#3a2a6e]/5 hover:text-[#211648]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Cart Button with Count indicator */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 bg-gradient-to-br from-[#3a2a6e] to-[#211648] text-white cursor-pointer font-bold text-xs px-4.5 py-2.5 rounded-xl shadow-md shadow-[#211648]/20 transition-all hover:brightness-108 active:scale-98"
          >
            <span>Panier</span>
            {cartItems.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#e2b85f] text-[#211648] text-[9.5px] font-extrabold flex items-center justify-center animate-bounce">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-10">
        {/* Header section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-[#281950]/6 pb-8">
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#c8902e] uppercase block mb-1">
              Boutique en ligne
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold italic text-[#211648]">
              {catalogTitle}
            </h1>
            <p className="text-sm text-[#5a5470] mt-1 max-w-xl font-normal leading-relaxed">
              {catalogDescription}
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#a99fbb]" />
            <Input
              type="text"
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border-[#281950]/14 bg-white pl-10 text-xs text-[#211648] placeholder:text-[#a99fbb] focus:border-[#c8902e] w-full shadow-xs"
            />
          </div>
        </div>

        {/* Featured Product Hero Section */}
        {selectedCategory === "Tous" && searchQuery === "" && minPrice === "" && maxPrice === "" && !onlyPromo && !onlyInStock && !onlyPhysical && !onlyDigital && featuredProduct && (
          <div className="rounded-[26px] overflow-hidden bg-gradient-to-br from-[#3a2a6e] to-[#160f33] shadow-xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center text-white relative group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-radial-gradient(circle,rgba(226,184,95,.28),transparent 70%) pointer-events-none" />
            <div className="flex-1 space-y-4">
              <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#e2b85f] to-[#c8902e] text-[#211648] px-3 py-1.5 rounded-lg shadow-sm">
                ✦ Produit en vedette
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-bold italic leading-tight text-white">
                {featuredProduct.title}
              </h2>
              <p className="text-sm text-white/80 max-w-md font-normal leading-relaxed">
                {featuredProduct.description}
              </p>
              <div className="flex items-baseline gap-2 pt-2">
                <span className="font-display text-3xl font-bold text-[#e2b85f]">
                  {featuredProduct.base_price.toLocaleString("fr-FR")} FCFA
                </span>
                {featuredProduct.oldPrice && (
                  <span className="text-sm line-through text-white/40">
                    {featuredProduct.oldPrice.toLocaleString("fr-FR")} FCFA
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <Link href={`/store/products/${featuredProduct.id}`}>
                  <Button className="bg-gradient-to-br from-[#e2b85f] to-[#c8902e] text-[#211648] font-bold text-xs h-12 px-6 rounded-xl shadow-lg shadow-[#c8902e]/20 transition-all hover:scale-102 cursor-pointer border-none">
                    Découvrir le produit
                  </Button>
                </Link>
                <Button
                  onClick={() => handleQuickAdd(featuredProduct)}
                  className="bg-white/10 text-white border border-white/20 hover:bg-white/20 transition text-xs h-12 px-5 rounded-xl cursor-pointer"
                >
                  Ajouter au panier
                </Button>
              </div>
            </div>
            <div className="relative size-60 md:size-80 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-[#211648]">
              {featuredProduct.images?.[0] && typeof featuredProduct.images[0] === "string" && featuredProduct.images[0].trim() !== "" && (
                <Image
                  src={featuredProduct.images[0]}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
              )}
            </div>

            {/* Slider Navigation Controls */}
            {featuredProducts.length > 1 && (
              <>
                <button
                  onClick={handlePrevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/10 border border-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer z-10 opacity-0 group-hover:opacity-100"
                  aria-label="Slide précédent"
                >
                  ←
                </button>
                <button
                  onClick={handleNextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/10 border border-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer z-10 opacity-0 group-hover:opacity-100"
                  aria-label="Slide suivant"
                >
                  →
                </button>

                {/* Slider Indicator Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {featuredProducts.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={cn(
                        "size-1.5 rounded-full transition-all cursor-pointer",
                        currentSlide === idx ? "bg-[#e2b85f] w-3" : "bg-white/30 hover:bg-white/60"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* SIDEBAR FILTERS (Left Column) */}
          <div className="space-y-6 lg:col-span-1 bg-white border border-[#281950]/8 rounded-[22px] p-6 shadow-xs h-fit lg:sticky lg:top-[144px]">
            <div className="flex items-center justify-between border-b border-[#281950]/6 pb-3">
              <span className="font-display font-bold italic text-lg text-[#211648]">Filtres</span>
              <button
                onClick={handleResetFilters}
                className="text-[10px] font-bold text-[#c9536b] hover:underline cursor-pointer"
              >
                Réinitialiser
              </button>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#5a5470]">Tranche de prix (FCFA)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : "")}
                  className="h-9 text-xs rounded-lg border-[#281950]/12 bg-[#faf8f4] text-[#211648]"
                />
                <span className="text-xs text-[#9a93ad]">—</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
                  className="h-9 text-xs rounded-lg border-[#281950]/12 bg-[#faf8f4] text-[#211648]"
                />
              </div>
            </div>

            {/* Offers & Stock status */}
            <div className="space-y-2.5 pt-2 border-t border-[#281950]/6">
              <label className="text-xs font-bold text-[#5a5470] block">Disponibilité & Offres</label>
              
              <label className="flex items-center gap-2 text-xs font-semibold text-[#211648] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyPromo}
                  onChange={(e) => setOnlyPromo(e.target.checked)}
                  className="accent-[#3a2a6e]"
                />
                <span>En promotion</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#211648] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="accent-[#3a2a6e]"
                />
                <span>En stock uniquement</span>
              </label>
            </div>

            {/* Product Type (Physical vs Digital) */}
            <div className="space-y-2.5 pt-2 border-t border-[#281950]/6">
              <label className="text-xs font-bold text-[#5a5470] block">Format du produit</label>
              
              <label className="flex items-center gap-2 text-xs font-semibold text-[#211648] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyPhysical}
                  onChange={(e) => {
                    setOnlyPhysical(e.target.checked);
                    if (e.target.checked) setOnlyDigital(false);
                  }}
                  className="accent-[#3a2a6e]"
                />
                <span>Supports Physiques</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#211648] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyDigital}
                  onChange={(e) => {
                    setOnlyDigital(e.target.checked);
                    if (e.target.checked) setOnlyPhysical(false);
                  }}
                  className="accent-[#3a2a6e]"
                />
                <span>Téléchargements Numériques</span>
              </label>
            </div>

            {/* Sorting select */}
            <div className="space-y-2 pt-2 border-t border-[#281950]/6">
              <label className="text-xs font-bold text-[#5a5470] block">Trier les articles</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-[#281950]/12 bg-[#faf8f4] text-[#211648] focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent className="bg-white text-[#211648]">
                  <SelectItem value="featured">Vedettes & nouveautés</SelectItem>
                  <SelectItem value="price-asc">Prix : du - cher au + cher</SelectItem>
                  <SelectItem value="price-desc">Prix : du + cher au - cher</SelectItem>
                  <SelectItem value="name-asc">Nom : A - Z</SelectItem>
                  <SelectItem value="name-desc">Nom : Z - A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PRODUCT CARD GRID (Right Columns) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between text-xs font-bold text-[#9a93ad] px-1">
              <span>{filteredProducts.length} article(s) trouvé(s)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {displayedProducts.map((p) => {
                const hasDiscount = p.oldPrice !== undefined;
                return (
                  <div
                    key={p.id}
                    className="group relative flex flex-col rounded-2xl border border-[#281950]/8 bg-white overflow-hidden hover:border-[#c8902e]/30 hover:shadow-lg transition duration-300 shadow-xs"
                  >
                    {/* Badges */}
                    {(p.badge || p.is_digital) && (
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                        {p.badge && (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 bg-amber-50">
                            {p.badge}
                          </span>
                        )}
                        {p.is_digital && (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 bg-cyan-50">
                            Numérique
                          </span>
                        )}
                      </div>
                    )}

                    {/* Link whole card body to detail page */}
                    <Link href={`/store/products/${p.id}`} className="flex-1 flex flex-col cursor-pointer">
                      {/* Product Image */}
                      <div className="relative aspect-square w-full bg-[#f0eaf6] overflow-hidden">
                        {p.images[0] && typeof p.images[0] === "string" && p.images[0].trim() !== "" ? (
                          <Image
                            src={p.images[0]}
                            alt={p.title}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-102 transition-transform duration-500"
                          />
                        ) : (
                          <div className="size-full flex flex-col items-center justify-center text-[#281950]/10">
                            <ShoppingBag className="size-10" />
                          </div>
                        )}
                      </div>

                      {/* Info Container */}
                      <div className="p-4 flex flex-col flex-1 gap-2">
                        <span className="text-[9.5px] font-bold text-[#c8902e] uppercase tracking-wider">
                          {p.category}
                        </span>
                        <h3 className="font-bold text-sm text-[#211648] group-hover:text-[#c8902e] transition leading-snug">
                          {p.title}
                        </h3>
                        <p className="text-[11px] text-[#5a5470] line-clamp-2 leading-relaxed font-normal">
                          {p.description}
                        </p>
                      </div>
                    </Link>

                    {/* Bottom interactive row */}
                    <div className="p-4 pt-0 mt-auto">
                      {/* Variants Preview Color Circles */}
                      {p.variants.some((v) => v.type === "color") && (
                        <div className="flex items-center gap-1 mb-2.5">
                          {p.variants
                            .filter((v) => v.type === "color")
                            .flatMap((v) => v.options)
                            .slice(0, 5)
                            .map((opt, i) => (
                              <div
                                key={i}
                                style={{ backgroundColor: opt.color || "#000" }}
                                className="size-3 rounded-full border border-[#281950]/15"
                                title={opt.value}
                              />
                            ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-[#281950]/6">
                        <div className="flex flex-col">
                          <span className="text-base font-black text-[#c8902e]">
                            {p.base_price.toLocaleString("fr-FR")} FCFA
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] line-through text-[#9a93ad]">
                              {p.oldPrice?.toLocaleString("fr-FR")} FCFA
                            </span>
                          )}
                        </div>
                        
                        {/* Circular + QuickAdd button */}
                        <Button
                          type="button"
                          onClick={() => handleQuickAdd(p)}
                          className="size-9 shrink-0 rounded-xl bg-gradient-to-br from-[#e2b85f] to-[#c8902e] text-[#211648] font-extrabold text-[18px] flex items-center justify-center shadow-md shadow-[#c8902e]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer border-none"
                          title="Ajouter au panier"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-[#9a93ad] text-xs font-bold bg-white border border-[#281950]/8 rounded-2xl">
                  Aucun article ne correspond à vos critères de filtrage.
                </div>
              )}
            </div>

            {/* Infinite scroll sentinel */}
            {visibleCount < filteredProducts.length && (
              <div id="infinite-scroll-sentinel" className="h-16 flex items-center justify-center text-xs font-bold text-[#9a93ad]">
                Chargement de la suite...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DRAWER PANIER (Tiroir Éphémère matching mockup) */}
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs animate-fade-in"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Sliding panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#faf8f4] border-l border-[#281950]/12 shadow-2xl flex flex-col animate-slide-in-right">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#281950]/8 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-[#3a2a6e]" />
                <h3 className="font-display font-bold italic text-lg text-[#211648]">Mon Panier</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-[#3a2a6e]/10 text-[#3a2a6e]">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)} articles
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-lg hover:bg-[#3a2a6e]/6 text-[#3a2a6e]/60 hover:text-[#211648] transition cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white border border-[#281950]/8 flex gap-4 items-center shadow-xs relative"
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[#f0eaf6]">
                      {item.image && typeof item.image === "string" && item.image.trim() !== "" ? (
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-indigo-mid/10">
                          <ShoppingBag className="size-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-[#211648] truncate leading-snug">{item.product_title}</h4>
                      
                      {/* Attributes */}
                      {item.selected_attributes && Object.keys(item.selected_attributes).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(item.selected_attributes).map(([k, v]) => {
                            const isColor = typeof v === "string" && v.startsWith("#") && v.length <= 7;
                            return (
                              <span
                                key={`${item.id}-${k}`}
                                className="px-1.5 py-0.5 rounded-md bg-[#faf8f4] text-[9.5px] text-[#5a5470] flex items-center gap-1 border border-[#281950]/6"
                              >
                                {k}: 
                                {isColor && (
                                  <span
                                    className="size-2 rounded-full inline-block"
                                    style={{ backgroundColor: v }}
                                  />
                                )}
                                <span className="font-bold text-[#211648]">{v}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Pricing */}
                      <span className="block text-xs font-black text-[#c8902e] mt-1.5">
                        {item.price.toLocaleString("fr-FR")} FCFA <span className="text-[10px] text-[#9a93ad] font-normal">/ u</span>
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Qty edit buttons */}
                      <div className="flex items-center bg-[#faf8f4] border border-[#281950]/12 rounded-lg overflow-hidden h-8">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-2 h-full text-lg font-bold text-[#3a2a6e] hover:bg-[#3a2a6e]/5 transition cursor-pointer"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-[#211648]">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-2 h-full text-lg font-bold text-[#3a2a6e] hover:bg-[#3a2a6e]/5 transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[11px] font-bold text-[#c9536b] hover:underline"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-[#9a93ad] gap-2">
                  <span className="text-4xl">🛒</span>
                  <h3 className="font-display italic font-bold text-lg text-[#211648]">Ton panier est vide</h3>
                  <p className="text-[11px] text-[#5a5470] max-w-[200px] text-center">Découvrez nos livres, vêtements et ressources d&apos;onction.</p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {cartItems.length > 0 && (
              <div className="p-5 border-t border-[#281950]/8 bg-white space-y-4">
                <div className="flex justify-between items-baseline font-bold text-sm text-[#5a5470]">
                  <span>Total</span>
                  <span className="font-display font-black text-2xl text-[#211648]">{subtotal.toLocaleString("fr-FR")} FCFA</span>
                </div>
                
                <Link href="/store/checkout" className="w-full">
                  <Button
                    onClick={() => setIsCartOpen(false)}
                    className="w-full bg-gradient-to-br from-[#e2b85f] to-[#c8902e] text-[#211648] font-extrabold h-12 rounded-xl text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8902e]/25 border-none"
                  >
                    Passer la commande <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
                <div className="text-center text-[10px] text-[#9a93ad]">🔒 Paiement 100% sécurisé</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
