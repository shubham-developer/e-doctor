"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Paginated } from "./types";

const PAGE_SIZE = 50;

export function BillingPagination({
  pagination,
  page,
  onPageChange,
}: {
  pagination: Paginated<unknown>;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5">
      <span className="text-xs text-gray-500">
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of{" "}
        {pagination.total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs font-medium">
          {page} / {pagination.totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pagination.totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
