"use client";

import React, { useState, useMemo } from "react";
import { ShoppingBag, X, Plus, Minus, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { Product, ProductVariant, OrderItem } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProductViewProps {
  product: Product;
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
          initial[attr.name] = attr.values[0];
        }
      });
    }
    return initial;
  });

  // Cart state
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Find matching variant based on selections
  const selectedVariant = useMemo<ProductVariant | undefined>(() => {
    if (!product.variants || product.variants.length === 0) return undefined;
    return product.variants.find((variant) => {
      return Object.entries(selectedAttrs).every(
        ([attrName, selectedVal]) => variant.attributes[attrName] === selectedVal
      );
    });
  }, [product.variants, selectedAttrs]);

  // Dynamic price calculation
  const currentPrice = useMemo<number>(() => {
    if (selectedVariant && selectedVariant.price_override !== undefined) {
      return selectedVariant.price_override;
    }
    return product.base_price;
  }, [product.base_price, selectedVariant]);

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

    if (existingIdx > -1) {
      const updated = [...cartItems];
      updated[existingIdx].quantity += 1;
      setCartItems(updated);
    } else {
      const newItem: OrderItem = {
        id: `item-${Date.now()}`,
        product_id: product.id,
        product_title: product.title,
        variant_id: selectedVariant?.id,
        quantity: 1,
        price: currentPrice,
        selected_attributes: { ...selectedAttrs },
      };
      setCartItems([...cartItems, newItem]);
    }
    setIsCartOpen(true);
  };

  // Change quantity in cart
  const updateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is OrderItem => item !== null)
    );
  };

  // Subtotal calculation
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cartItems]);

  return (
    <div className="min-h-screen bg-[#090514] text-white p-6 md:p-12 relative overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <span className="text-[10px] font-bold tracking-[0.2em] text-[#b270ff] uppercase block mb-1">E-Boutique</span>
          <h2 className="text-xl font-bold text-white/40">Espace Catalogue Fidèles</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* LEFT: Gallery with Zoom */}
          <div className="space-y-4">
            <div
              className="relative aspect-square w-full rounded-2xl border border-white/10 bg-[#160f33] overflow-hidden cursor-zoom-in"
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
                <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
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
                      "size-20 rounded-xl border-2 overflow-hidden bg-[#160f33] shrink-0 transition cursor-pointer",
                      activeImageIdx === idx ? "border-[#b270ff]" : "border-white/10 opacity-70 hover:opacity-100"
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
                  product.is_digital ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                )}>
                  {product.is_digital ? "Numérique" : "Physique"}
                </span>
                {selectedVariant && selectedVariant.stock_count === 0 && (
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Rupture de Stock
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white">{product.title}</h1>
              
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#e2b85f]">{currentPrice} €</span>
                {selectedVariant?.price_override !== undefined && (
                  <span className="text-sm line-through text-white/30">{product.base_price} €</span>
                )}
              </div>
            </div>

            <p className="text-sm text-white/60 leading-relaxed font-normal bg-[#1b1430]/30 border border-white/5 rounded-xl p-4">
              {product.description || "Aucune description fournie pour cet article de culte."}
            </p>

            {/* Attributes Matrix Chooser */}
            {product.attributes && product.attributes.length > 0 && (
              <div className="space-y-6 border-t border-b border-white/5 py-6">
                {product.attributes.map((attr, attrIdx) => (
                  <div key={`chooser-${attr.name}-${attrIdx}`} className="space-y-2.5">
                    <span className="block text-xs font-bold text-white/40 uppercase tracking-wider">
                      {attr.name} : <span className="text-white/90 font-mono font-bold">{selectedAttrs[attr.name]}</span>
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {attr.values.map((val) => {
                        const isSelected = selectedAttrs[attr.name] === val;
                        const isHexColor = attr.type === "color" && val.startsWith("#") && val.length <= 7;

                        if (isHexColor) {
                          return (
                            <button
                              key={`chip-${val}`}
                              onClick={() => setSelectedAttrs({ ...selectedAttrs, [attr.name]: val })}
                              className={cn(
                                "size-9 rounded-full border-2 transition cursor-pointer flex items-center justify-center relative",
                                isSelected ? "border-[#b270ff]" : "border-white/10 hover:border-white/30"
                              )}
                              title={val}
                            >
                              <span
                                className="size-7 rounded-full inline-block"
                                style={{ backgroundColor: val }}
                              />
                              {isSelected && (
                                <Check className="size-3.5 text-white absolute drop-shadow-md" />
                              )}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={`chip-${val}`}
                            onClick={() => setSelectedAttrs({ ...selectedAttrs, [attr.name]: val })}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold tracking-wide border transition cursor-pointer select-none",
                              isSelected
                                ? "bg-[#b270ff]/15 text-[#b270ff] border-[#b270ff]"
                                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                            )}
                          >
                            {val}
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
                <div className="text-xs font-medium text-white/40 flex items-center gap-1.5 mb-1.5">
                  <span className="text-white/30">SKU associé:</span>
                  <span className="font-mono text-white/60">{selectedVariant.sku}</span>
                  <span className="mx-2 text-white/10">|</span>
                  <span className="text-white/30">Stock dispo:</span>
                  <span className={cn("font-bold", selectedVariant.stock_count > 0 ? "text-emerald-400" : "text-red-400")}>
                    {selectedVariant.stock_count}
                  </span>
                </div>
              ) : (
                product.variants && product.variants.length > 0 && (
                  <div className="text-xs text-amber-400 flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="size-3.5" />
                    Veuillez sélectionner vos options pour commander.
                  </div>
                )
              )}

              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={
                  (product.variants && product.variants.length > 0 && !selectedVariant) ||
                  (selectedVariant && selectedVariant.stock_count === 0)
                }
                className="w-full bg-[#b270ff] hover:bg-[#b270ff]/95 text-white font-bold h-12 rounded-xl tracking-wide transition shadow-xl shadow-[#b270ff]/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ShoppingBag className="size-4 mr-2" /> Ajouter au panier
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CART DRAWER (TIROIR EPHEMERE) */}
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Sliding panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#130d22] border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col animate-slide-in-right">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-[#b270ff]" />
                <h3 className="font-black text-sm tracking-widest uppercase">Mon Panier</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/55">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#1b1430] border border-white/5 flex gap-4 items-start relative"
                  >
                    <div className="flex-1 space-y-2">
                      <h4 className="font-bold text-xs leading-snug">{item.product_title}</h4>
                      
                      {/* Attributes */}
                      {item.selected_attributes && Object.keys(item.selected_attributes).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.selected_attributes).map(([k, v]) => {
                            const isColor = v.startsWith("#") && v.length <= 7;
                            return (
                              <span
                                key={`${item.id}-${k}`}
                                className="px-1.5 py-0.5 rounded bg-[#0f091f] text-[9px] text-white/50 flex items-center gap-1 border border-white/5"
                              >
                                {k}: 
                                {isColor && (
                                  <span
                                    className="size-2 rounded-full inline-block"
                                    style={{ backgroundColor: v }}
                                  />
                                )}
                                <span className="font-semibold text-white/80">{v}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Pricing */}
                      <span className="block text-xs font-extrabold text-[#e2b85f]">
                        {item.price} € <span className="text-[10px] text-white/30 font-normal">/ unit</span>
                      </span>
                    </div>

                    {/* Qty edit buttons */}
                    <div className="flex items-center gap-2 bg-[#0f091f] border border-white/10 rounded-lg p-1 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded transition cursor-pointer"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-xs">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded transition cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-white/20 gap-2">
                  <ShoppingBag className="size-10 text-white/10" />
                  <span className="text-xs">Votre panier est vide</span>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {cartItems.length > 0 && (
              <div className="p-5 border-t border-white/5 bg-[#0d0918] space-y-4">
                <div className="flex justify-between items-baseline text-xs font-bold text-white/55">
                  <span>TOTAL ESTIMÉ</span>
                  <span className="text-xl font-black text-[#e2b85f]">{subtotal} €</span>
                </div>
                
                <Button
                  onClick={() => {
                    alert("Redirection simulée vers le guichet de paiement Paystack de la boutique.");
                    setIsCartOpen(false);
                  }}
                  className="w-full bg-[#b270ff] hover:bg-[#b270ff]/95 text-white font-bold h-11 rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#b270ff]/15"
                >
                  Procéder au règlement <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
