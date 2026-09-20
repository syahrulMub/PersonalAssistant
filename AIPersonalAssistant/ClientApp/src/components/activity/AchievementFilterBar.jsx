import React from "react";
import {
  BsSearch,
  BsX,
  BsFunnel,
  BsArrowCounterclockwise,
} from "react-icons/bs";

const CATEGORIES = [
  { value: "all", label: "Semua Kategori" },
  { value: "Productivity", label: "💼 Productivity" },
  { value: "Learning", label: "📚 Learning" },
  { value: "Health", label: "❤️ Health" },
  { value: "Personal", label: "👤 Personal" },
  { value: "General", label: "📌 General" },
];

/**
 * AchievementFilterBar Component
 * Filter bar komprehensif untuk tracking pencapaian:
 * - Pencarian teks (judul, deskripsi, kategori)
 * - Filter kategori
 * - Filter tanggal penyelesaian
 * - Tombol reset filter & indikator jumlah hasil
 */
export const AchievementFilterBar = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedDate,
  onDateChange,
  onReset,
  totalCount,
  isFiltered,
}) => {
  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 shadow-sm space-y-3 transition-all animate-fade-in">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* 1. Input Pencarian Teks (Judul, Deskripsi, Kategori) */}
        <div className="relative flex-1 min-w-[200px]">
          <BsSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari judul, deskripsi, atau kategori..."
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:!text-slate-200 transition-colors"
              title="Hapus pencarian"
            >
              <BsX className="text-base" />
            </button>
          )}
        </div>

        {/* 2. Filter Kategori */}
        <div className="flex-shrink-0 min-w-[140px]">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium transition-all"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Filter Tanggal Penyelesaian */}
        <div className="relative flex-shrink-0 min-w-[150px]">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              title="Filter tanggal pencapaian"
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono transition-all [color-scheme:light] dark:[color-scheme:dark]"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => onDateChange("")}
                className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:!text-slate-200 transition-colors"
                title="Hapus filter tanggal"
              >
                <BsX className="text-base" />
              </button>
            )}
          </div>
        </div>

        {/* 4. Tombol Reset Filter */}
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:!text-rose-400 bg-rose-50 dark:!bg-rose-950/50 hover:bg-rose-100 dark:hover:!bg-rose-900/60 border border-rose-200 dark:!border-rose-800/60 flex items-center justify-center gap-1.5 transition-all shadow-xs flex-shrink-0"
            title="Reset seluruh filter"
          >
            <BsArrowCounterclockwise className="text-xs" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Info Bar Status Filter & Total Pencapaian */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:!text-slate-400 pt-1 border-t border-slate-100 dark:!border-slate-800/80 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <BsFunnel className="text-emerald-500 text-xs" />
          {isFiltered ? (
            <span>
              Menampilkan{" "}
              <strong className="text-emerald-600 dark:!text-emerald-400 font-mono font-bold">
                {totalCount}
              </strong>{" "}
              pencapaian terfilter
            </span>
          ) : (
            <span>
              Total{" "}
              <strong className="text-slate-700 dark:!text-slate-200 font-mono font-bold">
                {totalCount}
              </strong>{" "}
              pencapaian tercatat
            </span>
          )}
        </div>

        {/* Active Filter Chips */}
        {isFiltered && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:!bg-deep-900 text-slate-700 dark:!text-slate-300 font-mono text-[10px] border border-slate-200 dark:!border-slate-800">
                Teks: "{searchQuery}"
                <BsX
                  className="cursor-pointer hover:text-rose-500"
                  onClick={() => onSearchChange("")}
                />
              </span>
            )}
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:!bg-deep-900 text-slate-700 dark:!text-slate-300 font-mono text-[10px] border border-slate-200 dark:!border-slate-800">
                Kategori: {selectedCategory}
                <BsX
                  className="cursor-pointer hover:text-rose-500"
                  onClick={() => onCategoryChange("all")}
                />
              </span>
            )}
            {selectedDate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:!bg-deep-900 text-slate-700 dark:!text-slate-300 font-mono text-[10px] border border-slate-200 dark:!border-slate-800">
                Tanggal: {selectedDate}
                <BsX
                  className="cursor-pointer hover:text-rose-500"
                  onClick={() => onDateChange("")}
                />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementFilterBar;
