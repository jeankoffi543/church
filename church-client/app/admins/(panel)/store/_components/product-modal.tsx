"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

export interface ProductPayload {
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

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductPayload | null;
  categories: string[];
  onAddCategory: (newCategory: string) => void;
  onSave: (payload: ProductPayload) => void;
}

export function ProductModal({
  open,
  onOpenChange,
  product,
  categories,
  onAddCategory,
  onSave,
}: ProductModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [newCatVal, setNewCatVal] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [stock, setStock] = useState("");
  const [badge, setBadge] = useState("none");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [featured, setFeatured] = useState(false);
  const [images, setImages] = useState<string[]>([""]);
  const [variants, setVariants] = useState<VariantGroup[]>([]);

  // Load product if editing
  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setPrice(String(product.price));
      setOldPrice(product.oldPrice ? String(product.oldPrice) : "");
      setStock(String(product.stock));
      setBadge(product.badge || "none");
      setShortDesc(product.shortDesc);
      setLongDesc(product.longDesc);
      setFeatured(product.featured);
      setImages(product.images.length > 0 ? [...product.images] : [""]);
      setVariants(
        product.variants.map((v) => ({
          name: v.name,
          type: v.type || "text",
          options: v.options.map((o) => ({
            value: o.value,
            color: o.color,
            image: o.image,
            price: (o as any).price,
            oldPrice: (o as any).oldPrice,
            stock: (o as any).stock,
            description: (o as any).description,
          })),
        }))
      );
    } else {
      setName("");
      setCategory(categories[0] || "");
      setPrice("");
      setOldPrice("");
      setStock("");
      setBadge("none");
      setShortDesc("");
      setLongDesc("");
      setFeatured(false);
      setImages([""]);
      setVariants([]);
    }
  }, [product, categories, open]);

  const handleAddCategory = () => {
    const val = newCatVal.trim();
    if (!val) return;
    onAddCategory(val);
    setCategory(val);
    setNewCatVal("");
  };

  const handleAddImageField = () => {
    setImages((prev) => [...prev, ""]);
  };

  const handleUpdateImageUrl = (index: number, url: string) => {
    setImages((prev) => {
      const copy = [...prev];
      copy[index] = url;
      return copy;
    });
  };

  const handleRemoveImageField = (index: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.length > 0 ? filtered : [""];
    });
  };

  const handleAddVariantGroup = () => {
    setVariants((prev) => [...prev, { name: "", type: "text", options: [{ value: "" }] }]);
  };

  const handleUpdateVariantGroupName = (index: number, nameVal: string) => {
    setVariants((prev) =>
      prev.map((vg, i) => (i === index ? { ...vg, name: nameVal } : vg))
    );
  };

  const handleUpdateVariantGroupType = (index: number, typeVal: "text" | "color") => {
    setVariants((prev) =>
      prev.map((vg, i) =>
        i === index
          ? {
              ...vg,
              type: typeVal,
              options: vg.options.map((opt) => ({
                ...opt,
                color: typeVal === "color" ? opt.color || "#3a2a6e" : undefined,
              })),
            }
          : vg
      )
    );
  };

  const handleRemoveVariantGroup = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddVariantOption = (groupIndex: number) => {
    setVariants((prev) =>
      prev.map((vg, i) =>
        i === groupIndex
          ? {
              ...vg,
              options: [
                ...vg.options,
                { value: "", color: vg.type === "color" ? "#3a2a6e" : undefined },
              ],
            }
          : vg
      )
    );
  };

  const handleUpdateVariantOptionValue = (
    groupIndex: number,
    optionIndex: number,
    val: string
  ) => {
    setVariants((prev) =>
      prev.map((vg, i) =>
        i === groupIndex
          ? {
              ...vg,
              options: vg.options.map((opt, oi) =>
                oi === optionIndex ? { ...opt, value: val } : opt
              ),
            }
          : vg
      )
    );
  };

  const handleUpdateVariantOptionColor = (
    groupIndex: number,
    optionIndex: number,
    colorVal: string
  ) => {
    setVariants((prev) =>
      prev.map((vg, i) =>
        i === groupIndex
          ? {
              ...vg,
              options: vg.options.map((opt, oi) =>
                oi === optionIndex ? { ...opt, color: colorVal } : opt
              ),
            }
          : vg
      )
    );
  };

  const handleUpdateVariantOptionImage = (
    groupIndex: number,
    optionIndex: number,
    imageVal: string
  ) => {
    setVariants((prev) =>
      prev.map((vg, i) =>
        i === groupIndex
          ? {
              ...vg,
              options: vg.options.map((opt, oi) =>
                oi === optionIndex ? { ...opt, image: imageVal } : opt
              ),
            }
          : vg
      )
    );
  };

  const [activeOptionSettings, setActiveOptionSettings] = useState<{ groupIndex: number; optionIndex: number } | null>(null);

  const handleUpdateVariantOptionOverride = (
    groupIndex: number,
    optionIndex: number,
    field: "price" | "oldPrice" | "stock" | "description",
    val: any
  ) => {
    setVariants((prev) =>
      prev.map((vg, i) =>
        i === groupIndex
          ? {
              ...vg,
              options: vg.options.map((opt, oi) =>
                oi === optionIndex ? { ...opt, [field]: val } : opt
              ),
            }
          : vg
      )
    );
  };

  const handleRemoveVariantOption = (groupIndex: number, optionIndex: number) => {
    setVariants((prev) =>
      prev.map((vg, i) => {
        if (i !== groupIndex) return vg;
        const filtered = vg.options.filter((_, oi) => oi !== optionIndex);
        return {
          ...vg,
          options: filtered.length > 0 ? filtered : [{ value: "" }],
        };
      })
    );
  };

  const handleSave = () => {
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);

    onSave({
      name,
      category,
      price: isNaN(priceNum) ? 0 : priceNum,
      oldPrice: oldPrice ? parseFloat(oldPrice) : undefined,
      stock: isNaN(stockNum) ? 0 : stockNum,
      badge: badge === "none" ? "" : badge,
      images: images.map((img) => img.trim()).filter(Boolean),
      variants: variants
        .map((v) => ({
          name: v.name.trim(),
          type: v.type,
          options: v.options
            .map((o) => ({
              value: o.value.trim(),
              color: v.type === "color" ? o.color : undefined,
              image: o.image || undefined,
              price: o.price || undefined,
              oldPrice: o.oldPrice || undefined,
              stock: o.stock !== undefined ? o.stock : undefined,
              description: o.description || undefined,
            }))
            .filter((o) => o.value),
        }))
        .filter((v) => v.name && v.options.length > 0),
      shortDesc,
      longDesc,
      featured,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] bg-cream p-0 border border-indigo/10 shadow-2xl rounded-[22px] overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 flex flex-row items-center justify-between border-b border-[#281950]/10 bg-cream px-[26px] py-[22px]">
          <DialogTitle className="font-display text-[26px] font-semibold italic text-indigo">
            {product ? "Modifier le produit" : "Nouveau produit"}
          </DialogTitle>
        </DialogHeader>

        {/* Form Body */}
        <div className="max-h-[70vh] overflow-y-auto p-[26px] flex flex-col gap-[18px]">
          <div className="grid grid-cols-2 gap-[14px]">
            {/* Product Name */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[12.5px] font-bold text-body-soft">
                Nom du produit
              </Label>
              <Input
                type="text"
                placeholder="Ex : Bible d'étude Maison du Feu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl border-[#281950]/14 bg-white text-[14.5px] text-indigo placeholder:text-[#a99fbb]"
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-bold text-body-soft">
                Catégorie
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12 rounded-xl border-[#281950]/14 bg-white text-[14.5px] text-indigo">
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add new category */}
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-bold text-body-soft">
                Nouvelle catégorie
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Ajouter…"
                  value={newCatVal}
                  onChange={(e) => setNewCatVal(e.target.value)}
                  className="h-12 rounded-xl border-[#281950]/14 bg-white text-sm text-indigo placeholder:text-[#a99fbb]"
                />
                <Button
                  onClick={handleAddCategory}
                  className="h-12 rounded-xl bg-indigo px-4 font-extrabold text-[18px] text-white hover:bg-indigo-mid transition cursor-pointer shrink-0"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-bold text-body-soft">
                Prix (FCFA)
              </Label>
              <Input
                type="number"
                placeholder="25000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-12 rounded-xl border-[#281950]/14 bg-white text-[14.5px] text-indigo"
              />
            </div>

            {/* Old Price */}
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-bold text-body-soft">
                Ancien prix (optionnel)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                className="h-12 rounded-xl border-[#281950]/14 bg-white text-[14.5px] text-indigo"
              />
            </div>

            {/* Stock */}
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-bold text-body-soft">
                Stock
              </Label>
              <Input
                type="number"
                placeholder="50"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="h-12 rounded-xl border-[#281950]/14 bg-white text-[14.5px] text-indigo"
              />
            </div>

            {/* Badge */}
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-bold text-body-soft">
                Badge
              </Label>
              <Select value={badge} onValueChange={setBadge}>
                <SelectTrigger className="h-12 rounded-xl border-[#281950]/14 bg-white text-[14.5px] text-indigo">
                  <SelectValue placeholder="Choisir un badge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="Nouveau">Nouveau</SelectItem>
                  <SelectItem value="Promo">Promo</SelectItem>
                  <SelectItem value="Vedette">Vedette</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Short desc */}
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-bold text-body-soft">
              Description courte
            </Label>
            <Input
              type="text"
              placeholder="Une phrase d'accroche"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              className="h-12 rounded-xl border-[#281950]/14 bg-white text-[14.5px] text-indigo placeholder:text-[#a99fbb]"
            />
          </div>

          {/* Long desc */}
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-bold text-body-soft">
              Description longue
            </Label>
            <Textarea
              placeholder="Décris le produit en détail…"
              value={longDesc}
              onChange={(e) => setLongDesc(e.target.value)}
              className="min-h-[90px] rounded-xl border-[#281950]/14 bg-white px-[13px] py-[13px] text-[14.5px] text-indigo placeholder:text-[#a99fbb]"
            />
          </div>

          {/* Images list */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-[12.5px] font-bold text-body-soft">
                Images (URL) — illimitées
              </Label>
              <Button
                type="button"
                variant="ghost"
                onClick={handleAddImageField}
                className="h-8 rounded-lg bg-lilac px-3 text-[12.5px] font-bold text-indigo-mid hover:bg-lilac-300 transition cursor-pointer"
              >
                + Ajouter une image
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {images.map((imgUrl, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-lilac-300">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="size-full bg-lilac" />
                    )}
                  </div>
                  <Input
                    type="text"
                    placeholder="https://…"
                    value={imgUrl}
                    onChange={(e) => handleUpdateImageUrl(i, e.target.value)}
                    className="flex-1 h-11 rounded-lg border-[#281950]/14 bg-white text-xs text-indigo placeholder:text-[#a99fbb]"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleRemoveImageField(i)}
                    className="size-[38px] shrink-0 hover:bg-destructive/25 transition cursor-pointer text-sm"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Variant groups */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-[12.5px] font-bold text-body-soft">
                Variantes (taille, couleur, visuels…) — illimitées
              </Label>
              <Button
                type="button"
                variant="ghost"
                onClick={handleAddVariantGroup}
                className="h-8 rounded-lg bg-lilac px-3 text-[12.5px] font-bold text-indigo-mid hover:bg-lilac-300 transition cursor-pointer"
              >
                + Groupe de variantes
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {variants.map((vg, gi) => (
                <div
                  key={gi}
                  className="rounded-xl border border-[#281950]/10 bg-white p-3.5 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Nom du groupe (ex : Taille)"
                      value={vg.name}
                      onChange={(e) => handleUpdateVariantGroupName(gi, e.target.value)}
                      className="flex-1 h-10 rounded-lg border-[#281950]/14 bg-cream text-[13.5px] font-bold text-indigo placeholder:text-[#a99fbb] min-w-[150px]"
                    />
                    
                    {/* Visual Type Selector (Text vs Color bubbles) */}
                    <div className="flex items-center gap-1 rounded-lg border border-[#281950]/10 bg-cream p-0.5 select-none h-10">
                      <button
                        type="button"
                        onClick={() => handleUpdateVariantGroupType(gi, "text")}
                        className={cn(
                          "rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer h-full",
                          vg.type === "text"
                            ? "bg-indigo text-white shadow-xs"
                            : "text-body-soft hover:text-indigo"
                        )}
                      >
                        Texte
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateVariantGroupType(gi, "color")}
                        className={cn(
                          "rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer h-full",
                          vg.type === "color"
                            ? "bg-indigo text-white shadow-xs"
                            : "text-body-soft hover:text-indigo"
                        )}
                      >
                        Couleur
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleRemoveVariantGroup(gi)}
                      className="h-10 hover:bg-destructive/25 font-semibold text-xs transition cursor-pointer"
                    >
                      Supprimer
                    </Button>
                  </div>

                  {/* Options List */}
                  <div className="flex flex-wrap items-center gap-2">
                    {vg.options.map((opt, oi) => (
                      <div key={oi} className="relative flex flex-col items-center">
                        <div
                          className="flex items-center gap-1.5 rounded-lg border border-[#281950]/14 bg-cream p-1 overflow-hidden"
                        >
                          {/* Dynamic Color Picker Bubble */}
                          {vg.type === "color" && (
                            <div className="relative flex items-center justify-center size-6 shrink-0 rounded-full border border-[#281950]/20 overflow-hidden cursor-pointer" title="Sélecteur de couleur">
                              <input
                                type="color"
                                value={opt.color || "#3a2a6e"}
                                onChange={(e) =>
                                  handleUpdateVariantOptionColor(gi, oi, e.target.value)
                                }
                                className="absolute inset-0 size-full cursor-pointer opacity-0 z-10"
                              />
                              <div
                                style={{ backgroundColor: opt.color || "#3a2a6e" }}
                                className="size-full rounded-full"
                              />
                            </div>
                          )}

                          {/* Link Option to Product Image via Shadcn Select */}
                          {images.filter(Boolean).length > 0 && (
                            <Select
                              value={opt.image || "none"}
                              onValueChange={(val) =>
                                handleUpdateVariantOptionImage(gi, oi, val === "none" ? "" : val)
                              }
                            >
                              <SelectTrigger 
                                className="relative flex items-center justify-center size-6 shrink-0 rounded-md border border-[#281950]/20 bg-white overflow-hidden p-0 h-6 focus:ring-0 focus:ring-offset-0 cursor-pointer" 
                                title="Lier une photo de produit à cette option"
                              >
                                {opt.image ? (
                                  <Image
                                    src={opt.image}
                                    alt=""
                                    fill
                                    unoptimized
                                    className="object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="size-3.5 text-[#281950]/40" />
                                )}
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="none">Pas d&apos;image</SelectItem>
                                {images.filter(Boolean).map((img, imgIdx) => (
                                  <SelectItem key={imgIdx} value={img}>
                                    Image {imgIdx + 1}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          <input
                            type="text"
                            placeholder={vg.type === "color" ? "Nom (Rouge)" : "Option"}
                            value={opt.value}
                            onChange={(e) =>
                              handleUpdateVariantOptionValue(gi, oi, e.target.value)
                            }
                            className="w-20 bg-transparent px-1.5 py-1 text-xs text-indigo outline-none placeholder:text-[#a99fbb]"
                          />

                          {/* Settings button to trigger advanced overrides */}
                          <button
                            type="button"
                            onClick={() => {
                              if (activeOptionSettings?.groupIndex === gi && activeOptionSettings?.optionIndex === oi) {
                                setActiveOptionSettings(null);
                              } else {
                                setActiveOptionSettings({ groupIndex: gi, optionIndex: oi });
                              }
                            }}
                            className={cn(
                              "px-1 text-xs transition cursor-pointer shrink-0",
                              (opt.price || opt.stock !== undefined || opt.description || opt.oldPrice)
                                ? "text-amber-500 font-bold"
                                : "text-indigo/40 hover:text-indigo"
                            )}
                            title="Surcharges (Prix, Stock, Description)"
                          >
                            ⚙️
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveVariantOption(gi, oi)}
                            className="px-1 text-sm font-bold text-destructive hover:text-destructive/80 transition cursor-pointer"
                          >
                            ×
                          </button>
                        </div>

                        {/* Settings card overlay */}
                        {activeOptionSettings?.groupIndex === gi && activeOptionSettings?.optionIndex === oi && (
                          <div className="absolute top-9 left-0 w-60 p-3 bg-white border border-[#281950]/16 rounded-xl grid grid-cols-2 gap-2 shadow-xl z-30 animate-fade-in text-[#211648]">
                            <div className="col-span-2 flex items-center justify-between border-b border-[#281950]/6 pb-1">
                              <span className="text-[10px] font-bold text-[#c8902e] truncate max-w-[130px]">
                                Config : {opt.value || "Option"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveOptionSettings(null)}
                                className="text-[9.5px] font-bold text-red-500 hover:underline"
                              >
                                Fermer
                              </button>
                            </div>
                            
                            <div className="space-y-0.5">
                              <label className="text-[9px] font-bold text-indigo/60 block">Prix (FCFA)</label>
                              <Input
                                type="number"
                                placeholder="Surcharge"
                                value={opt.price || ""}
                                onChange={(e) =>
                                  handleUpdateVariantOptionOverride(gi, oi, "price", e.target.value ? Number(e.target.value) : undefined)
                                }
                                className="h-7 text-[10px] rounded-lg border-[#281950]/12 bg-[#faf8f4]"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <label className="text-[9px] font-bold text-indigo/60 block">Ancien (Promo)</label>
                              <Input
                                type="number"
                                placeholder="Surcharge"
                                value={opt.oldPrice || ""}
                                onChange={(e) =>
                                  handleUpdateVariantOptionOverride(gi, oi, "oldPrice", e.target.value ? Number(e.target.value) : undefined)
                                }
                                className="h-7 text-[10px] rounded-lg border-[#281950]/12 bg-[#faf8f4]"
                              />
                            </div>

                            <div className="space-y-0.5 col-span-2">
                              <label className="text-[9px] font-bold text-indigo/60 block">Stock dispo</label>
                              <Input
                                type="number"
                                placeholder="Surcharge"
                                value={opt.stock === undefined ? "" : opt.stock}
                                onChange={(e) =>
                                  handleUpdateVariantOptionOverride(gi, oi, "stock", e.target.value ? Number(e.target.value) : undefined)
                                }
                                className="h-7 text-[10px] rounded-lg border-[#281950]/12 bg-[#faf8f4]"
                              />
                            </div>

                            <div className="space-y-0.5 col-span-2">
                              <label className="text-[9px] font-bold text-indigo/60 block">Description</label>
                              <Textarea
                                placeholder="Description de surcharge..."
                                value={opt.description || ""}
                                onChange={(e) =>
                                  handleUpdateVariantOptionOverride(gi, oi, "description", e.target.value)
                                }
                                className="min-h-12 text-[9px] py-1 px-2 rounded-lg border-[#281950]/12 bg-[#faf8f4] leading-normal"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleAddVariantOption(gi)}
                      className="h-8 rounded-lg bg-lilac px-3 text-[12.5px] font-bold text-indigo-mid hover:bg-lilac-300 transition cursor-pointer"
                    >
                      + Option
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-indigo select-none">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="size-[18px] accent-gold-dark cursor-pointer"
            />
            Mettre en vedette sur la page d'accueil
          </label>
        </div>

        {/* Sticky footer actions */}
        <div className="sticky bottom-0 bg-cream border-t border-[#281950]/10 px-[26px] py-[18px] flex justify-end gap-3 rounded-b-[22px]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 rounded-xl border-[#281950]/16 px-[22px] text-sm font-semibold text-indigo-mid hover:border-gold-dark transition cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="h-12 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-7 text-[14.5px] font-extrabold text-indigo shadow-[0_10px_26px_rgba(200,144,46,0.3)] hover:-translate-y-0.5 hover:opacity-95 transition cursor-pointer border-transparent"
          >
            {product ? "Enregistrer" : "Ajouter le produit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
