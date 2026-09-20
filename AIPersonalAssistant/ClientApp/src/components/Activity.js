import React, { useState, useEffect } from "react";
import { BsStars, BsPlusLg } from "react-icons/bs";
import CreateActivity from "./CreateActivity";
import DailyReflection from "./DailyReflection";
import { ToastFeedback } from "./common/ToastFeedback";
import { ModalWrapper } from "./common/ModalWrapper";
import { Pagination } from "./common/Pagination";
import { EmptyState } from "./common/EmptyState";
import { ActivityActionBar } from "./activity/ActivityActionBar";
import { ActivityFilterTabs } from "./activity/ActivityFilterTabs";
import { ActivityCard } from "./activity/ActivityCard";
import { ActivityDetailModal } from "./activity/ActivityDetailModal";
import { QuickVoiceModal } from "./activity/QuickVoiceModal";
import { VoiceConfirmationModal } from "./activity/VoiceConfirmationModal";
import { AchievementFilterBar } from "./activity/AchievementFilterBar";

export function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs: "today" | "upcoming" | "overdue" | "completed"
  const [activeTab, setActiveTab] = useState("today");
  const [overdueCount, setOverdueCount] = useState(0);

  // State Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // State Toast Feedback
  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  // State Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);
  const [isQuickVoiceOpen, setIsQuickVoiceOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // State Voice Parsing Gemini AI (Multi-Item)
  const [voiceInitialData, setVoiceInitialData] = useState(null);
  const [voiceBatchItems, setVoiceBatchItems] = useState([]);
  const [isVoiceConfirmationOpen, setIsVoiceConfirmationOpen] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [originalVoiceText, setOriginalVoiceText] = useState("");
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);

  // State Filter Pencapaian
  const [achievementSearch, setAchievementSearch] = useState("");
  const [achievementCategory, setAchievementCategory] = useState("all");
  const [achievementDate, setAchievementDate] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const isAchievementFiltered =
    Boolean(achievementSearch.trim()) ||
    achievementCategory !== "all" ||
    Boolean(achievementDate);

  // Debounce search query untuk efisiensi fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(achievementSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [achievementSearch]);

  const showToast = (message, type = "success") => {
    setToast({
      isOpen: true,
      message,
      type,
    });
  };

  // Mengambil data dari backend berdasarkan tab yang aktif & filter pencapaian
  const fetchActivities = async (
    currentPage = page,
    currentPageSize = pageSize,
    currentTab = activeTab,
    search = debouncedSearch,
    category = achievementCategory,
    date = achievementDate,
  ) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      let url = `/api/activity?page=${currentPage}&pageSize=${currentPageSize}`;

      if (currentTab === "today") {
        url += `&timeline=today`;
      } else if (currentTab === "upcoming") {
        url += `&timeline=upcoming`;
      } else if (currentTab === "overdue") {
        url += `&timeline=overdue`;
      } else if (currentTab === "completed") {
        url += `&status=Completed`;
        if (search && search.trim()) {
          url += `&search=${encodeURIComponent(search.trim())}`;
        }
        if (category && category !== "all") {
          url += `&category=${encodeURIComponent(category)}`;
        }
        if (date) {
          url += `&date=${encodeURIComponent(date)}`;
        }
      }

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil data dari server.");
      }
      const data = await response.json();

      if (data && data.items) {
        setActivities(data.items);
        setTotalCount(data.totalCount || 0);
        setTotalPages(
          data.totalPages ||
            Math.ceil((data.totalCount || 0) / currentPageSize) ||
            1,
        );
        setPage(data.page || currentPage);
      } else if (Array.isArray(data)) {
        setActivities(data);
        setTotalCount(data.length);
        setTotalPages(1);
      }

      // Update hitungan overdue dinamis
      if (data && typeof data.overdueCount === "number") {
        setOverdueCount(data.overdueCount);
        if (data.overdueCount === 0 && currentTab === "overdue") {
          setActiveTab("today");
        }
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
      showToast(err.message || "Gagal memuat catatan kegiatan.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch saat page, pageSize, activeTab, atau filter pencapaian berubah
  useEffect(() => {
    fetchActivities(
      page,
      pageSize,
      activeTab,
      debouncedSearch,
      achievementCategory,
      achievementDate,
    );
  }, [
    page,
    pageSize,
    activeTab,
    debouncedSearch,
    achievementCategory,
    achievementDate,
  ]);

  // Handler Ganti Tab Filter
  const handleTabChange = (newTab) => {
    if (activeTab === newTab) return;
    setActiveTab(newTab);
    setPage(1);
  };

  // Handlers Filter Pencapaian
  const handleResetAchievementFilter = () => {
    setAchievementSearch("");
    setAchievementCategory("all");
    setAchievementDate("");
    setPage(1);
  };

  const handleSearchChange = (val) => {
    setAchievementSearch(val);
    setPage(1);
  };

  const handleCategoryChange = (val) => {
    setAchievementCategory(val);
    setPage(1);
  };

  const handleDateChange = (val) => {
    setAchievementDate(val);
    setPage(1);
  };

  // Buka Modal Detail & Aksi saat Kartu Diklik
  const handleOpenDetailModal = (activity) => {
    setSelectedActivity(activity);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedActivity(null);
  };

  // Aksi: Tandai Selesai (Completed)
  const handleMarkComplete = async (activityId, note) => {
    try {
      setIsActionLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activity/${activityId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: "Completed",
          resolutionSource: "ManualCheck",
          note: note ? note.trim() : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menandai kegiatan selesai.");
      }

      showToast("🎉 Aktivitas berhasil diselesaikan!", "success");
      handleCloseDetailModal();
      fetchActivities(page, pageSize, activeTab);
    } catch (err) {
      console.error("Error completing activity:", err);
      showToast(err.message || "Gagal memperbarui status.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Aksi: Batalkan Aktivitas (Status: Cancelled)
  const handleCancelActivity = async (activityId, note) => {
    try {
      setIsActionLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activity/${activityId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: "Cancelled",
          resolutionSource: "ManualCancel",
          note: note ? note.trim() : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal membatalkan aktivitas.");
      }

      showToast("🚫 Aktivitas telah dibatalkan dan diarsipkan.", "info");
      handleCloseDetailModal();
      fetchActivities(page, pageSize, activeTab);
    } catch (err) {
      console.error("Error cancelling activity:", err);
      showToast(err.message || "Gagal membatalkan status.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Aksi: Simpan Revisi Aktivitas
  const handleSaveRevision = async (activityId, payload) => {
    try {
      setIsActionLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/activity/${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.message || "Gagal menyimpan perubahan aktivitas.",
        );
      }

      showToast(
        selectedActivity?.status === "Completed"
          ? "Catatan pencapaian berhasil diperbarui!"
          : "Perubahan aktivitas berhasil disimpan!",
        "success",
      );
      handleCloseDetailModal();
      fetchActivities(page, pageSize, activeTab);
    } catch (err) {
      console.error("Error saving activity:", err);
      showToast(err.message || "Gagal menyimpan perubahan.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Proses teks suara dengan Gemini AI untuk mengekstrak data aktivitas (Multi-Item)
  const handleQuickVoiceProcess = async (fullText) => {
    setIsQuickVoiceOpen(false);
    try {
      setIsVoiceProcessing(true);
      const token = localStorage.getItem("token");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch("/api/activity/parse-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          speechText: fullText,
          clientTimeZone: "Asia/Jakarta",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      let data = null;
      try {
        data = await response.json();
      } catch {}

      if (!response.ok || !data?.success) {
        showToast(
          data?.message || "Teks suara Anda dimasukkan ke konfirmasi.",
          "warning",
        );
        const fallback =
          data?.activities ||
          (data?.activity
            ? [data.activity]
            : [
                {
                  title:
                    fullText.length > 50
                      ? fullText.substring(0, 50) + "..."
                      : fullText,
                  description: fullText,
                  category: "General",
                  isReminder: true,
                  remindAt: null,
                },
              ]);
        setVoiceBatchItems(fallback);
        setOriginalVoiceText(fullText);
        setIsVoiceConfirmationOpen(true);
        return;
      }

      const items =
        data.activities && data.activities.length > 0
          ? data.activities
          : data.activity
            ? [data.activity]
            : [];

      showToast(`✨ ${items.length} kegiatan berhasil dianalisis!`, "success");
      setVoiceBatchItems(items);
      setOriginalVoiceText(data.rawTranscript || fullText);
      setIsVoiceConfirmationOpen(true);
    } catch (err) {
      console.error("Voice parse error:", err);
      showToast("Gagal memproses suara. Teks dimasukkan ke form.", "warning");
      setVoiceBatchItems([
        {
          title:
            fullText.length > 50 ? fullText.substring(0, 50) + "..." : fullText,
          description: fullText,
          category: "General",
          isReminder: true,
          remindAt: null,
        },
      ]);
      setOriginalVoiceText(fullText);
      setIsVoiceConfirmationOpen(true);
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  // Simpan batch aktivitas hasil ekstraksi suara yang telah diedit/dikonfirmasi
  const handleSaveBatchActivities = async (items) => {
    try {
      setIsBatchSaving(true);
      const token = localStorage.getItem("token");

      const response = await fetch("/api/activity/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(items),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Gagal menyimpan aktivitas secara serentak.",
        );
      }

      setIsVoiceConfirmationOpen(false);
      setVoiceBatchItems([]);
      setOriginalVoiceText("");
      showToast(data.message || "Aktivitas berhasil disimpan!", "success");
      if (page === 1) {
        fetchActivities(1, pageSize, activeTab);
      } else {
        setPage(1);
      }
    } catch (err) {
      console.error("Batch save error:", err);
      showToast(
        err.message || "Terjadi kesalahan saat menyimpan aktivitas.",
        "error",
      );
    } finally {
      setIsBatchSaving(false);
    }
  };

  // Callback saat aktivitas berhasil dibuat dari modal manual / AI
  const handleActivityCreated = (createdData) => {
    setIsModalOpen(false);
    setVoiceInitialData(null);
    setOriginalVoiceText("");

    showToast(
      `Kegiatan "${createdData?.title || "baru"}" berhasil disimpan!`,
      "success",
    );

    if (page === 1) {
      fetchActivities(
        1,
        pageSize,
        activeTab,
        debouncedSearch,
        achievementCategory,
        achievementDate,
      );
    } else {
      setPage(1);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl lg:max-w-6xl mx-auto px-2 sm:px-4 animate-fade-in">
      {/* Toast Feedback Reusable */}
      <ToastFeedback
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 1. Header & Action Bar */}
      <ActivityActionBar
        loading={loading}
        onOpenReflection={() => setIsReflectionOpen(true)}
        onOpenQuickVoice={() => setIsQuickVoiceOpen(true)}
        onOpenManualCreate={() => {
          setVoiceInitialData(null);
          setOriginalVoiceText("");
          setIsModalOpen(true);
        }}
        onRefresh={() =>
          fetchActivities(
            page,
            pageSize,
            activeTab,
            debouncedSearch,
            achievementCategory,
            achievementDate,
          )
        }
      />

      {/* Banner status pemrosesan suara oleh Gemini AI */}
      {isVoiceProcessing && (
        <div className="p-4 rounded-2xl bg-ai-violet-50/90 dark:!bg-ai-violet-950/50 border border-ai-violet-200 dark:!border-ai-violet-800/60 flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 border-2 border-ai-violet-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="text-xs sm:text-sm text-ai-violet-900 dark:!text-ai-violet-200 font-medium">
            <strong>Gemini AI sedang mengekstrak ucapan Anda...</strong>{" "}
            Mengidentifikasi judul, kategori, dan jadwal pengingat.
          </div>
        </div>
      )}

      {/* 2. Filter Tabs (Pill Tab Bar Rapi & Dinamis) */}
      <ActivityFilterTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalCount={totalCount}
        overdueCount={overdueCount}
      />

      {/* 2.5. Filter Bar Khusus Tab Pencapaian (Tracking Progres) */}
      {activeTab === "completed" && (
        <AchievementFilterBar
          searchQuery={achievementSearch}
          onSearchChange={handleSearchChange}
          selectedCategory={achievementCategory}
          onCategoryChange={handleCategoryChange}
          selectedDate={achievementDate}
          onDateChange={handleDateChange}
          onReset={handleResetAchievementFilter}
          totalCount={totalCount}
          isFiltered={isAchievementFiltered}
        />
      )}

      {/* 3. Daftar Kartu Kegiatan */}
      <section className="min-h-[220px]">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-ai-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500 dark:!text-slate-400">
              Memuat catatan kegiatan...
            </p>
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            activeTab={activeTab}
            isFiltered={activeTab === "completed" && isAchievementFiltered}
            onResetFilter={handleResetAchievementFilter}
            onAddActivity={() => {
              setVoiceInitialData(null);
              setOriginalVoiceText("");
              setIsModalOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                activeTab={activeTab}
                onSelect={handleOpenDetailModal}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Pagination */}
      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      )}

      {/* 5. Modal Detail & Aksi (Mindful Task Resolution) */}
      <ActivityDetailModal
        isOpen={isDetailModalOpen}
        activity={selectedActivity}
        onClose={handleCloseDetailModal}
        onMarkComplete={handleMarkComplete}
        onCancelActivity={handleCancelActivity}
        onSaveRevision={handleSaveRevision}
        isActionLoading={isActionLoading}
        showToast={showToast}
      />

      {/* 6. Modal Quick Voice Capture */}
      <QuickVoiceModal
        isOpen={isQuickVoiceOpen}
        onClose={() => setIsQuickVoiceOpen(false)}
        onProcessTranscript={handleQuickVoiceProcess}
      />

      {/* 7. Modal Konfirmasi Hasil Suara (Multi-Item & Editable) */}
      <VoiceConfirmationModal
        isOpen={isVoiceConfirmationOpen}
        onClose={() => setIsVoiceConfirmationOpen(false)}
        items={voiceBatchItems}
        rawTranscript={originalVoiceText}
        onSaveBatch={handleSaveBatchActivities}
        onReSpeech={() => {
          setIsVoiceConfirmationOpen(false);
          setIsQuickVoiceOpen(true);
        }}
        isSaving={isBatchSaving}
      />

      {/* 8. Modal Tambah Manual */}
      <ModalWrapper
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size={originalVoiceText ? "lg" : "md"}
        title={
          originalVoiceText
            ? "Verifikasi Hasil Suara Gemini AI"
            : "Tambah Catatan Aktivitas"
        }
        icon={
          originalVoiceText ? (
            <BsStars className="text-ai-violet-500" />
          ) : (
            <BsPlusLg className="text-ai-violet-500" />
          )
        }
      >
        <CreateActivity
          initialData={voiceInitialData}
          originalVoiceText={originalVoiceText}
          onActivityCreated={handleActivityCreated}
          onCancel={() => setIsModalOpen(false)}
          onReSpeech={
            originalVoiceText ? () => setIsQuickVoiceOpen(true) : null
          }
        />
      </ModalWrapper>

      {/* 9. Modal Daily Reflection */}
      <ModalWrapper
        isOpen={isReflectionOpen}
        onClose={() => setIsReflectionOpen(false)}
        size="xl"
        scrollable
        title="Daily Reflection & Insight AI"
        icon={<BsStars className="text-ai-violet-500" />}
      >
        <DailyReflection />
      </ModalWrapper>
    </div>
  );
}

export default Activity;
