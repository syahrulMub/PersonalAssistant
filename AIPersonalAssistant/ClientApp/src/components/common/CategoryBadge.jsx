import React from "react";

/**
 * Reusable Category Badge Component
 * Merender badge pill berwarna elegan sesuai kategori aktivitas
 */
export const CategoryBadge = ({ category, className = "" }) => {
  const cat = (category || "General").toLowerCase();

  if (cat === "productivity") {
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-blue-50 text-blue-700 dark:!bg-blue-950/60 dark:!text-blue-300 border border-blue-200/70 dark:!border-blue-800/60 ${className}`}
      >
        💼 Productivity
      </span>
    );
  }

  if (cat === "learning") {
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 dark:!bg-emerald-950/60 dark:!text-emerald-300 border border-emerald-200/70 dark:!border-emerald-800/60 ${className}`}
      >
        📚 Learning
      </span>
    );
  }

  if (cat === "health") {
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-50 text-rose-700 dark:!bg-rose-950/60 dark:!text-rose-300 border border-rose-200/70 dark:!border-rose-800/60 ${className}`}
      >
        ❤️ Health
      </span>
    );
  }

  if (cat === "personal") {
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-purple-50 text-purple-700 dark:!bg-purple-950/60 dark:!text-purple-300 border border-purple-200/70 dark:!border-purple-800/60 ${className}`}
      >
        👤 Personal
      </span>
    );
  }

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 dark:!bg-slate-800 dark:!text-slate-300 border border-slate-200 dark:!border-slate-700 ${className}`}
    >
      📌 {category || "General"}
    </span>
  );
};
