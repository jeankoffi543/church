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
  unlimited_stock?: boolean;
  low_stock_threshold?: number;
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
  unlimited_stock?: boolean;
  low_stock_threshold?: number;
  imageFiles?: File[];
}

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductPayload | null;
  categories: string[];
  onAddCategory: (newCategory: string) => void;
  onSave: (payload: ProductPayload) => void;
  existingFeaturedCount?: number;
}

export function ProductModal({
  open,
  onOpenChange,
  product,
  categories,
  onAddCategory,
  onSave,
  existingFeaturedCount = 0,
}: ProductModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [newCatVal, setNewCatVal] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unlimitedStock, setUnlimitedStock] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [badge, setBadge] = useState("none");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [featured, setFeatured] = useState(false);
  const [images, setImages] = useState<Array<{ file: File | null; url: string }>>([{ file: null, url: "" }]);
  const [variants, setVariants] = useState<VariantGroup[]>([]);

  // Load product if editing
  useEffect(() => {
    if (product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(product.name);
      setCategory(product.category);
      setPrice(String(product.price));
      setOldPrice(product.oldPrice ? String(product.oldPrice) : "");
      setStock(String(product.stock));
      setUnlimitedStock(!!product.unlimited_stock);
      setLowStockThreshold(product.low_stock_threshold !== undefined && product.low_stock_threshold !== null ? String(product.low_stock_threshold) : "");
      setBadge(product.badge || "none");
      setShortDesc(product.shortDesc);
      setLongDesc(product.longDesc);
      setFeatured(product.featured);
      setImages(
        product.images.length > 0
          ? product.images.map((img) => ({ file: null, url: img }))
          : [{ file: null, url: "" }]
      );
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
            unlimited_stock: (o as any).unlimited_stock,
            low_stock_threshold: (o as any).low_stock_threshold,
          })),
        }))
      );
    } else {
      setName("");
      setCategory(categories[0] || "");
      setPrice("");
      setOldPrice("");
      setStock("");
      setUnlimitedStock(false);
      setLowStockThreshold("");
      setBadge("none");
      setShortDesc("");
      setLongDesc("");
      setFeatured(false);
      setImages([{ file: null, url: "" }]);
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

  const [isDragging, setIsDragging] = useState(false);

  const handleAddImageField = () => {
    setImages((prev) => [...prev, { file: null, url: "" }]);
  };

  const handleUpdateImageUrl = (index: number, url: string) => {
    setImages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], url };
      return copy;
    });
  };

  const handleRemoveImageField = (index: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.length > 0 ? filtered : [{ file: null, url: "" }];
    });
  };

  const handleUploadFiles = (fileList: FileList) => {
    const filesArray = Array.from(fileList);
    const newItems: Array<{ file: File; url: string }> = [];

    filesArray.forEach((file) => {
      if (file.type.startsWith("image/")) {
        newItems.push({
          file: file,
          url: URL.createObjectURL(file),
        });
      }
    });

    if (newItems.length > 0) {
      setImages((prev) => {
        const filtered = prev.filter((item) => item.url.trim() !== "");
        return [...filtered, ...newItems];
      });
    }
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
    field: "price" | "oldPrice" | "stock" | "description" | "unlimited_stock" | "low_stock_threshold",
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
      unlimited_stock: unlimitedStock,
      low_stock_threshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : undefined,
      badge: badge === "none" ? "" : badge,
      images: images.map((img) => img.url.trim()).filter(Boolean),
      imageFiles: images.filter((img) => img.file !== null).map((img) => img.file as File),
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
              unlimited_stock: o.unlimited_stock !== undefined ? o.unlimited_stock : undefined,
              low_stock_threshold: o.low_stock_threshold !== undefined ? o.low_stock_threshold : undefined,
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

            {/* Stock & Seuil d'Alerte */}
            <div className="col-span-2 grid grid-cols-3 gap-[14px] bg-[#faf8f4] p-3.5 rounded-2xl border border-[#281950]/8">
              <div className="space-y-1.5 col-span-1">
                <Label className="text-[12.5px] font-bold text-[#211648]/80">
                  Stock disponible
                </Label>
                <Input
                  type="number"
                  placeholder="50"
                  disabled={unlimitedStock}
                  value={unlimitedStock ? "" : stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="h-12 rounded-xl border-[#281950]/14 bg-white text-[14.5px] text-indigo disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col justify-center space-y-1.5 col-span-1 pl-2">
                <Label className="text-[12.5px] font-bold text-[#211648]/80 cursor-pointer flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={unlimitedStock}
                    onChange={(e) => setUnlimitedStock(e.target.checked)}
                    className="size-4 rounded border-[#281950]/20 text-[#3a2a6e] focus:ring-[#3a2a6e]"
                  />
                  Stock illimité
                </Label>
                <span className="text-[9.5px] text-indigo/60 leading-tight">
                  Pour services, ressources numériques, etc.
                </span>
              </div>

              <div className="space-y-1.5 col-span-1">
                <Label className="text-[12.5px] font-bold text-[#211648]/80">
                  Seuil d&apos;alerte critique
                </Label>
                <Input
                  type="number"
                  placeholder="10"
                  disabled={unlimitedStock}
                  value={unlimitedStock ? "" : lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="h-12 rounded-xl border-[#281950]/14 bg-white text-[14.5px] text-indigo disabled:opacity-50"
                />
              </div>
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
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <Label className="text-[12.5px] font-bold text-[#211648]">
                Images du produit
              </Label>
              <Button
                type="button"
                variant="ghost"
                onClick={handleAddImageField}
                className="h-8 rounded-lg bg-[#f0eaf6] px-3 text-[12.5px] font-bold text-[#3a2a6e] hover:bg-[#281950]/10 transition cursor-pointer border-none"
              >
                + Saisir un lien URL
              </Button>
            </div>

            {/* Drag & Drop Input Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleUploadFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => document.getElementById("product-file-input")?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 select-none",
                isDragging 
                  ? "border-[#c8902e] bg-[#c8902e]/5" 
                  : "border-[#281950]/14 hover:border-[#3a2a6e] hover:bg-[#3a2a6e]/4"
              )}
            >
              <input
                id="product-file-input"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleUploadFiles(e.target.files);
                  }
                }}
              />
              <span className="text-3xl">📸</span>
              <div className="text-xs font-bold text-[#211648]">
                Glissez-déposez vos images ici ou <span className="text-[#3a2a6e] underline">parcourez vos fichiers</span>
              </div>
              <div className="text-[10px] text-[#9a93ad]">
                Supports : PNG, JPG, JPEG, WEBP, GIF
              </div>
            </div>

            {/* Images Previews and Links */}
            <div className="flex flex-col gap-2.5">
              {images.map((img, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#f0eaf6] border border-[#281950]/8 flex items-center justify-center">
                    {img.url ? (
                      <img
                        src={img.url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[#9a93ad]">Vide</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    {img.file && (
                      <span className="text-[10px] font-extrabold text-[#c8902e] bg-[#c8902e]/8 px-2 py-0.5 rounded-md self-start">
                        Fichier local : {img.file.name}
                      </span>
                    )}
                    <Input
                      type="text"
                      placeholder="https://exemple.com/image.jpg"
                      value={img.url.startsWith("blob:") ? "" : img.url}
                      disabled={Boolean(img.file)}
                      onChange={(e) => handleUpdateImageUrl(i, e.target.value)}
                      className="h-11 rounded-lg border-[#281950]/14 bg-white text-xs text-[#211648] placeholder:text-[#a99fbb]"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleRemoveImageField(i)}
                    className="size-[42px] shrink-0 hover:bg-destructive/25 transition cursor-pointer text-sm"
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
                          {images.filter((img) => img.url).length > 0 && (
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
                                  <img
                                    src={opt.image}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="size-3.5 text-[#281950]/40" />
                                )}
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="none">Pas d&apos;image</SelectItem>
                                {images.filter((img) => img.url).map((img, imgIdx) => (
                                  <SelectItem key={imgIdx} value={img.url}>
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
                            <div className="space-y-0.5 col-span-2 border-t border-[#281950]/6 pt-1.5 mt-1">
                               <label className="text-[9px] font-bold text-indigo/60 block">Paramètres de stock</label>
                               <div className="grid grid-cols-2 gap-1.5 mt-1">
                                 <div className="space-y-0.5">
                                   <label className="text-[8px] font-bold text-indigo/40 block">Qté dispo</label>
                                   <Input
                                     type="number"
                                     placeholder="Stock"
                                     disabled={!!opt.unlimited_stock}
                                     value={opt.unlimited_stock ? "" : (opt.stock === undefined ? "" : opt.stock)}
                                     onChange={(e) =>
                                       handleUpdateVariantOptionOverride(gi, oi, "stock", e.target.value ? Number(e.target.value) : undefined)
                                     }
                                     className="h-6 text-[9.5px] rounded-lg border-[#281950]/12 bg-[#faf8f4] disabled:opacity-50"
                                   />
                                 </div>
                                 <div className="flex items-center gap-1 mt-3">
                                   <input
                                     type="checkbox"
                                     checked={!!opt.unlimited_stock}
                                     onChange={(e) =>
                                       handleUpdateVariantOptionOverride(gi, oi, "unlimited_stock", e.target.checked)
                                     }
                                     className="size-3 rounded border-indigo/20 text-[#3a2a6e] focus:ring-[#3a2a6e]"
                                   />
                                   <span className="text-[8px] font-bold text-indigo/60 select-none">Illimité</span>
                                 </div>
                               </div>
                               
                               <div className="mt-1.5">
                                 <label className="text-[8px] font-bold text-indigo/40 block">Seuil d&apos;alerte</label>
                                 <Input
                                   type="number"
                                   placeholder="10"
                                   disabled={!!opt.unlimited_stock}
                                   value={opt.unlimited_stock ? "" : (opt.low_stock_threshold === undefined ? "" : opt.low_stock_threshold)}
                                   onChange={(e) =>
                                     handleUpdateVariantOptionOverride(gi, oi, "low_stock_threshold", e.target.value ? Number(e.target.value) : undefined)
                                   }
                                   className="h-6 text-[9.5px] rounded-lg border-[#281950]/12 bg-[#faf8f4] disabled:opacity-50"
                                 />
                                </div>
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
              onChange={(e) => {
                if (e.target.checked && existingFeaturedCount >= 5 && !product?.featured) {
                  alert("Le nombre maximum de produits vedettes est limité à 5.");
                  return;
                }
                setFeatured(e.target.checked);
              }}
              className="size-[18px] accent-gold-dark cursor-pointer"
            />
            Mettre en vedette sur la page d&apos;accueil
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
