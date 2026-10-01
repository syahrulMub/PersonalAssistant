import React, { useState, useEffect, useCallback } from "react";
import {
  BsStars,
  BsCalendarCheck,
  BsClockHistory,
  BsLightningCharge,
  BsBarChartFill,
  BsTags,
  BsCpu,
  BsArrowRepeat,
  BsExclamationTriangle,
  BsCheckCircle,
  BsHourglassSplit,
} from "react-icons/bs";
import { formatDateTime } from "../../context/DateFormat";

export function Dashboard({ embedded = false, onDataLoaded = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const response = await fetch("/api/dashboard", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Sesi login berakhir. Silakan login kembali.");
          }
          throw new Error("Gagal memuat data dashboard harian dari server.");
        }

        const result = await response.json();
        setData(result);
        if (onDataLoaded && result?.generatedAt) {
          onDataLoaded(result.generatedAt);
        }
      } catch (err) {
        console.error("Error fetching dashboard summary:", err);
        setError(
          err.message || "Terjadi kesalahan saat memuat data dashboard.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [onDataLoaded],
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Palet warna dinamis untuk progress bar kategori fokus
  const getProgressColor = (index) => {
    const colors = [
      "from-sage-500 to-emerald-400 dark:from-sage-400 dark:to-emerald-300",
      "from-ai-violet-500 to-purple-400 dark:from-ai-violet-400 dark:to-purple-300",
      "from-ai-amber-500 to-amber-400 dark:from-ai-amber-400 dark:to-amber-300",
      "from-sky-500 to-cyan-400 dark:from-sky-400 dark:to-cyan-300",
      "from-rose-500 to-pink-400 dark:from-rose-400 dark:to-pink-300",
    ];
    return colors[index % colors.length];
  };

  const getPillBadgeColor = (index) => {
    const colors = [
      "bg-sage-100 text-sage-800 dark:bg-sage-950/60 dark:text-sage-300 border-sage-200 dark:border-sage-800/70",
      "bg-purple-100 text-purple-800 dark:bg-ai-violet-950/60 dark:text-ai-violet-300 border-purple-200 dark:border-ai-violet-800/70",
      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/70",
      "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/70",
    ];
    return colors[index % colors.length];
  };

  // Cek apakah data kosong / belum pernah di-generate oleh scheduler
  const isDataEmpty =
    !data ||
    ((!data.focusDistributions || data.focusDistributions.length === 0) &&
      (!data.discoveredPattern || data.discoveredPattern.length === 0) &&
      (!data.habitTweakRecommendation ||
        data.habitTweakRecommendation.length === 0) &&
      (!data.activeDomains || data.activeDomains.length === 0) &&
      (!data.explorationKeywords || data.explorationKeywords.length === 0));

  return (
    <div
      className={`${
        embedded ? "space-y-6" : "space-y-8 max-w-7xl mx-auto pb-12"
      } animate-fade-in`}
    >
      {/* 1. Header Section (Hanya dirender pada mode standalone, tidak tampil saat embedded di Home) */}
      {!embedded && (
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-ai-violet-100 text-ai-violet-700 dark:bg-ai-violet-950/70 dark:text-ai-violet-300 border border-ai-violet-200 dark:border-ai-violet-800/60">
              <BsStars className="text-sm animate-twinkle" />
              AI Daily Digest
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-deep-850/80 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <BsCalendarCheck className="text-sage-500 text-sm" />
            <span>
              {data?.generatedAt ? formatDateTime(data.generatedAt) : "-"}
            </span>
          </div>
        </section>
      )}

      {/* 2. Error Feedback (Jika Ada Kendala) */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
          <BsExclamationTriangle className="text-lg flex-shrink-0" />
          <div className="flex-1 font-medium">{error}</div>
          <button
            onClick={() => fetchDashboardData(false)}
            className="px-3 py-1 rounded-xl text-xs font-semibold bg-red-100 dark:bg-red-900/60 hover:bg-red-200 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Loading Skeleton State */}
      {loading && !refreshing && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-64 rounded-3xl bg-slate-200/70 dark:bg-deep-850/70" />
            <div className="lg:col-span-5 h-64 rounded-3xl bg-slate-200/70 dark:bg-deep-850/70" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-56 rounded-3xl bg-slate-200/70 dark:bg-deep-850/70" />
            <div className="h-56 rounded-3xl bg-slate-200/70 dark:bg-deep-850/70" />
          </div>
          <div className="h-44 rounded-3xl bg-slate-200/70 dark:bg-deep-850/70" />
        </div>
      )}

      {/* 4. Empty State: Belum Ada Rekap Harian */}
      {!loading && isDataEmpty && (
        <div className="glass-card-ai rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5 border border-purple-100 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-ai-violet-600 to-sage-500 flex items-center justify-center text-white text-2xl shadow-glow-violet">
            <BsHourglassSplit className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Kompilasi Harian Sedang Disiapkan
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Scheduler AI mengompilasi rekap mingguan setiap hari secara
              otomatis pada pukul <strong>04:00 WIB</strong>. Terus catat
              aktivitas Anda dan berbincang dengan asisten suara agar data ritme
              Anda siap disintesis.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-sage-600 dark:text-sage-400">
            <BsCheckCircle />
            <span>Sistem Pemantau Aktif & Tersinkronisasi</span>
          </div>
        </div>
      )}

      {/* 5. Main Dashboard Content (Saat Data Tersedia) */}
      {!loading && !isDataEmpty && (
        <div className="space-y-8">
          {/* BARIS 1: DISTRIBUSI FOKUS ENERGI (7 Kolom) + DOMAIN AKTIF (5 Kolom) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Kartu Distribusi Fokus Energi */}
            <div className="lg:col-span-7 glass-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-glow-sage">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sage-100 dark:bg-sage-950/70 text-sage-600 dark:text-sage-400 flex items-center justify-center">
                      <BsBarChartFill className="text-sm" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Distribusi Fokus Energi
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Porsi alokasi kegiatan sepekan terakhir
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-sage-100 text-sage-800 dark:bg-sage-950/60 dark:text-sage-300 border border-sage-200 dark:border-sage-800/60">
                    Proporsi %
                  </span>
                </div>

                {/* Progress Bars Kategori */}
                <div className="mt-5 space-y-4">
                  {data?.focusDistributions &&
                  data.focusDistributions.length > 0 ? (
                    data.focusDistributions.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sage-500 dark:bg-sage-400" />
                            {item.category}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {item.percentage}%
                          </span>
                        </div>
                        {/* Bar Track */}
                        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-deep-900 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-800">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(idx)} transition-all duration-700 ease-out`}
                            style={{
                              width: `${Math.min(item.percentage, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-mono italic py-4 text-center">
                      Belum ada data distribusi kegiatan sepekan ini.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500">
                <span>Sumber: Log Aktivitas 7 Hari Terakhir</span>
                <span>Total 100% Normalized</span>
              </div>
            </div>

            {/* Kartu Domain & Ranah Aktif */}
            <div className="lg:col-span-5 glass-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-glow-violet">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-ai-violet-950/70 text-ai-violet-600 dark:text-ai-violet-300 flex items-center justify-center">
                      <BsTags className="text-sm" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Domain & Ranah Aktif
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Area proyek & rutinitas yang aktif bergerak
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-purple-100 text-purple-800 dark:bg-ai-violet-950/60 dark:text-ai-violet-300 border border-purple-200 dark:border-ai-violet-800/60">
                    Memori Aktif
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Ranah kehidupan dan proyek yang tercatat aktif dalam pembaruan
                  memori jangka panjang asisten:
                </p>

                {/* Tag Cloud Domain */}
                <div className="flex flex-wrap gap-2">
                  {data?.activeDomains && data.activeDomains.length > 0 ? (
                    data.activeDomains.map((domain, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-2xs transition-transform duration-150 hover:scale-105 ${getPillBadgeColor(idx)}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {domain}
                      </span>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-mono italic py-4 text-center w-full">
                      Belum ada domain memori yang aktif diperbarui.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] font-mono text-slate-400 dark:text-slate-500">
                Tersinkronisasi dengan katalog memori aktif AI
              </div>
            </div>
          </div>

          {/* BARIS 2: POLA TERDETEKSI (6 Kolom) + REKOMENDASI ATOMIC HABITS (6 Kolom) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kartu Pola & Dinamika Terdeteksi */}
            <div className="glass-card-ai rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300 hover:shadow-glow-violet">
              <div className="absolute top-0 right-0 w-48 h-48 bg-ai-violet-500/10 dark:bg-ai-violet-500/15 rounded-full blur-3xl -z-10 pointer-events-none" />

              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-ai-violet-600 text-white flex items-center justify-center shadow-sm">
                    <BsStars className="text-sm" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Pola & Dinamika Terdeteksi
                    </h3>
                    <span className="text-[11px] text-ai-violet-600 dark:text-ai-violet-400 font-mono">
                      Pola yang kami temukan dalam aktivitas anda
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-ai-violet-100 text-ai-violet-700 dark:bg-ai-violet-950/60 dark:text-ai-violet-300 border border-ai-violet-200 dark:border-ai-violet-800/60">
                  Observed Pattern
                </span>
              </div>

              <div className="space-y-3 mt-5">
                {data?.discoveredPattern &&
                data.discoveredPattern.length > 0 ? (
                  data.discoveredPattern.map((pattern, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white/70 dark:bg-deep-900/60 border border-ai-violet-200/50 dark:border-ai-violet-900/40 flex items-start gap-3 transition-colors hover:border-ai-violet-400/60 dark:hover:border-ai-violet-700/60"
                    >
                      <span className="w-6 h-6 rounded-lg bg-ai-violet-100 dark:bg-ai-violet-950 text-ai-violet-700 dark:text-ai-violet-300 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                        {pattern}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-mono italic py-4 text-center">
                    Tidak ada pola signifikan yang teridentifikasi sepekan ini.
                  </div>
                )}
              </div>
            </div>

            {/* Kartu Rekomendasi Ritme (Atomic Habits) */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300 hover:shadow-glow-amber">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl -z-10 pointer-events-none" />

              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                    <BsLightningCharge className="text-sm" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Penyesuaian Ritme (Atomic Habits)
                    </h3>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                      Aksi mikro praktis & pemanfaatan momentum
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  Actionable Tips
                </span>
              </div>

              <div className="space-y-3 mt-5">
                {data?.habitTweakRecommendation &&
                data.habitTweakRecommendation.length > 0 ? (
                  data.habitTweakRecommendation.map((tweak, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white/70 dark:bg-deep-900/60 border border-amber-200/50 dark:border-amber-900/40 flex items-start gap-3 transition-colors hover:border-amber-400/60 dark:hover:border-amber-700/60"
                    >
                      <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 mt-0.5">
                        💡
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                        {tweak}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-mono italic py-4 text-center">
                    Ritme kebiasaan saat ini berjalan stabil tanpa friksi.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BARIS 3: EKSPLORASI TEKNIS & PROBLEM SOLVING (Full Width Grid) */}
          <div className="glass-card rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-deep-900 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <BsCpu className="text-sm text-ai-violet-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Eksplorasi Konsep & Problem Solving
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Topik teknis, arsitektur, dan sintesis ide dalam percakapan
                    AI
                  </span>
                </div>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-slate-100 dark:bg-deep-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                Knowledge Sparks
              </span>
            </div>

            {/* Grid Kartu Keyword Eksplorasi */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.explorationKeywords &&
              data.explorationKeywords.length > 0 ? (
                data.explorationKeywords.map((spark, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-deep-900/50 border border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between space-y-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ai-violet-400/50 dark:hover:border-ai-violet-700/50 hover:shadow-xs"
                  >
                    <div>
                      <div className="inline-block px-2.5 py-1 rounded-lg bg-white dark:bg-deep-800 font-mono font-bold text-xs text-ai-violet-700 dark:text-ai-violet-300 border border-slate-200 dark:border-slate-700/80 shadow-2xs mb-2">
                        {spark.keyword}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {spark.context}
                      </p>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                      Topik Percakapan Ask AI
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-xs text-slate-400 dark:text-slate-500 font-mono italic py-6 text-center">
                  Belum ada topik eksplorasi konseptual yang terekam pada sesi
                  Ask AI sepekan ini.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Subtle Footer Info */}
      {!embedded && (
        <footer className="pt-4 text-center text-xs font-mono text-slate-400 dark:text-[#94A3B8]/70">
          AI Knowledge Compiler • Diperbarui setiap hari pukul 04:00 WIB
        </footer>
      )}
    </div>
  );
}

export default Dashboard;
