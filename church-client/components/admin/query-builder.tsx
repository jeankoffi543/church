"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterField {
  id: string;
  label: string;
  type: "text" | "select" | "async-select" | "date" | "number";
  options?: { value: string | number; label: string }[];
}

export type FilterOperator = "contains" | "equals" | "starts_with" | "ends_with";

export interface ActiveFilter {
  fieldId: string;
  operator: FilterOperator;
  // Filter values are intentionally polymorphic: managers compare them as
  // strings (`roles.includes(f.value)`), numbers (`Number(f.value)`), etc.
  // Keeping a single `any` here avoids rippling a union through all 8 managers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

const getOperatorsForType = (type: FilterField["type"]): { value: FilterOperator; label: string }[] => {
  switch (type) {
    case "text":
      return [
        { value: "contains", label: "Contient" },
        { value: "equals", label: "Est égal à" },
        { value: "starts_with", label: "Commence par" },
        { value: "ends_with", label: "Se termine par" },
      ];
    case "select":
    case "async-select":
    default:
      return [{ value: "equals", label: "Est égal à" }];
  }
};

interface QueryBuilderProps {
  fields: FilterField[];
  activeFilters: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
  asyncOptions?: Record<string, { value: string | number; label: string; sublabel?: string }[]>;
}

export function QueryBuilder({
  fields,
  activeFilters,
  onChange,
  asyncOptions = {},
}: QueryBuilderProps) {
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [activeComboboxFieldId, setActiveComboboxFieldId] = useState<string | null>(null);
  const [comboboxQuery, setComboboxQuery] = useState("");

  const availableFields = useMemo(() => {
    return fields.filter((f) => !activeFilters.some((af) => af.fieldId === f.id));
  }, [fields, activeFilters]);

  const handleOperatorChange = (fieldId: string, operator: FilterOperator) => {
    const next = activeFilters.map((f) =>
      f.fieldId === fieldId ? { ...f, operator } : f
    );
    onChange(next);
  };

  const handleValueChange = (fieldId: string, value: string | number) => {
    const next = activeFilters.map((f) =>
      f.fieldId === fieldId ? { ...f, value } : f
    );
    onChange(next);
  };

  const removeFilter = (fieldId: string) => {
    const next = activeFilters.filter((f) => f.fieldId !== fieldId);
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap select-none">
      {/* Active Filter Chips */}
      {activeFilters.map((filter) => {
        const field = fields.find((f) => f.id === filter.fieldId);
        if (!field) return null;

        const operators = getOperatorsForType(field.type);
        const optionsList = asyncOptions[field.id] || [];

        // Find label for async combobox select
        const selectedOption = optionsList.find((o) => o.value === filter.value);
        const selectedLabel = selectedOption ? selectedOption.label : "";

        const filteredComboboxOptions = optionsList.filter(
          (opt) =>
            opt.label.toLowerCase().includes(comboboxQuery.trim().toLowerCase()) ||
            (opt.sublabel && opt.sublabel.toLowerCase().includes(comboboxQuery.trim().toLowerCase()))
        );

        return (
          <div
            key={filter.fieldId}
            className="relative flex items-center gap-1.5 rounded-full border border-indigo/10 bg-[#faf8f4] pl-3.5 pr-2 py-1 text-xs text-indigo shadow-sm"
          >
            {/* Field label */}
            <span className="font-bold text-indigo/80">{field.label}</span>
            <span className="text-faint">:</span>

            {/* Operator select dropdown */}
            {operators.length > 1 ? (
              <select
                value={filter.operator}
                onChange={(e) => handleOperatorChange(filter.fieldId, e.target.value as FilterOperator)}
                className="bg-transparent border-0 py-0.5 px-0.5 outline-none text-gold-dark font-semibold cursor-pointer select-none"
              >
                {operators.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-gold-dark font-semibold px-0.5">{operators[0].label}</span>
            )}

            {/* Saisie finale */}
            {field.type === "text" && (
              <input
                type="text"
                value={filter.value}
                onChange={(e) => handleValueChange(filter.fieldId, e.target.value)}
                placeholder="Valeur..."
                className="bg-transparent border-b border-dashed border-indigo/20 px-1 py-0.5 outline-none w-24 text-indigo focus:border-gold placeholder:text-faint"
              />
            )}

            {field.type === "select" && (
              <select
                value={filter.value}
                onChange={(e) => handleValueChange(filter.fieldId, e.target.value)}
                className="bg-transparent border-0 py-0.5 px-1 outline-none text-indigo font-semibold cursor-pointer"
              >
                <option value="">Tous</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {field.type === "async-select" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveComboboxFieldId(
                      activeComboboxFieldId === filter.fieldId ? null : filter.fieldId
                    )
                  }
                  className="flex items-center gap-1 bg-transparent hover:bg-indigo/5 rounded px-1.5 py-0.5 font-semibold text-indigo cursor-pointer"
                >
                  <span className="truncate max-w-28">
                    {selectedLabel || <span className="text-faint italic font-normal">Sélectionner…</span>}
                  </span>
                  <ChevronDown className="size-3 text-faint" />
                </button>

                {activeComboboxFieldId === filter.fieldId && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-transparent cursor-default"
                      onClick={() => {
                        setActiveComboboxFieldId(null);
                        setComboboxQuery("");
                      }}
                    />
                    <div className="absolute top-full left-0 mt-2 z-50 w-52 rounded-xl border border-[rgba(40,25,80,0.12)] bg-white p-2 shadow-[0_12px_40px_rgba(22,15,51,0.14)] text-left">
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={comboboxQuery}
                        onChange={(e) => setComboboxQuery(e.target.value)}
                        className="w-full mb-1.5 px-2 py-1 text-xs border border-indigo/5 bg-[#faf8f4] rounded-lg outline-none focus:border-gold"
                      />
                      <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleValueChange(filter.fieldId, "");
                            setActiveComboboxFieldId(null);
                            setComboboxQuery("");
                          }}
                          className={cn(
                            "w-full text-left px-2 py-1 rounded transition text-[11px]",
                            filter.value === "" ? "bg-cream text-indigo font-bold" : "hover:bg-cream text-indigo"
                          )}
                        >
                          — Aucun responsable —
                        </button>
                        {filteredComboboxOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              handleValueChange(filter.fieldId, opt.value);
                              setActiveComboboxFieldId(null);
                              setComboboxQuery("");
                            }}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded transition text-[11px] flex flex-col gap-0.5",
                              filter.value === opt.value ? "bg-cream text-indigo font-bold" : "hover:bg-cream text-indigo"
                            )}
                          >
                            <span>{opt.label}</span>
                            {opt.sublabel && (
                              <span className="text-[9px] text-faint">{opt.sublabel}</span>
                            )}
                          </button>
                        ))}
                        {filteredComboboxOptions.length === 0 && (
                          <div className="text-[10px] text-faint p-2 text-center">
                            Aucun résultat
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeFilter(filter.fieldId)}
              className="text-faint hover:text-live rounded-full p-0.5 transition cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}

      {/* Add Filter Toggle Button (renders if available fields remain) */}
      {availableFields.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
            className="flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-xl border border-indigo/10 bg-white text-indigo hover:bg-cream/40 transition shadow-sm"
            title="Ajouter un filtre"
          >
            <SlidersHorizontal className="size-4" />
          </button>

          {isAddDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-transparent cursor-default"
                onClick={() => setIsAddDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-[rgba(40,25,80,0.12)] bg-white py-1.5 shadow-[0_12px_40px_rgba(22,15,51,0.14)]">
                {availableFields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => {
                      const operators = getOperatorsForType(field.type);
                      const defaultOp = operators[0].value;
                      let defaultVal: string | number = "";
                      if (field.type === "select" && field.options && field.options.length > 0) {
                        defaultVal = field.options[0].value;
                      }
                      onChange([
                        ...activeFilters,
                        { fieldId: field.id, operator: defaultOp, value: defaultVal },
                      ]);
                      setIsAddDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-indigo transition hover:bg-cream cursor-pointer font-medium"
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
