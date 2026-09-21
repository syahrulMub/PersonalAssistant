import React, { useState, useEffect, useMemo, useCallback } from "react";
import { formatDateOnly } from "../context/DateFormat";
import {
  BsPeopleFill,
  BsCheckCircleFill,
  BsClockHistory,
  BsSearch,
  BsX,
  BsArrowRepeat,
  BsTrash3,
  BsCheckLg,
  BsPersonCheckFill,
  BsShieldLockFill,
  BsPersonFill,
  BsExclamationTriangleFill,
  BsEnvelopeFill,
  BsCalendar3,
} from "react-icons/bs";
import { ModalWrapper } from "./common/ModalWrapper";
import { Pagination } from "./common/Pagination";
import { ToastFeedback } from "./common/ToastFeedback";

export function UserActivation() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'approved'

  // Modal & Toast State
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null, // 'approve' | 'delete'
    user: null,
    submitting: false,
  });

  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ isOpen: true, message, type });
  };

  // Mengambil data dari backend dengan pagination
  const fetchUsers = useCallback(
    async (currentPage = page, currentPageSize = pageSize) => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/user?page=${currentPage}&pageSize=${currentPageSize}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data user dari server.");
        }

        const data = await response.json();

        if (data && data.items) {
          setUsers(data.items);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
          setPage(data.page || currentPage);
        } else if (Array.isArray(data)) {
          setUsers(data);
          setTotalCount(data.length);
          setTotalPages(1);
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err.message || "Terjadi kesalahan saat memuat data pengguna.");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  // Re-fetch setiap kali halaman (page) atau ukuran halaman (pageSize) berubah
  useEffect(() => {
    fetchUsers(page, pageSize);
  }, [fetchUsers, page, pageSize]);

  // Eksekusi Approve User via Modal Konfirmasi
  const handleConfirmApprove = async () => {
    if (!actionModal.user) return;
    const targetUser = actionModal.user;

    try {
      setActionModal((prev) => ({ ...prev, submitting: true }));
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/user/approve/${targetUser.id}`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setActionModal({
          isOpen: false,
          type: null,
          user: null,
          submitting: false,
        });
        showToast(
          `User "${targetUser.fullName}" berhasil disetujui.`,
          "success",
        );
        fetchUsers(page, pageSize);
      } else {
        showToast(data.message || "Gagal menyetujui user.", "error");
        setActionModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      console.error("Error approving user:", err);
      showToast("Terjadi kesalahan sistem saat menyetujui user.", "error");
      setActionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Eksekusi Hapus User via Modal Konfirmasi
  const handleConfirmDelete = async () => {
    if (!actionModal.user) return;
    const targetUser = actionModal.user;

    try {
      setActionModal((prev) => ({ ...prev, submitting: true }));
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/user/${targetUser.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setActionModal({
          isOpen: false,
          type: null,
          user: null,
          submitting: false,
        });
        showToast(
          `User "${targetUser.fullName}" berhasil dihapus dari sistem.`,
          "success",
        );

        if (users.length === 1 && page > 1) {
          setPage((prev) => prev - 1);
        } else {
          fetchUsers(page, pageSize);
        }
      } else {
        showToast(data.message || "Gagal menghapus user.", "error");
        setActionModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      showToast("Terjadi kesalahan sistem saat menghapus user.", "error");
      setActionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setPage(1);
  };

  // Filter & Search Pengguna pada batch aktif
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((item) => {
      const matchesSearch =
        !query ||
        (item.fullName && item.fullName.toLowerCase().includes(query)) ||
        (item.email && item.email.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "approved"
            ? item.isApproved
            : !item.isApproved;

      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

  // Kalkulasi statistik cepat
  const pendingCount = useMemo(
    () => users.filter((u) => !u.isApproved).length,
    [users],
  );
  const approvedCount = useMemo(
    () => users.filter((u) => u.isApproved).length,
    [users],
  );

  // Inisial nama untuk avatar
  const getInitials = (name = "") => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Hitung range item yang sedang ditampilkan
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Feedback Notification */}
      <ToastFeedback
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:!border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-ai-violet-600 via-ai-violet-500 to-sage-500 flex items-center justify-center text-white shadow-glow-violet flex-shrink-0">
              <BsPeopleFill className="text-xl" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:!text-white">
                Manajemen Aktivasi Pengguna
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:!text-slate-400">
                Kelola persetujuan akun pengguna baru dan izin akses sistem.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchUsers(page, pageSize)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border bg-white dark:!bg-deep-850 border-slate-200 dark:!border-slate-800 text-slate-700 dark:!text-slate-200 hover:bg-slate-50 dark:hover:!bg-deep-750 active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            <BsArrowRepeat
              className={`text-sm ${loading ? "animate-spin" : ""}`}
            />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* 2. Metric / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Users */}
        <div className="p-4 rounded-2xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 shadow-xs flex items-center gap-3.5 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:!bg-deep-900 flex items-center justify-center text-slate-700 dark:!text-slate-300 text-lg flex-shrink-0">
            <BsPeopleFill />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:!text-slate-400">
              Total Pengguna
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:!text-white">
              {totalCount}
            </div>
          </div>
        </div>

        {/* Approved Users */}
        <div className="p-4 rounded-2xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 shadow-xs flex items-center gap-3.5 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:!bg-emerald-950/60 border border-emerald-200 dark:!border-emerald-800 flex items-center justify-center text-emerald-600 dark:!text-emerald-400 text-lg flex-shrink-0">
            <BsCheckCircleFill />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:!text-slate-400">
              Terverifikasi (Batch)
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:!text-emerald-400">
              {approvedCount}
            </div>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="p-4 rounded-2xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 shadow-xs flex items-center gap-3.5 transition-colors">
          <div className="relative w-11 h-11 rounded-xl bg-amber-50 dark:!bg-amber-950/60 border border-amber-200 dark:!border-amber-800 flex items-center justify-center text-amber-600 dark:!text-amber-400 text-lg flex-shrink-0">
            <BsClockHistory />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:!text-slate-400">
              Menunggu Approval
            </div>
            <div className="text-xl font-bold font-mono text-amber-600 dark:!text-amber-400 flex items-center gap-2">
              <span>{pendingCount}</span>
              {pendingCount > 0 && (
                <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:!bg-amber-900/60 dark:!text-amber-200 font-semibold">
                  Perlu Ditinjau
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <BsSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email pengguna..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-800 text-slate-800 dark:!text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-ai-violet-500/20 focus:border-ai-violet-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <BsX className="text-base" />
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "Semua" },
              { id: "pending", label: "Menunggu Approval" },
              { id: "approved", label: "Disetujui" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? "bg-ai-violet-600 text-white shadow-xs"
                    : "bg-slate-100 dark:!bg-deep-900 text-slate-600 dark:!text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500 dark:!text-slate-400">
            <span className="whitespace-nowrap">Baris:</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-800 text-slate-700 dark:!text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-ai-violet-500/20"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:!bg-rose-950/50 border border-rose-200 dark:!border-rose-800/80 text-rose-700 dark:!text-rose-300 flex items-start gap-3">
          <BsExclamationTriangleFill className="text-lg flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-medium">{error}</div>
        </div>
      )}

      {/* 5. User List: Stream Cards (Mobile) & Table (Desktop) */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-ai-violet-50 dark:!bg-ai-violet-950/60 border border-ai-violet-200 dark:!border-ai-violet-800 flex items-center justify-center text-ai-violet-600 dark:!text-ai-violet-400 text-xl mx-auto animate-spin">
            <BsArrowRepeat />
          </div>
          <div className="text-sm font-semibold text-slate-800 dark:!text-slate-200">
            Memuat data pengguna...
          </div>
          <p className="text-xs text-slate-400">
            Menghubungkan ke database server
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:!bg-deep-900 flex items-center justify-center text-slate-400 text-2xl mx-auto">
            <BsPeopleFill />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:!text-slate-200">
            Tidak ada pengguna ditemukan
          </h3>
          <p className="text-xs text-slate-500 dark:!text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all"
              ? "Tidak ada data pengguna yang cocok dengan kriteria filter atau pencarian Anda."
              : "Belum ada pengguna terdaftar dalam sistem."}
          </p>
          {(searchQuery || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-ai-violet-600 dark:!text-ai-violet-400 bg-ai-violet-50 dark:!bg-ai-violet-950/60 border border-ai-violet-200 dark:!border-ai-violet-800 transition-colors"
            >
              Reset Filter Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* A. Mobile View: Stream Cards (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredUsers.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 shadow-xs space-y-3 transition-all"
              >
                {/* User Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-ai-violet-500 to-sage-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                      {getInitials(item.fullName)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:!text-white truncate">
                        {item.fullName}
                      </div>
                      <div className="text-xs text-slate-500 dark:!text-slate-400 flex items-center gap-1.5 truncate">
                        <BsEnvelopeFill className="text-[10px] text-slate-400 flex-shrink-0" />
                        <span className="truncate">{item.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border flex-shrink-0 ${
                      item.isApproved
                        ? "bg-emerald-50 text-emerald-700 dark:!bg-emerald-950/60 dark:!text-emerald-300 border-emerald-200 dark:!border-emerald-800"
                        : "bg-amber-50 text-amber-700 dark:!bg-amber-950/60 dark:!text-amber-300 border-amber-200 dark:!border-amber-800"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.isApproved ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    {item.isApproved ? "Disetujui" : "Menunggu"}
                  </span>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:!text-slate-400 pt-2 border-t border-slate-100 dark:!border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <BsCalendar3 className="text-[11px] text-slate-400" />
                    <span>{formatDateOnly(item.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    {item.role === "Admin" ? (
                      <span className="inline-flex items-center gap-1 text-ai-violet-600 dark:!text-ai-violet-400 font-semibold">
                        <BsShieldLockFill className="text-xs" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 dark:!text-slate-400">
                        <BsPersonFill className="text-xs" /> User
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {!item.isApproved ? (
                    <button
                      type="button"
                      onClick={() =>
                        setActionModal({
                          isOpen: true,
                          type: "approve",
                          user: item,
                          submitting: false,
                        })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
                    >
                      <BsCheckLg className="text-xs" />
                      <span>Setujui Akun</span>
                    </button>
                  ) : (
                    <div className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold text-emerald-700 dark:!text-emerald-300 bg-emerald-50/70 dark:!bg-emerald-950/40 border border-emerald-200 dark:!border-emerald-800/60 text-center flex items-center justify-center gap-1.5">
                      <BsPersonCheckFill className="text-xs" />
                      <span>Terverifikasi</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setActionModal({
                        isOpen: true,
                        type: "delete",
                        user: item,
                        submitting: false,
                      })
                    }
                    className="p-2 rounded-xl text-rose-600 dark:!text-rose-400 bg-rose-50 dark:!bg-rose-950/60 border border-rose-200 dark:!border-rose-800 hover:bg-rose-100 dark:hover:!bg-rose-900/60 active:scale-95 transition-all flex-shrink-0"
                    title="Hapus Pengguna"
                  >
                    <BsTrash3 className="text-sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* B. Desktop View: Modern Tailwind Table (>= md) */}
          <div className="hidden md:block rounded-2xl border border-slate-200/80 dark:!border-slate-800 bg-white dark:!bg-deep-850 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:!border-slate-800 bg-slate-50/80 dark:!bg-deep-900/80 text-slate-500 dark:!text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center font-mono">No</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Peran</th>
                    <th className="py-3 px-4">Status Approval</th>
                    <th className="py-3 px-4">Terdaftar Sejak</th>
                    <th className="py-3 px-4 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:!divide-slate-800/60">
                  {filteredUsers.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:!bg-deep-800/40 transition-colors"
                    >
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 dark:!text-slate-500">
                        {(page - 1) * pageSize + index + 1}
                      </td>

                      {/* Full Name with Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-ai-violet-600 to-sage-500 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 shadow-xs">
                            {getInitials(item.fullName)}
                          </div>
                          <span className="font-semibold text-slate-900 dark:!text-white">
                            {item.fullName}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-600 dark:!text-slate-300 font-mono">
                        {item.email}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {item.role === "Admin" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 dark:!bg-purple-950/60 dark:!text-purple-300 border border-purple-200 dark:!border-purple-800">
                            <BsShieldLockFill className="text-[10px]" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:!bg-deep-900 dark:!text-slate-400 border border-slate-200 dark:!border-slate-800">
                            <BsPersonFill className="text-[10px]" /> User
                          </span>
                        )}
                      </td>

                      {/* Approved Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            item.isApproved
                              ? "bg-emerald-50 text-emerald-700 dark:!bg-emerald-950/60 dark:!text-emerald-300 border-emerald-200 dark:!border-emerald-800"
                              : "bg-amber-50 text-amber-700 dark:!bg-amber-950/60 dark:!text-amber-300 border-amber-200 dark:!border-amber-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isApproved
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-amber-500"
                            }`}
                          />
                          {item.isApproved ? "Disetujui" : "Menunggu"}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-slate-500 dark:!text-slate-400">
                        {formatDateOnly(item.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.isApproved ? (
                            <div
                              className="p-1.5 rounded-xl text-emerald-600 dark:!text-emerald-400 bg-emerald-50 dark:!bg-emerald-950/60 border border-emerald-200 dark:!border-emerald-800"
                              title="Sudah disetujui"
                            >
                              <BsPersonCheckFill className="text-sm" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  isOpen: true,
                                  type: "approve",
                                  user: item,
                                  submitting: false,
                                })
                              }
                              className="p-1.5 rounded-xl text-emerald-600 hover:text-white dark:!text-emerald-400 bg-emerald-50 hover:bg-emerald-600 dark:!bg-emerald-950/60 dark:hover:!bg-emerald-600 border border-emerald-200 dark:!border-emerald-800 hover:border-transparent transition-all shadow-xs"
                              title="Setujui Pengguna"
                            >
                              <BsCheckLg className="text-sm" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                type: "delete",
                                user: item,
                                submitting: false,
                              })
                            }
                            className="p-1.5 rounded-xl text-rose-600 hover:text-white dark:!text-rose-400 bg-rose-50 hover:bg-rose-600 dark:!bg-rose-950/60 dark:hover:!bg-rose-600 border border-rose-200 dark:!border-rose-800 hover:border-transparent transition-all shadow-xs"
                            title="Hapus Pengguna"
                          >
                            <BsTrash3 className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Desktop Table Footer: Range & Pagination */}
            <div className="p-4 border-t border-slate-200/80 dark:!border-slate-800 bg-slate-50/40 dark:!bg-deep-900/40 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:!text-slate-400 font-mono">
                Menampilkan <strong>{startItem}</strong> -{" "}
                <strong>{endItem}</strong> dari <strong>{totalCount}</strong>{" "}
                pengguna
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={(nextPage) => setPage(nextPage)}
              />
            </div>
          </div>

          {/* Mobile Pagination */}
          <div className="block md:hidden">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </div>
        </div>
      )}

      {/* 6. Modal Konfirmasi Approve / Delete */}
      <ModalWrapper
        isOpen={actionModal.isOpen}
        onClose={() =>
          !actionModal.submitting &&
          setActionModal({
            isOpen: false,
            type: null,
            user: null,
            submitting: false,
          })
        }
        title={
          actionModal.type === "approve"
            ? "Persetujuan Akun Pengguna"
            : "Hapus Akun Pengguna"
        }
        icon={
          actionModal.type === "approve" ? (
            <BsCheckCircleFill className="text-emerald-500 text-lg" />
          ) : (
            <BsTrash3 className="text-rose-500 text-lg" />
          )
        }
        size="md"
      >
        {actionModal.user && (
          <div className="space-y-4">
            {/* User Details Card inside Modal */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-ai-violet-600 to-sage-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                {getInitials(actionModal.user.fullName)}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:!text-white truncate">
                  {actionModal.user.fullName}
                </div>
                <div className="text-xs text-slate-500 dark:!text-slate-400 truncate font-mono">
                  {actionModal.user.email}
                </div>
              </div>
            </div>

            {/* Modal Body Notice */}
            {actionModal.type === "approve" ? (
              <p className="text-xs sm:text-sm text-slate-600 dark:!text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menyetujui akun pengguna ini? Setelah
                disetujui, pengguna akan memiliki akses penuh untuk masuk ke
                dalam sistem.
              </p>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:!bg-rose-950/40 border border-rose-200 dark:!border-rose-800/60 text-xs sm:text-sm text-rose-700 dark:!text-rose-300 flex items-start gap-2.5">
                <BsExclamationTriangleFill className="text-base flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Perhatian:</strong> Tindakan ini tidak dapat
                  dibatalkan. Seluruh data terkait pengguna ini akan dihapus
                  secara permanen dari basis data.
                </span>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80 dark:!border-slate-800">
              <button
                type="button"
                disabled={actionModal.submitting}
                onClick={() =>
                  setActionModal({
                    isOpen: false,
                    type: null,
                    user: null,
                    submitting: false,
                  })
                }
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:!border-slate-800 text-slate-700 dark:!text-slate-300 hover:bg-slate-100 dark:hover:!bg-deep-800 transition-colors"
              >
                Batal
              </button>

              {actionModal.type === "approve" ? (
                <button
                  type="button"
                  disabled={actionModal.submitting}
                  onClick={handleConfirmApprove}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xs disabled:opacity-50"
                >
                  {actionModal.submitting && (
                    <BsArrowRepeat className="text-xs animate-spin" />
                  )}
                  <span>Ya, Setujui Akun</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionModal.submitting}
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-xs disabled:opacity-50"
                >
                  {actionModal.submitting && (
                    <BsArrowRepeat className="text-xs animate-spin" />
                  )}
                  <span>Ya, Hapus Pengguna</span>
                </button>
              )}
            </div>
          </div>
        )}
      </ModalWrapper>
    </div>
  );
}

export default UserActivation;
