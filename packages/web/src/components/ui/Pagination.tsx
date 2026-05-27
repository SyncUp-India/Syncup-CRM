'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onChange }: Props) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p: number;
          if (totalPages <= 5) p = i + 1;
          else if (page <= 3) p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else p = page - 2 + i;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-8 h-8 rounded text-xs font-medium transition ${
                p === page
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
