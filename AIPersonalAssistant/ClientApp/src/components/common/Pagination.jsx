import React from "react";

/**
 * Reusable Pagination Component
 * Menampilkan ringkasan halaman dan navigasi nomor halaman
 */
export const Pagination = ({ page, totalPages, totalCount, onPageChange }) => {
  if (!totalCount || totalPages <= 1) return null;

  return (
    <section className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:!border-slate-800/80 flex-wrap">
      <span className="text-xs font-mono text-slate-500 dark:!text-slate-400">
        Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>{" "}
        (Total {totalCount} data)
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => page > 1 && onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-white/95 dark:!bg-deep-850 border-slate-200 dark:!border-slate-800 text-slate-700 dark:!text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:!bg-deep-750 transition-colors"
        >
          &laquo; Prev
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all ${
              page === pageNum
                ? "bg-ai-violet-600 text-white shadow-xs"
                : "bg-white/95 dark:!bg-deep-850 text-slate-700 dark:!text-slate-200 border border-slate-200 dark:!border-slate-800 hover:bg-slate-50 dark:hover:!bg-deep-750"
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => page < totalPages && onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-white/95 dark:!bg-deep-850 border-slate-200 dark:!border-slate-800 text-slate-700 dark:!text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:!bg-deep-750 transition-colors"
        >
          Next &raquo;
        </button>
      </div>
    </section>
  );
};
