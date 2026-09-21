import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import {
  BsTerminal,
  BsArrowRepeat,
  BsCalendar3,
  BsSearch,
  BsX,
  BsActivity,
  BsCheckCircle,
  BsExclamationTriangle,
  BsStars,
  BsChevronDown,
  BsChevronUp,
  BsClipboard,
  BsCheck2,
  BsBoxArrowUpRight,
  BsFilter,
  BsListUl,
  BsTable,
} from "react-icons/bs";
import { ModalWrapper } from "./common/ModalWrapper";

const LEVEL_CONFIG = {
  ACCESS: {
    label: "Access",
    badge:
      "bg-emerald-50 text-emerald-700 dark:!bg-emerald-950/60 dark:!text-emerald-300 border-emerald-200 dark:!border-emerald-800",
    dot: "bg-emerald-500",
  },
  ERROR: {
    label: "Error",
    badge:
      "bg-rose-50 text-rose-700 dark:!bg-rose-950/60 dark:!text-rose-300 border-rose-200 dark:!border-rose-800",
    dot: "bg-rose-500",
  },
  INFO: {
    label: "Info",
    badge:
      "bg-blue-50 text-blue-700 dark:!bg-blue-950/60 dark:!text-blue-300 border-blue-200 dark:!border-blue-800",
    dot: "bg-blue-500",
  },
  EMAIL: {
    label: "Email",
    badge:
      "bg-sky-50 text-sky-700 dark:!bg-sky-950/60 dark:!text-sky-300 border-sky-200 dark:!border-sky-800",
    dot: "bg-sky-500",
  },
  THIRD_PARTY: {
    label: "AI / Gemini",
    badge:
      "bg-ai-violet-50 text-ai-violet-700 dark:!bg-ai-violet-950/60 dark:!text-ai-violet-300 border-ai-violet-200 dark:!border-ai-violet-800",
    dot: "bg-ai-violet-500",
  },
};

const getLocalTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function formatLogTimestamp(tsString) {
  if (!tsString) return "-";
  try {
    const d = new Date(tsString);
    if (isNaN(d.getTime())) return tsString;
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return tsString;
  }
}

function parseLogLine(line) {
  const columns = line.split("|").map((item) => item.trim());

  if (columns.length < 7) {
    return {
      timestamp: "",
      level: "INFO",
      controller: "-",
      action: "-",
      clientIp: "-",
      message: line,
      details: "",
      method: "",
      endpoint: "",
      statusCode: "",
      provider: "-",
    };
  }

  const timestamp = columns[0] || "";
  const level = columns[1] || "INFO";
  const controller = columns[2] || "-";
  const action = columns[3] || "-";
  const clientIp = columns[4] || "-";
  const message = columns[5] || "";
  const details = columns[6] || "";

  const requestMatch = message.match(/^([A-Z]+)\s+([^\s]+)\s+->\s+(\d{3})/);
  const method = requestMatch ? requestMatch[1] : "";
  const endpoint = requestMatch ? requestMatch[2] : message;
  const statusCode = requestMatch
    ? requestMatch[3]
    : details.match(/StatusCode=(\d{3})/)?.[1] || "";

  const provider = details.match(/Provider=([^\s]+)/)?.[1] || "-";
  const endpointFromDetails =
    details.match(/Endpoint=([^\s]+)/)?.[1] || endpoint;
  const methodFromDetails = details.match(/Method=([^\s]+)/)?.[1] || method;

  return {
    timestamp,
    level,
    controller,
    action,
    clientIp,
    message,
    details,
    method: methodFromDetails || method,
    endpoint: endpointFromDetails || endpoint,
    statusCode,
    provider,
  };
}

