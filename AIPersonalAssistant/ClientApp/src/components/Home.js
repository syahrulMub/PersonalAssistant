import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Dashboard } from "./dashboard/Dashboard";
import { formatDateTime } from "../context/DateFormat";
import {
  BsCpu,
  BsCalendarCheck,
  BsClockHistory,
  BsShieldCheck,
} from "react-icons/bs";

export function Home() {
  const { user } = useAuth();
  const [recapDate, setRecapDate] = useState(null);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentTime = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* 1. Header Mindful Greeting */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-sage-100 text-sage-800 dark:bg-sage-950/60 dark:text-sage-300 border border-sage-200 dark:border-sage-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse" />
              Sistem Aktif & Terhubung
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              • {currentTime} WIB
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {getGreeting()},{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sage-600 via-sage-500 to-ai-violet-500 dark:from-sage-400 dark:via-sage-300 dark:to-ai-violet-400">
              {user?.fullName || user?.email?.split("@")[0] || "Teman"}
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-1 max-w-2xl">
            Selamat datang di ruang kerja yang tenang. Catat kebiasaan,
            refleksikan progres harian, dan biarkan AI membantu menyusun hari
            Anda secara mindful.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-deep-850/80 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <BsCalendarCheck className="text-sage-500 text-sm" />
          <span>
            {recapDate ? `Rekap: ${formatDateTime(recapDate)}` : today}
          </span>
        </div>
      </section>

      {/* 2. Daily AI Digest Dashboard Section */}
      <section className="pt-2">
        <Dashboard embedded={true} onDataLoaded={(d) => setRecapDate(d)} />
      </section>

      {/* 4. Three-Column Mindful Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card A: AI Features Engine */}
        <Link
          to="/ai-features"
          className="glass-card rounded-2xl p-5 group hover:border-ai-violet-500/40 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-ai-violet-100 dark:bg-ai-violet-950/70 text-ai-violet-600 dark:text-ai-violet-300 flex items-center justify-center text-lg">
              <BsCpu />
            </div>
            <span className="text-[11px] font-mono text-slate-400 group-hover:text-ai-violet-500 transition-colors">
              Settings →
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-ai-violet-600 dark:group-hover:text-ai-violet-400 transition-colors">
            Aktivasi Fitur AI
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
            Sesuaikan modul AI (Voice Reflection, Morning Brief, Recap Malam,
            Notifikasi Email).
          </p>
        </Link>

        {/* Card B: Scheduler & Background Reminders */}
        <Link
          to="/activity"
          className="glass-card rounded-2xl p-5 group hover:border-amber-500/40 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-300 flex items-center justify-center text-lg">
              <BsClockHistory />
            </div>
            <span className="text-[11px] font-mono text-slate-400 group-hover:text-amber-500 transition-colors">
              Review →
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            Pengingat Otomatis
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
            Background worker memantau jadwal aktivitas Anda secara berkala dan
            mengirimkan notifikasi tepat waktu.
          </p>
        </Link>

        {/* Card C: Sistem Keamanan & Hak Akses */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 dark:bg-sage-950/70 text-sage-600 dark:text-sage-300 flex items-center justify-center text-lg">
              <BsShieldCheck />
            </div>
            <span className="text-[11px] font-mono text-sage-600 dark:text-sage-400">
              Active
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Keamanan Data & Privasi
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
            Autentikasi berbasis JWT token dengan proteksi akses per user dan
            isolasi memori AI.
          </p>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center text-xs text-slate-400 dark:text-[#94A3B8] font-mono">
        <span>dev by syahrulMub with AI @2026</span>
      </footer>
    </div>
  );
}

export default Home;
