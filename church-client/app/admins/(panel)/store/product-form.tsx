"use client";

import React, { useState } from "react";
import { Plus, Trash2, RefreshCw, Save, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { Product, ProductAttribute, ProductVariant } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ProductFormProps {
  onSave?: (product: Product) => void;
  onCancel?: () => void;
}

export function ProductForm({ onSave, onCancel }: ProductFormProps) {
  // Product state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState(10);
  const [isDigital, setIsDigital] = useState(false);
  const [status, setStatus] = useState<"active" | "draft">("draft");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
  ]);

  // Attributes state
  const [attributes, setAttributes] = useState<ProductAttribute[]>([
    { name: "Format", type: "select", values: ["Broché", "Relié", "Numérique"] },
    { name: "Couleur", type: "color", values: ["#b270ff", "#130d22", "#e2b85f"] },
  ]);

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Helpers for adding attributes
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrType, setNewAttrType] = useState<"text" | "color" | "select">("text");

  // Add a new image
  const addImage = () => {
    if (imageUrlInput.trim()) {
      setImages([...images, imageUrlInput.trim()]);
      setImageUrlInput("");
    }
  };

  // Remove an image
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Add attribute option
  const addAttribute = () => {
    if (!newAttrName.trim()) return;
    // Check if attribute name already exists
    if (attributes.some((attr) => attr.name.toLowerCase() === newAttrName.trim().toLowerCase())) {
      return;
    }
    setAttributes([
      ...attributes,
      { name: newAttrName.trim(), type: newAttrType, values: [] },
    ]);
    setNewAttrName("");
  };

  // Remove attribute option
  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  // Add value to attribute
  const addValueToAttribute = (attrIndex: number, val: string) => {
    if (!val.trim()) return;
    const updated = [...attributes];
    if (!updated[attrIndex].values.includes(val.trim())) {
      updated[attrIndex].values.push(val.trim());
      setAttributes(updated);
    }
  };

  // Remove value from attribute
  const removeValueFromAttribute = (attrIndex: number, valIndex: number) => {
    const updated = [...attributes];
    updated[attrIndex].values = updated[attrIndex].values.filter((_, i) => i !== valIndex);
    setAttributes(updated);
  };

  // Generate Cartesian Product Variants
  const generateVariants = () => {
    if (attributes.length === 0) {
      setVariants([]);
      return;
    }

    // Filter out attributes with no values
    const activeAttrs = attributes.filter((attr) => attr.values.length > 0);
    if (activeAttrs.length === 0) {
      setVariants([]);
      return;
    }

    // Cartesian product engine helper
    const cartesian = (lists: string[][]): string[][] => {
      return lists.reduce<string[][]>(
        (a, b) => a.flatMap((d) => b.map((e) => [...d, e])),
        [[]]
      );
    };

    const attributeValueLists = activeAttrs.map((attr) => attr.values);
    const combinations = cartesian(attributeValueLists);

    const generated: ProductVariant[] = combinations.map((combo, idx) => {
      const variantAttrs: Record<string, string> = {};
      activeAttrs.forEach((attr, attrIdx) => {
        variantAttrs[attr.name] = combo[attrIdx];
      });

      // Construct a clean SKU based on product title and variant attributes
      const skuParts = [
        title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        ...combo.map((c) => c.replace("#", "").toLowerCase().replace(/[^a-z0-9]+/g, "-")),
      ].filter(Boolean);

      const generatedSku = skuParts.join("-") || `sku-${idx + 1}`;

      return {
        id: `var-${Date.now()}-${idx}`,
        sku: generatedSku,
        price_override: undefined,
        stock_count: 10,
        attributes: variantAttrs,
      };
    });

    setVariants(generated);
  };

  // Update specific variant field
  const updateVariant = (variantId: string, field: "sku" | "price_override" | "stock_count", value: string | number | undefined) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === variantId) {
          return {
            ...v,
            [field]: value,
          };
        }
        return v;
      })
    );
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const finalProduct: Product = {
      id: `prod-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      base_price: Number(basePrice) || 0,
      images,
      is_digital: isDigital,
      status,
      attributes,
      variants,
    };
    if (onSave) {
      onSave(finalProduct);
    }
  };

  return (
    <div className="bg-[#130d22] text-white p-6 md:p-8 rounded-2xl border border-white/5">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="mr-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition cursor-pointer"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div>
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#b270ff] uppercase">Boutique</span>
            <h1 className="text-2xl font-black tracking-tight mt-0.5">Créateur de Produit</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim()}
            className="bg-[#b270ff] text-white hover:bg-[#b270ff]/95 cursor-pointer font-bold shadow-lg shadow-[#b270ff]/20"
          >
            <Save className="size-4 mr-2" /> Enregistrer le produit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Info & Attributes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main info card */}
          <div className="bg-[#1b1430] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider mb-2">Informations Générales</h2>
            
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-white/50">Titre de l{"'"}article</span>
                <Input
                  type="text"
                  placeholder="ex: Livre : L&apos;Audace de la Foi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#0f091f] border-white/10 focus:border-[#b270ff] text-white placeholder-white/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-white/50">Description détaillée</span>
                <Textarea
                  placeholder="Présentez le produit, son auteur, son utilité..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="bg-[#0f091f] border-white/10 focus:border-[#b270ff] text-white placeholder-white/20 resize-none"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-white/50">Prix de base (€)</span>
                  <Input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="bg-[#0f091f] border-white/10 focus:border-[#b270ff] text-white"
                  />
                </label>

                <div className="flex flex-col justify-end">
                  <span className="mb-2 block text-xs font-bold text-white/50">Type de produit</span>
                  <label className="flex items-center gap-3 cursor-pointer bg-[#0f091f] border border-white/10 rounded-xl px-4 py-2.5 h-10 select-none">
                    <input
                      type="checkbox"
                      checked={isDigital}
                      onChange={(e) => setIsDigital(e.target.checked)}
                      className="size-4 accent-[#b270ff] rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold">Téléchargement numérique</span>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-white/50">Statut du produit</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "draft")}
                    className="w-full bg-[#0f091f] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#b270ff] outline-none h-10 cursor-pointer"
                  >
                    <option value="draft">Brouillon (Draft)</option>
                    <option value="active">Actif en boutique (Active)</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Dynamic Attributes Section */}
          <div className="bg-[#1b1430] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h2 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider">Attributs de personnalisation</h2>
                <p className="text-[10px] text-white/40 mt-1">Définissez les options comme la couleur, la taille, ou le format.</p>
              </div>
            </div>

            {/* Existing attributes */}
            <div className="space-y-4">
              {attributes.map((attr, attrIdx) => (
                <div
                  key={`attr-${attr.name}-${attrIdx}`}
                  className="bg-[#0f091f] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white/95">{attr.name}</span>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                        {attr.type}
                      </span>
                    </div>
                    {/* Value chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {attr.values.map((val, valIdx) => (
                        <div
                          key={`val-${val}-${valIdx}`}
                          className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-xs"
                        >
                          {attr.type === "color" && (
                            <span
                              className="size-3 rounded-full border border-white/20 inline-block shrink-0"
                              style={{ backgroundColor: val }}
                            />
                          )}
                          <span className="font-mono text-white/80">{val}</span>
                          <button
                            type="button"
                            onClick={() => removeValueFromAttribute(attrIdx, valIdx)}
                            className="text-white/30 hover:text-red-400 font-bold transition ml-0.5 cursor-pointer text-[10px]"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {attr.values.length === 0 && (
                        <span className="text-[11px] text-white/30 italic">Aucune option définie.</span>
                      )}
                    </div>
                  </div>

                  {/* Add option to this attribute */}
                  <div className="flex items-center gap-2">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const input = form.elements.namedItem("valInput") as HTMLInputElement;
                        addValueToAttribute(attrIdx, input.value);
                        input.value = "";
                      }}
                      className="flex gap-1 items-center"
                    >
                      <Input
                        name="valInput"
                        type={attr.type === "color" ? "color" : "text"}
                        placeholder={attr.type === "color" ? "#000000" : "Option..."}
                        className="bg-black/30 border-white/10 text-xs w-28 h-8 px-2 py-1"
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        className="h-8 text-[11px] font-bold bg-[#b270ff]/10 text-[#b270ff] hover:bg-[#b270ff]/20 px-2 cursor-pointer"
                      >
                        Ajouter
                      </Button>
                    </form>
                    <button
                      type="button"
                      onClick={() => removeAttribute(attrIdx)}
                      className="text-white/30 hover:text-red-400 transition p-2 cursor-pointer"
                      title="Supprimer l&apos;attribut"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new attribute panel */}
            <div className="bg-[#0f091f]/40 border border-dashed border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center gap-3">
              <div className="w-full md:flex-1">
                <Input
                  type="text"
                  placeholder="Nom de l&apos;attribut (ex: Taille, Format...)"
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.currentTarget.value)}
                  className="bg-[#0f091f] border-white/10 text-xs h-9"
                />
              </div>

              <div className="w-full md:w-36">
                <select
                  value={newAttrType}
                  onChange={(e) => setNewAttrType(e.target.value as "text" | "color" | "select")}
                  className="w-full bg-[#0f091f] border border-white/10 rounded-xl px-2 h-9 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="text">Texte libre</option>
                  <option value="color">Couleurs (Hex)</option>
                  <option value="select">Menu Select</option>
                </select>
              </div>

              <Button
                type="button"
                onClick={addAttribute}
                disabled={!newAttrName.trim()}
                className="w-full md:w-auto bg-[#b270ff]/20 text-[#b270ff] hover:bg-[#b270ff]/30 text-xs h-9 font-bold px-4 cursor-pointer"
              >
                <Plus className="size-3.5 mr-1.5" /> Créer
              </Button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Media images list & Matrix Variants generation */}
        <div className="space-y-6">
          {/* Images manager */}
          <div className="bg-[#1b1430] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider mb-2">Visuels du produit</h2>

            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="URL de l&apos;image..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="bg-[#0f091f] border-white/10 text-xs flex-1"
              />
              <Button
                type="button"
                onClick={addImage}
                className="bg-[#b270ff] text-white hover:bg-[#b270ff]/90 text-xs px-3 cursor-pointer"
              >
                Ajouter
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {images.map((img, idx) => (
                <div
                  key={`img-${idx}`}
                  className="relative aspect-square rounded-lg border border-white/10 bg-[#0f091f] overflow-hidden group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="Aperçu produit" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-red-400 font-bold text-xs cursor-pointer"
                  >
                    Retirer
                  </button>
                </div>
              ))}
              {images.length === 0 && (
                <div className="col-span-3 py-6 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center text-white/30 text-xs gap-2">
                  <ImageIcon className="size-6 text-white/20" />
                  <span>Aucun visuel inséré</span>
                </div>
              )}
            </div>
          </div>

          {/* Matrix Actions */}
          <div className="bg-[#1b1430] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider mb-1">Génération des variantes</h2>
            <p className="text-[10px] text-white/40 leading-relaxed">
              Le moteur va croiser toutes les valeurs d{"'"}attributs créées pour générer la grille de prix et de stock des articles.
            </p>
            <Button
              type="button"
              onClick={generateVariants}
              className="w-full bg-[#e2b85f] hover:bg-[#e2b85f]/90 text-[#130d22] font-black tracking-wide text-xs h-10 cursor-pointer shadow-lg shadow-[#e2b85f]/15"
            >
              <RefreshCw className="size-4 mr-2" /> Calculer la matrice ({attributes.reduce((acc, a) => acc * (a.values.length || 1), 1)} combinaisons)
            </Button>
          </div>
        </div>
      </div>

      {/* Variants matrix editable table */}
      {variants.length > 0 && (
        <div className="mt-8 bg-[#1b1430] border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider mb-4 border-b border-white/5 pb-3">
            Matrice des variantes générée
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-white/40">
                  <th className="py-2.5 font-bold uppercase tracking-wider">Combinaison</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider">Code SKU</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider">Surcharge Prix (€)</th>
                  <th className="py-2.5 font-bold uppercase tracking-wider">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {variants.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02]">
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {Object.entries(v.attributes).map(([key, value]) => {
                          const isHexColor = value.startsWith("#") && value.length <= 7;
                          return (
                            <span
                              key={`${v.id}-${key}`}
                              className="px-2 py-0.5 rounded bg-[#0f091f] text-[10px] text-white/70 border border-white/5 flex items-center gap-1.5"
                            >
                              <span className="text-white/30 font-medium">{key}:</span>
                              {isHexColor && (
                                <span
                                  className="size-2 rounded-full border border-white/10 inline-block"
                                  style={{ backgroundColor: value }}
                                />
                              )}
                              <span className="font-mono text-white/95">{value}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 pr-2">
                      <Input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariant(v.id, "sku", e.target.value)}
                        className="bg-[#0f091f] border-white/5 h-8 text-[11px] font-mono w-48 text-white focus:border-[#b270ff]"
                      />
                    </td>
                    <td className="py-3 pr-2">
                      <Input
                        type="number"
                        placeholder="Optionnel"
                        value={v.price_override === undefined ? "" : v.price_override}
                        onChange={(e) =>
                          updateVariant(
                            v.id,
                            "price_override",
                            e.target.value === "" ? undefined : Number(e.target.value)
                          )
                        }
                        className="bg-[#0f091f] border-white/5 h-8 text-[11px] w-24 text-white focus:border-[#b270ff]"
                      />
                    </td>
                    <td className="py-3">
                      <Input
                        type="number"
                        value={v.stock_count}
                        onChange={(e) => updateVariant(v.id, "stock_count", Number(e.target.value))}
                        className="bg-[#0f091f] border-white/5 h-8 text-[11px] w-24 text-white focus:border-[#b270ff]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
