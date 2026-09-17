import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BsStars,
  BsCheck2Square,
  BsMicFill,
  BsArrowRight,
  BsCpu,
  BsCalendarCheck,
  BsClockHistory,
  BsShieldCheck,
  BsLightningCharge,
} from "react-icons/bs";

export function Home() {
  const { user } = useAuth();

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
          <span>{today}</span>
        </div>
      </section>

      {/* 2. Hero Grid: Apple Journal Reflection + Linear Habit Progress */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Apple Journal Card: Daily Reflection Prompt (Span 7) */}
        <div className="lg:col-span-7 glass-card-ai rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-glow-violet">
          <div className="absolute top-0 right-0 w-64 h-64 bg-ai-violet-500/10 dark:bg-ai-violet-500/15 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-ai-violet-700 dark:text-ai-violet-300">
                <BsStars className="text-sm" /> Jurnal & Refleksi Harian
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-ai-violet-100 text-ai-violet-700 dark:bg-ai-violet-950/60 dark:text-ai-violet-300 border border-ai-violet-200 dark:border-ai-violet-800/60">
                AI Guided
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
              Bagaimana ritme dan energi Anda hari ini?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 leading-relaxed">
              Luangkan waktu 1 menit untuk merekam suara atau mengetik refleksi.
              AI Gemini akan mengekstraksi tindakan nyata, merangkum insight
              penting, dan memperbarui memori jangka panjang Anda.
            </p>

            {/* Simulated Audio Wave Visualizer */}
            <div className="mt-5 p-3 rounded-2xl bg-white/60 dark:bg-deep-900/60 border border-purple-100 dark:border-slate-800/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-ai-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <BsMicFill className="text-sm" />
              </div>
              <div className="flex-1 flex items-center gap-1 h-5 overflow-hidden">
                {[
                  40, 65, 80, 50, 90, 70, 45, 85, 95, 60, 40, 75, 55, 30, 60,
                  80, 45, 70,
                ].map((height, i) => (
                  <span
                    key={i}
                    style={{ height: `${height}%` }}
                    className="w-1 bg-ai-violet-400 dark:bg-ai-violet-500/70 rounded-full transition-all duration-300"
                  />
                ))}
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                Voice Ready
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-purple-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Tersinkronisasi otomatis dengan database
            </span>
            <Link
              to="/activity"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-xs text-white bg-gradient-to-r from-ai-violet-600 to-ai-violet-500 hover:from-ai-violet-500 hover:to-ai-violet-600 shadow-md shadow-ai-violet-500/25 transition-all duration-150 active:scale-95"
            >
              <span>Buka Refleksi Suara</span>
              <BsArrowRight />
            </Link>
          </div>
        </div>

        {/* Linear Habit & Activity Card (Span 5) */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-glow-sage">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sage-500/10 dark:bg-sage-500/15 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-sage-700 dark:text-sage-400">
                <BsCheck2Square className="text-sm" /> Habit & Aktivitas
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-sage-100 text-sage-800 dark:bg-sage-950/60 dark:text-sage-300 border border-sage-200 dark:border-sage-800/60">
                Daily Tasks
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
              Fokus Utama Hari Ini
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Pantau tugas penting dengan presisi waktu, kategori, dan status
              eksekusi.
            </p>

            {/* Quick List Preview */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-deep-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-md border-2 border-sage-500 flex items-center justify-center text-sage-500 text-[10px]">
                    ✓
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Morning Brief & Habit Check
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  08:00
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-deep-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-md border border-slate-400 dark:border-slate-600" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Review Aktivitas & Telemetry
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                  14:00
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              ID:{" "}
              <span className="text-sage-600 dark:text-sage-400">
                #HABIT-TODAY
              </span>
            </span>
            <Link
              to="/activity"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 dark:text-sage-400 hover:text-sage-800 dark:hover:text-sage-300 group"
            >
              <span>Buka Task Board</span>
              <BsArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Three-Column Mindful Features Grid */}
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
        <span>dev by syahrulMub @2026</span>
      </footer>
    </div>
  );
}

export default Home;
