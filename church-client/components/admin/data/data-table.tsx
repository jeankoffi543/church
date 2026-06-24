"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

import { Pagination } from "@/app/admins/(panel)/_components/pagination";
import { cn } from "@/lib/utils";

import type { Column, SortDir } from "./use-data-table";

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  onPageChange: (n: number) => void;
  onPerPageChange: (n: number) => void;
  itemLabel?: string;
};

/** Standard data table: sortable headers, branded surface, anchored pagination. */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  sortBy,
  sortDir,
  onSort,
  emptyLabel = "Aucun élément.",
  empty,
  onRowClick,
  rowClassName,
  pagination,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
  sortBy: string | null;
  sortDir: SortDir;
  onSort: (id: string) => void;
  emptyLabel?: string;
  empty?: ReactNode;
  /** Makes the whole row interactive (e.g. open a detail panel). */
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  pagination?: PaginationProps;
}) {
  return (
    <div className="relative z-10 overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-indigo">
          <thead className="border-b border-[rgba(40,25,80,0.08)] bg-cream text-xs font-bold tracking-wider text-body uppercase select-none">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    "px-6 py-4",
                    col.align === "right" && "text-right",
                    col.sortable && "cursor-pointer transition hover:text-gold-dark",
                    col.headerClassName,
                  )}
                  onClick={col.sortable ? () => onSort(col.id) : undefined}
                >
                  <div className={cn("flex items-center gap-1.5", col.align === "right" && "justify-end")}>
                    <span>{col.header}</span>
                    {col.sortable && <SortChevron active={sortBy === col.id} dir={sortDir} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
            {rows.map((row) => (
              <tr
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("transition-colors hover:bg-cream/40", onRowClick && "cursor-pointer", rowClassName?.(row))}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn("px-6 py-3", col.align === "right" && "text-right", col.className)}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-xs text-body">
                  {empty ?? emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={pagination.total}
          perPage={pagination.perPage}
          onPageChange={pagination.onPageChange}
          onPerPageChange={pagination.onPerPageChange}
          itemLabel={pagination.itemLabel}
        />
      )}
    </div>
  );
}

function SortChevron({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || !dir) return <ChevronsUpDown className="size-3 shrink-0 text-faint" />;
  return dir === "asc" ? (
    <ChevronUp className="size-3 shrink-0 text-gold-dark" />
  ) : (
    <ChevronDown className="size-3 shrink-0 text-gold-dark" />
  );
}
