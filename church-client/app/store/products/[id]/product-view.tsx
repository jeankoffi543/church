"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, X, Plus, Minus, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { Product, ProductVariant } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ProductAttributeRich {
  name: string;
  type: "text" | "color" | "select";
  values: (string | { value: string; color?: string; image?: string; price?: number; oldPrice?: number; stock?: number; description?: string })[];
}

export interface ProductRich extends Omit<Product, "attributes"> {
  attributes?: ProductAttributeRich[];
  oldPrice?: number;
  category?: string;
  badge?: string;
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

interface ProductViewProps {
  product: ProductRich;
}

export function ProductView({ product }: ProductViewProps) {
  // Gallery state
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);

  // Selected attributes
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (product.attributes && product.attributes.length > 0) {
      product.attributes.forEach((attr) => {
        if (attr.values.length > 0) {
          const firstVal = attr.values[0];
          initial[attr.name] = typeof firstVal === "object" ? firstVal.value : firstVal;
        }
      });
    }
    return initial;
  });

  // Cart state persisted via localStorage
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
  }, []);

  const saveCart = (items: OrderItem[]) => {
    setCartItems(items);
    if (typeof window !== "undefined") {
      localStorage.setItem("mfm_cart", JSON.stringify(items));
    }
  };

  // Find matching variant based on selections
  const selectedVariant = useMemo<ProductVariant | undefined>(() => {
    if (!product.variants || product.variants.length === 0) return undefined;
    return product.variants.find((variant) => {
      return Object.entries(selectedAttrs).every(
        ([attrName, selectedVal]) => variant.attributes[attrName] === selectedVal
      );
    });
  }, [product.variants, selectedAttrs]);

  // Aggregate selected option objects to extract overrides
  const selectedOptionObjects = useMemo(() => {
    const list: { price?: number; oldPrice?: number; stock?: number; description?: string; image?: string; value: string }[] = [];
    if (!product.attributes) return list;
    product.attributes.forEach((attr) => {
      const selectedVal = selectedAttrs[attr.name];
      const opt = attr.values.find((v) => {
        const valStr = typeof v === "object" ? v.value : v;
        return valStr === selectedVal;
      });
      if (opt && typeof opt === "object") {
        list.push(opt);
      }
    });
    return list;
  }, [product.attributes, selectedAttrs]);

  // Dynamic price calculation with fallbacks
  const currentPrice = useMemo<number>(() => {
    if (selectedVariant && selectedVariant.price_override !== undefined) {
      return selectedVariant.price_override;
    }
    // Option level price check
    const override = selectedOptionObjects.find((o) => o.price !== undefined);
    if (override && override.price !== undefined) {
      return override.price;
    }
    return product.base_price;
  }, [product.base_price, selectedVariant, selectedOptionObjects]);

  // Dynamic old price calculation with fallbacks
  const currentOldPrice = useMemo<number | undefined>(() => {
    if (selectedVariant && selectedVariant.old_price_override !== undefined) {
      return selectedVariant.old_price_override;
    }
    const override = selectedOptionObjects.find((o) => o.oldPrice !== undefined);
    if (override && override.oldPrice !== undefined) {
      return override.oldPrice;
    }
    return product.oldPrice;
  }, [product.oldPrice, selectedVariant, selectedOptionObjects]);

  // Dynamic description calculation with fallbacks
  const currentDescription = useMemo<string>(() => {
    const override = selectedOptionObjects.find((o) => o.description !== undefined);
    if (override && override.description) {
      return override.description;
    }
    return product.description || "";
  }, [product.description, selectedOptionObjects]);

  // Dynamic stock calculation with fallbacks
  const currentStock = useMemo<number | undefined>(() => {
    if (selectedVariant && selectedVariant.stock_count !== undefined) {
      return selectedVariant.stock_count;
    }
    const override = selectedOptionObjects.find((o) => o.stock !== undefined);
    if (override && override.stock !== undefined) {
      return override.stock;
    }
    return undefined;
  }, [selectedVariant, selectedOptionObjects]);

  // Image zoom handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  // Add to cart logic
  const handleAddToCart = () => {
    const existingIdx = cartItems.findIndex((item) => {
      if (selectedVariant) {
        return item.variant_id === selectedVariant.id;
      }
      return item.product_id === product.id && !item.variant_id;
    });

    const updated = [...cartItems];
    if (existingIdx > -1) {
      updated[existingIdx].quantity += 1;
    } else {
      updated.push({
        id: `item-${Date.now()}`,
        product_id: product.id,
        product_title: product.title,
        variant_id: selectedVariant?.id,
        quantity: 1,
        price: currentPrice,
        selected_attributes: { ...selectedAttrs },
        image: product.images[activeImageIdx] || product.images[0],
      });
    }
    saveCart(updated);
    setIsCartOpen(true);
  };

  // Change quantity in cart
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

  // Select attribute option and auto switch main image if linked
  const handleSelectAttribute = (attrName: string, value: string, linkedImageUrl?: string) => {
    setSelectedAttrs((prev) => ({ ...prev, [attrName]: value }));

    if (linkedImageUrl && product.images) {
      const idx = product.images.indexOf(linkedImageUrl);
      if (idx > -1) {
        setActiveImageIdx(idx);
      }
    }
  };

  // Subtotal calculation
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cartItems]);

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#211648]">
      
      {/* Fixed Sub-header Cart indicator just below the menu */}
      <div className="sticky top-[72px] z-40 bg-[rgba(250,248,244,0.88)] backdrop-blur-md border-b border-[#281950]/8 shadow-xs">
        <div className="max-w-[1240px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Breadcrumb back */}
          <Link href="/store" className="flex items-center gap-1.5 text-xs font-bold text-[#3a2a6e] hover:text-[#c8902e] transition">
            ← E-Boutique / {product.title}
          </Link>

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

      <div className="max-w-6xl mx-auto p-6 md:p-12 relative z-10">
        {/* Back Link / Breadcrumb */}
        <div className="mb-8 flex justify-between items-center border-b border-[#281950]/6 pb-6">
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#c8902e] uppercase block mb-1">E-Boutique</span>
            <h2 className="text-xl font-bold text-[#211648]/40">Espace Catalogue Fidèles</h2>
          </div>
          <Link href="/store">
            <Button variant="ghost" className="text-xs hover:bg-[#3a2a6e]/5 hover:text-[#211648] border border-[#281950]/16 rounded-xl px-4 py-2 cursor-pointer font-bold transition">
              ← Retour au catalogue
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* LEFT: Gallery with Zoom */}
          <div className="space-y-4">
            <div
              className="relative aspect-square w-full rounded-2xl border border-[#281950]/8 bg-[#f0eaf6] overflow-hidden cursor-zoom-in"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              {product.images && product.images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[activeImageIdx]}
                  alt={product.title}
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-75",
                    isZoomed && "scale-[2.2]"
                  )}
                  style={
                    isZoomed
                      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                      : undefined
                  }
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#281950]/20">
                  <ShoppingBag className="size-12 mb-2" />
                  <span>Aucun visuel disponible</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {product.images.map((img, idx) => (
                  <button
                    key={`thumb-${img}-${idx}`}
                    onClick={() => setActiveImageIdx(idx)}
                    className={cn(
                      "size-20 rounded-xl border-2 overflow-hidden bg-[#f0eaf6] shrink-0 transition cursor-pointer",
                      activeImageIdx === idx ? "border-[#c8902e]" : "border-[#281950]/8 opacity-75 hover:opacity-100"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="Vignette produit" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Details & Matrix Selectors */}
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                  product.is_digital ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 bg-cyan-50" : "bg-amber-500/10 text-amber-600 border border-amber-500/20 bg-amber-50"
                )}>
                  {product.is_digital ? "Numérique" : "Physique"}
                </span>
                {((selectedVariant && selectedVariant.stock_count === 0) || (currentStock === 0)) && (
                  <span className="bg-red-500/10 text-red-600 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50">
                    Rupture de Stock
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-[#211648]">{product.title}</h1>
              
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#c8902e]">
                  {currentPrice.toLocaleString("fr-FR")} FCFA
                </span>
                {currentOldPrice !== undefined && (
                  <span className="text-sm line-through text-[#9a93ad]">
                    {currentOldPrice.toLocaleString("fr-FR")} FCFA
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-[#5a5470] leading-relaxed font-normal bg-white border border-[#281950]/8 rounded-xl p-4 transition-opacity duration-300">
              {currentDescription || "Aucune description fournie pour cet article de culte."}
            </p>

            {/* Attributes Matrix Chooser */}
            {product.attributes && product.attributes.length > 0 && (
              <div className="space-y-6 border-t border-b border-[#281950]/8 py-6">
                {product.attributes.map((attr, attrIdx) => (
                  <div key={`chooser-${attr.name}-${attrIdx}`} className="space-y-2.5">
                    <span className="block text-xs font-bold text-[#9a93ad] uppercase tracking-wider">
                      {attr.name} : <span className="text-[#211648] font-bold">{selectedAttrs[attr.name]}</span>
                    </span>

                    <div className="flex flex-wrap gap-2.5">
                      {attr.values.map((optionItem) => {
                        const val = typeof optionItem === "object" ? optionItem.value : optionItem;
                        const label = typeof optionItem === "object" ? optionItem.value : optionItem;
                        const colorHex = typeof optionItem === "object" ? optionItem.color : (val.startsWith("#") && val.length <= 7 ? val : undefined);
                        const isSelected = selectedAttrs[attr.name] === val;

                        if (colorHex) {
                          return (
                            <button
                              key={`chip-${val}`}
                              onClick={() => handleSelectAttribute(attr.name, val, typeof optionItem === "object" ? optionItem.image : undefined)}
                              className={cn(
                                "h-9 rounded-full border-2 transition cursor-pointer flex items-center gap-1.5 px-2.5 bg-white",
                                isSelected ? "border-[#c8902e] bg-[#c8902e]/8" : "border-[#281950]/8 hover:border-[#281950]/20 hover:bg-[#281950]/4"
                              )}
                              title={label}
                            >
                              <span
                                className="size-5 rounded-full inline-block shrink-0 shadow-xs border border-[#281950]/12"
                                style={{ backgroundColor: colorHex }}
                              />
                              <span className="text-xs font-bold pr-1 text-[#211648]">{label}</span>
                              {isSelected && (
                                <Check className="size-3.5 text-[#211648] drop-shadow-xs" />
                              )}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={`chip-${val}`}
                            onClick={() => handleSelectAttribute(attr.name, val, typeof optionItem === "object" ? optionItem.image : undefined)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold tracking-wide border transition cursor-pointer select-none",
                              isSelected
                                ? "bg-[#3a2a6e]/10 text-[#211648] border-[#3a2a6e]"
                                : "bg-white text-[#5a5470] border-[#281950]/8 hover:bg-[#faf8f4] hover:text-[#211648]"
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Buy / Add to Cart CTA */}
            <div className="space-y-3">
              {selectedVariant ? (
                <div className="text-xs font-medium text-[#9a93ad] flex items-center gap-1.5 mb-1.5">
                  <span className="text-[#9a93ad]/70">SKU associé:</span>
                  <span className="font-mono text-[#211648]/80">{selectedVariant.sku}</span>
                  <span className="mx-2 text-[#281950]/10">|</span>
                  <span className="text-[#9a93ad]/70">Stock dispo:</span>
                  <span className={cn("font-bold", selectedVariant.stock_count > 0 ? "text-emerald-600" : "text-red-600")}>
                    {selectedVariant.stock_count}
                  </span>
                </div>
              ) : (
                currentStock !== undefined ? (
                  <div className="text-xs font-medium text-[#9a93ad] flex items-center gap-1.5 mb-1.5">
                    <span className="text-[#9a93ad]/70">Stock dispo:</span>
                    <span className={cn("font-bold", currentStock > 0 ? "text-emerald-600" : "text-red-600")}>
                      {currentStock}
                    </span>
                  </div>
                ) : (
                  product.variants && product.variants.length > 0 && (
                    <div className="text-xs text-amber-600 flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="size-3.5" />
                      Veuillez sélectionner vos options pour commander.
                    </div>
                  )
                )
              )}

              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={
                  (product.variants && product.variants.length > 0 && !selectedVariant) ||
                  (selectedVariant && selectedVariant.stock_count === 0) ||
                  (currentStock === 0)
                }
                className="w-full bg-gradient-to-br from-[#e2b85f] to-[#c8902e] text-[#211648] font-extrabold h-12 rounded-xl tracking-wide transition shadow-lg shadow-[#c8902e]/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none"
              >
                <ShoppingBag className="size-4 mr-2" /> Ajouter au panier
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CART DRAWER (Tiroir Éphémère matching mockup) */}
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
                      {item.image ? (
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
                            const isColor = v.startsWith("#") && v.length <= 7;
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
