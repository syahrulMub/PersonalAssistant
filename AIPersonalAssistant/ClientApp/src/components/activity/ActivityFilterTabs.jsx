import React from "react";
import {
  BsJournalCheck,
  BsCalendarCheck,
  BsClockHistory,
  BsTrophy,
} from "react-icons/bs";

/**
 * Activity Filter Tabs Component
 * Menampilkan tab filter pill rapi, dinamis & proporsional
 */
export const ActivityFilterTabs = ({
  activeTab,
  onTabChange,
  totalCount,
  overdueCount,
}) => {
  return (
    <section className="flex items-center justify-between gap-3 flex-wrap">
      <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-800 flex-wrap gap-1">
        {/* Tab 1: Fokus Hari Ini */}
        <button
          type="button"
          onClick={() => onTabChange("today")}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "today"
              ? "bg-white/95 dark:!bg-deep-750 text-slate-900 dark:!text-white shadow-xs"
              : "text-slate-500 dark:!text-slate-400 hover:text-slate-800 dark:hover:!text-slate-200"
          }`}
        >
          <BsJournalCheck className="text-sm text-ai-violet-500" />
          <span>Fokus Hari Ini</span>
          {activeTab === "today" && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-ai-violet-100 text-ai-violet-700 dark:!bg-ai-violet-950/80 dark:!text-ai-violet-300">
              {totalCount}
            </span>
          )}
        </button>

        {/* Tab 2: Mendatang */}
        <button
          type="button"
          onClick={() => onTabChange("upcoming")}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "upcoming"
              ? "bg-white/95 dark:!bg-deep-750 text-slate-900 dark:!text-white shadow-xs"
              : "text-slate-500 dark:!text-slate-400 hover:text-slate-800 dark:hover:!text-slate-200"
          }`}
        >
          <BsCalendarCheck className="text-sm text-amber-500" />
          <span>Mendatang</span>
          {activeTab === "upcoming" && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-700 dark:!bg-amber-950/80 dark:!text-amber-300">
              {totalCount}
            </span>
          )}
        </button>

        {/* Tab 3: Terlewat (Dinamis: Berada di Samping Kanan Mendatang, Hanya Muncul Jika Ada Pending Kemarin) */}
        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => onTabChange("overdue")}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "overdue"
                ? "bg-white/95 dark:!bg-deep-750 text-rose-700 dark:!text-rose-300 shadow-xs"
                : "text-rose-600 dark:!text-rose-400 hover:text-rose-800 dark:hover:!text-rose-200"
            }`}
          >
            <BsClockHistory className="text-sm text-rose-500" />
            <span>Terlewat</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-100 text-rose-700 dark:!bg-rose-950/80 dark:!text-rose-300 font-bold animate-pulse">
              {overdueCount}
            </span>
          </button>
        )}

        {/* Tab 4: Pencapaian */}
        <button
          type="button"
          onClick={() => onTabChange("completed")}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "completed"
              ? "bg-white/95 dark:!bg-deep-750 text-slate-900 dark:!text-white shadow-xs"
              : "text-slate-500 dark:!text-slate-400 hover:text-slate-800 dark:hover:!text-slate-200"
          }`}
        >
          <BsTrophy className="text-sm text-emerald-500" />
          <span>Pencapaian</span>
          {activeTab === "completed" && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-700 dark:!bg-emerald-950/80 dark:!text-emerald-300">
              {totalCount}
            </span>
          )}
        </button>
      </div>
    </section>
  );
};