export function ApiLogTracker() {
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalTodayString());
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [selectedStatusCode, setSelectedStatusCode] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);

  // Expanded items in card stream & modal inspect
  const [expandedIndices, setExpandedIndices] = useState(new Set());
  const [inspectItem, setInspectItem] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLogs = async (
    date = selectedDate,
    nextPage = page,
    size = pageSize,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `ApiLog?date=${date}&page=${nextPage}&pageSize=${size}`,
      );

      const payload = response.data;
      setAvailableDates(payload.availableDates || []);
      setLogs(payload.logs || []);
      setTotal(payload.total || 0);
      setPage(payload.page || nextPage);
      setPageSize(payload.pageSize || size);
      setSelectedDate(payload.date || date);
    } catch (err) {
      setError(err.message || "Gagal memuat catatan log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(selectedDate, page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusCodes = useMemo(() => {
    const codes = new Set();
    logs.forEach((line) => {
      const parsed = parseLogLine(line);
      if (parsed.statusCode) {
        codes.add(parsed.statusCode);
      }
    });

    return [...codes].sort();
  }, [logs]);

  useEffect(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    const cleaned = logs.filter((line) => {
      const parsed = parseLogLine(line);

      const passesLevel =
        selectedLevel === "ALL" || parsed.level === selectedLevel;
      const passesCode =
        selectedStatusCode === "ALL" ||
        parsed.statusCode === selectedStatusCode;

      const searchable = [
        parsed.timestamp,
        parsed.level,
        parsed.controller,
        parsed.action,
        parsed.clientIp,
        parsed.message,
        parsed.details,
        parsed.endpoint,
        parsed.method,
        parsed.statusCode,
        parsed.provider,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passesSearch =
        !normalizedSearch || searchable.includes(normalizedSearch);

      return passesLevel && passesCode && passesSearch;
    });

    setFilteredLogs(cleaned);
  }, [logs, selectedLevel, selectedStatusCode, searchText]);

  const summary = useMemo(() => {
    const summaryCounts = {
      ACCESS: 0,
      ERROR: 0,
      INFO: 0,
      EMAIL: 0,
      THIRD_PARTY: 0,
    };

    logs.forEach((line) => {
      const parsed = parseLogLine(line);
      if (summaryCounts[parsed.level] !== undefined) {
        summaryCounts[parsed.level] += 1;
      }
    });

    return summaryCounts;
  }, [logs]);

  const toggleExpand = (index) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleCopyText = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-2 sm:px-4 py-2 animate-fade-in text-slate-900 dark:!text-slate-100">
      {/* 1. Header & Date Selection Toolbar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white/90 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-ai-violet-600 dark:!text-ai-violet-400 mb-1">
            <BsTerminal className="text-sm" />
            <span>System Observability & Monitoring</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:!text-white tracking-tight">
            API & Activity Log Tracker
          </h1>
          <p className="text-xs text-slate-500 dark:!text-slate-400 mt-1">
            Pantau aktivitas HTTP endpoint, panggilan Gemini AI, dan pengiriman
            email secara real-time.
          </p>
        </div>

        {/* Date Selector & Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[170px]">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-xs text-slate-700 dark:!text-slate-300">
              <BsCalendar3 className="text-slate-400 flex-shrink-0" />
              <select
                className="bg-transparent border-0 outline-none w-full font-mono text-xs text-slate-800 dark:!text-slate-200 cursor-pointer"
                value={selectedDate}
                onChange={(e) => {
                  const date = e.target.value;
                  setSelectedDate(date);
                  setPage(1);
                  fetchLogs(date, 1, pageSize);
                }}
              >
                {availableDates.length === 0 && (
                  <option value={selectedDate}>
                    {selectedDate} (Hari Ini)
                  </option>
                )}
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {date} {date === getLocalTodayString() ? "(Hari Ini)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => fetchLogs(selectedDate, page, pageSize)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-ai-violet-600 hover:bg-ai-violet-700 text-white shadow-xs active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Muat ulang log"
          >
            <BsArrowRepeat
              className={`text-sm ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Metric / Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Events */}
        <div className="p-4 rounded-2xl bg-white/90 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:!bg-deep-900 flex items-center justify-center text-slate-700 dark:!text-slate-300 text-lg flex-shrink-0">
            <BsActivity />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:!text-slate-400">
              Total Log Masuk
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:!text-white">
              {total}
            </div>
          </div>
        </div>

        {/* HTTP Access */}
        <div className="p-4 rounded-2xl bg-white/90 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:!bg-emerald-950/60 border border-emerald-200 dark:!border-emerald-800 flex items-center justify-center text-emerald-600 dark:!text-emerald-400 text-lg flex-shrink-0">
            <BsCheckCircle />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:!text-slate-400">
              HTTP Access
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:!text-emerald-400">
              {summary.ACCESS}
            </div>
          </div>
        </div>

        {/* Errors */}
        <div className="p-4 rounded-2xl bg-white/90 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:!bg-rose-950/60 border border-rose-200 dark:!border-rose-800 flex items-center justify-center text-rose-600 dark:!text-rose-400 text-lg flex-shrink-0">
            <BsExclamationTriangle />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:!text-slate-400">
              Errors / Failures
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:!text-rose-400">
              {summary.ERROR}
            </div>
          </div>
        </div>

        {/* AI & Email */}
        <div className="p-4 rounded-2xl bg-white/90 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ai-violet-50 dark:!bg-ai-violet-950/60 border border-ai-violet-200 dark:!border-ai-violet-800 flex items-center justify-center text-ai-violet-600 dark:!text-ai-violet-400 text-lg flex-shrink-0">
            <BsStars />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:!text-slate-400">
              AI & Email Calls
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-ai-violet-600 dark:!text-ai-violet-400">
              {summary.THIRD_PARTY + summary.EMAIL}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Search Box */}
          <div className="lg:col-span-5 relative">
            <BsSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cari URL, controller, IP, payload..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-violet-500 font-medium transition-all"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:!text-slate-200"
              >
                <BsX className="text-base" />
              </button>
            )}
          </div>

          {/* Level Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white focus:outline-none focus:ring-2 focus:ring-ai-violet-500 font-medium"
            >
              <option value="ALL">Semua Level (All)</option>
              <option value="ACCESS">🟢 ACCESS (Endpoint)</option>
              <option value="ERROR">🔴 ERROR (Pengecualian)</option>
              <option value="THIRD_PARTY">🟣 THIRD_PARTY (Gemini AI)</option>
              <option value="EMAIL">🔵 EMAIL (Notifikasi)</option>
              <option value="INFO">⚪ INFO (Sistem)</option>
            </select>
          </div>

          {/* Status Code Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatusCode}
              onChange={(e) => setSelectedStatusCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white focus:outline-none focus:ring-2 focus:ring-ai-violet-500 font-medium"
            >
              <option value="ALL">Semua HTTP Status</option>
              {statusCodes.map((code) => (
                <option key={code} value={code}>
                  Status {code}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle (Cards vs Table) */}
          <div className="lg:col-span-2 flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "cards"
                  ? "bg-ai-violet-600 text-white shadow-xs"
                  : "bg-slate-100 dark:!bg-deep-900 text-slate-600 dark:!text-slate-400 hover:text-slate-900 dark:hover:!text-white"
              }`}
              title="Tampilan Stream Card (Nyaman di Mobile & Desktop)"
            >
              <BsListUl className="text-sm" />
              <span>Stream</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-ai-violet-600 text-white shadow-xs"
                  : "bg-slate-100 dark:!bg-deep-900 text-slate-600 dark:!text-slate-400 hover:text-slate-900 dark:hover:!text-white"
              }`}
              title="Tampilan Tabel Kompak"
            >
              <BsTable className="text-sm" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>
        </div>

        {/* Filter Summary Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:!text-slate-400 pt-1 border-t border-slate-100 dark:!border-slate-800">
          <div className="flex items-center gap-1.5">
            <BsFilter className="text-ai-violet-500 text-xs" />
            <span>
              Menampilkan{" "}
              <strong className="text-slate-800 dark:!text-slate-200 font-mono">
                {filteredLogs.length}
              </strong>{" "}
              dari{" "}
              <strong className="text-slate-800 dark:!text-slate-200 font-mono">
                {logs.length}
              </strong>{" "}
              log di halaman ini
            </span>
          </div>

          {(selectedLevel !== "ALL" ||
            selectedStatusCode !== "ALL" ||
            searchText) && (
            <button
              type="button"
              onClick={() => {
                setSelectedLevel("ALL");
                setSelectedStatusCode("ALL");
                setSearchText("");
              }}
              className="text-rose-600 dark:!text-rose-400 hover:underline text-[11px] font-semibold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* 4. Log Content Section */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:!bg-rose-950/60 border border-rose-200 dark:!border-rose-800 text-rose-700 dark:!text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <BsExclamationTriangle className="text-base flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 rounded-3xl bg-white/90 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-ai-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500 dark:!text-slate-400">
            Mengambil log sistem untuk tanggal {selectedDate}...
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white/90 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:!bg-deep-900 flex items-center justify-center text-2xl mx-auto">
            📋
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:!text-slate-200">
            Tidak ada log tercatat
          </h3>
          <p className="text-xs text-slate-500 dark:!text-slate-400 max-w-sm mx-auto">
            Belum ada log masuk untuk kriteria tanggal atau filter yang sedang
            Anda pilih.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        /* ================= MODE CARDS STREAM (SUPER NYAMAN DI MOBILE & DESKTOP) ================= */
        <div className="space-y-3">
          {filteredLogs.map((line, index) => {
            const item = parseLogLine(line);
            const isExpanded = expandedIndices.has(index);
            const config = LEVEL_CONFIG[item.level] || LEVEL_CONFIG.INFO;
            const timeFormatted = formatLogTimestamp(item.timestamp);

            const isSuccess =
              item.statusCode && item.statusCode.startsWith("2");
            const isWarn = item.statusCode && item.statusCode.startsWith("4");
            const isErr = item.statusCode && item.statusCode.startsWith("5");

            return (
              <div
                key={`${selectedDate}-${index}-${line}`}
                className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800/90 shadow-sm hover:shadow-md transition-all space-y-2.5 group"
              >
                {/* Baris 1: Header (Waktu + Level Badge + Status Code + Actions) */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Level Pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.badge}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
                      />
                      <span>{item.level}</span>
                    </span>

                    {/* HTTP Status Code */}
                    {item.statusCode && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          isSuccess
                            ? "bg-emerald-100 text-emerald-800 dark:!bg-emerald-950/80 dark:!text-emerald-300"
                            : isWarn
                              ? "bg-amber-100 text-amber-800 dark:!bg-amber-950/80 dark:!text-amber-300"
                              : isErr
                                ? "bg-rose-100 text-rose-800 dark:!bg-rose-950/80 dark:!text-rose-300"
                                : "bg-slate-100 text-slate-700 dark:!bg-slate-800 dark:!text-slate-300"
                        }`}
                      >
                        {item.statusCode}
                      </span>
                    )}

                    {/* Timestamp */}
                    <span className="text-xs font-mono text-slate-500 dark:!text-slate-400">
                      {timeFormatted}
                    </span>
                  </div>

                  {/* Right Tags: IP & Inspect Button */}
                  <div className="flex items-center gap-2">
                    {item.clientIp && item.clientIp !== "-" && (
                      <span className="text-[10px] font-mono text-slate-400 dark:!text-slate-500 hidden sm:inline">
                        IP: {item.clientIp}
                      </span>
                    )}

                    {item.details && (
                      <button
                        type="button"
                        onClick={() => setInspectItem(item)}
                        className="p-1 rounded-lg text-slate-400 hover:text-ai-violet-600 dark:hover:!text-ai-violet-400 hover:bg-slate-100 dark:hover:!bg-deep-800 transition-colors"
                        title="Buka detail lengkap modal"
                      >
                        <BsBoxArrowUpRight className="text-xs" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Baris 2: Method, Endpoint / Target, & Provider */}
                <div className="flex items-start gap-2 flex-wrap">
                  {item.method && item.method !== "-" && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:!bg-deep-900 text-slate-800 dark:!text-slate-200 border border-slate-200 dark:!border-slate-800">
                      {item.method}
                    </span>
                  )}
                  <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900 dark:!text-slate-100 break-all">
                    {item.endpoint || item.message}
                  </span>

                  {(item.provider !== "-" || item.controller !== "-") && (
                    <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-50 dark:!bg-deep-900 text-slate-500 dark:!text-slate-400 border border-slate-200/60 dark:!border-slate-800">
                      {item.provider !== "-" ? item.provider : item.controller}
                      {item.action && item.action !== "-"
                        ? ` • ${item.action}`
                        : ""}
                    </span>
                  )}
                </div>

                {/* Baris 3: Message / Ringkasan */}
                {item.message && item.message !== item.endpoint && (
                  <p className="text-xs text-slate-600 dark:!text-slate-300 leading-relaxed break-words font-sans">
                    {item.message}
                  </p>
                )}

                {/* Baris 4: Collapsible Details (Jika ada payload/detail) */}
                {item.details && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => toggleExpand(index)}
                      className="text-[11px] font-medium text-ai-violet-600 dark:!text-ai-violet-400 hover:underline flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <BsChevronUp className="text-xs" />
                          <span>Sembunyikan Payload</span>
                        </>
                      ) : (
                        <>
                          <BsChevronDown className="text-xs" />
                          <span>Tampilkan Detail & Payload JSON</span>
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800 relative group/code overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-400">
                          <span>Payload & Parameter Eksekusi</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(item.details, `card-${index}`)
                            }
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            {copiedId === `card-${index}` ? (
                              <>
                                <BsCheck2 className="text-emerald-400 text-xs" />
                                <span className="text-emerald-400">
                                  Tersalin!
                                </span>
                              </>
                            ) : (
                              <>
                                <BsClipboard className="text-xs" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed text-[11px]">
                          {item.details}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= MODE TABLE KOMPAK (UNTUK DESKTOP VIEW) ================= */
        <div className="rounded-2xl bg-white/95 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 dark:!bg-deep-900 border-b border-slate-200 dark:!border-slate-800 text-slate-600 dark:!text-slate-400 font-semibold font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Waktu</th>
                  <th className="py-3 px-3">Level</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Method & Endpoint</th>
                  <th className="py-3 px-3">Komponen</th>
                  <th className="py-3 px-3">Pesan Ringkas</th>
                  <th className="py-3 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:!divide-slate-800/80">
                {filteredLogs.map((line, index) => {
                  const item = parseLogLine(line);
                  const config = LEVEL_CONFIG[item.level] || LEVEL_CONFIG.INFO;
                  const timeFormatted = formatLogTimestamp(item.timestamp);

                  return (
                    <tr
                      key={`tbl-${selectedDate}-${index}`}
                      className="hover:bg-slate-50/70 dark:hover:!bg-deep-750/50 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-mono text-slate-500 dark:!text-slate-400 whitespace-nowrap">
                        {timeFormatted}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.badge}`}
                        >
                          {item.level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.statusCode ? (
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                              item.statusCode.startsWith("2")
                                ? "bg-emerald-100 text-emerald-800 dark:!bg-emerald-950/80 dark:!text-emerald-300"
                                : item.statusCode.startsWith("4")
                                  ? "bg-amber-100 text-amber-800 dark:!bg-amber-950/80 dark:!text-amber-300"
                                  : "bg-rose-100 text-rose-800 dark:!bg-rose-950/80 dark:!text-rose-300"
                            }`}
                          >
                            {item.statusCode}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900 dark:!text-slate-100 max-w-[280px] truncate">
                        {item.method && item.method !== "-" && (
                          <span className="font-bold mr-1.5 text-slate-700 dark:!text-slate-300">
                            {item.method}
                          </span>
                        )}
                        <span>{item.endpoint || item.message}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:!text-slate-300 whitespace-nowrap">
                        {item.provider !== "-"
                          ? item.provider
                          : item.controller}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:!text-slate-300 max-w-[260px] truncate">
                        {item.message}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {item.details ? (
                          <button
                            type="button"
                            onClick={() => setInspectItem(item)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-ai-violet-600 dark:!text-ai-violet-400 bg-ai-violet-50 dark:!bg-ai-violet-950/40 hover:bg-ai-violet-100 transition-colors"
                          >
                            Buka
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Pagination Bar */}
      <div className="p-3.5 rounded-2xl bg-white/90 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs font-mono text-slate-500 dark:!text-slate-400">
          Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>{" "}
          (Total {total} baris log)
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => {
              const prev = Math.max(page - 1, 1);
              setPage(prev);
              fetchLogs(selectedDate, prev, pageSize);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-slate-50 dark:!bg-deep-900 border-slate-200 dark:!border-slate-700 text-slate-700 dark:!text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:!bg-deep-800 transition-colors"
          >
            &laquo; Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => {
              const next = page + 1;
              setPage(next);
              fetchLogs(selectedDate, next, pageSize);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-slate-50 dark:!bg-deep-900 border-slate-200 dark:!border-slate-700 text-slate-700 dark:!text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:!bg-deep-800 transition-colors"
          >
            Next &raquo;
          </button>
        </div>
      </div>

      {/* 6. Modal Inspect Detail Payload Lengkap */}
      {inspectItem && (
        <ModalWrapper
          isOpen={Boolean(inspectItem)}
          onClose={() => setInspectItem(null)}
          size="lg"
          scrollable
          title={`Detail Log: ${inspectItem.level}`}
          icon={<BsTerminal className="text-ai-violet-500" />}
        >
          <div className="space-y-4">
            {/* Metadata Ringkas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:!bg-deep-950 border border-slate-200/80 dark:!border-slate-800/80 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">WAKTU</span>
                <span className="font-semibold text-slate-800 dark:!text-slate-200 break-words">
                  {inspectItem.timestamp || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">STATUS</span>
                <span className="font-semibold text-slate-800 dark:!text-slate-200">
                  {inspectItem.statusCode || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">METHOD</span>
                <span className="font-semibold text-slate-800 dark:!text-slate-200">
                  {inspectItem.method || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  CLIENT IP
                </span>
                <span className="font-semibold text-slate-800 dark:!text-slate-200">
                  {inspectItem.clientIp || "-"}
                </span>
              </div>
            </div>

            {/* Target Endpoint & Component */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:!text-slate-400 mb-1">
                Endpoint / Target Eksekusi
              </label>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:!bg-deep-950 border border-slate-200 dark:!border-slate-800 font-mono text-xs text-slate-900 dark:!text-slate-100 break-all">
                {inspectItem.endpoint || inspectItem.message}
              </div>
            </div>

            {/* Message */}
            {inspectItem.message && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:!text-slate-400 mb-1">
                  Pesan Log (Message)
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:!bg-deep-950 border border-slate-200 dark:!border-slate-800 text-xs text-slate-800 dark:!text-slate-200 leading-relaxed break-words font-sans">
                  {inspectItem.message}
                </div>
              </div>
            )}

            {/* Raw Details / JSON Payload */}
            {inspectItem.details && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:!text-slate-400">
                    Payload / Parameter Eksekusi Lengkap
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(inspectItem.details, "modal-detail")
                    }
                    className="text-xs text-ai-violet-600 dark:!text-ai-violet-400 hover:underline flex items-center gap-1"
                  >
                    {copiedId === "modal-detail" ? (
                      <>
                        <BsCheck2 className="text-emerald-500" />
                        <span className="text-emerald-500">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <BsClipboard />
                        <span>Salin Payload</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs border border-slate-800 max-h-80 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words">
                  {inspectItem.details}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
}

export default ApiLogTracker;
