import React, { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useVoiceAssistant } from "../../context/VoiceAssistantContext";
import {
  BsSun,
  BsMoonStars,
  BsStars,
  BsCheck2Square,
  BsCpu,
  BsJournalText,
  BsShieldLock,
  BsPerson,
  BsList,
  BsDatabase,
  BsChevronRight,
  BsX,
} from "react-icons/bs";
import { FiLogOut } from "react-icons/fi";

export function MobileNavigation() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { openAssistant, isOpen: isVoiceOpen } = useVoiceAssistant();
  const location = useLocation();
  const navigate = useNavigate();

  // State Drawer & Smooth Animated Mount/Unmount
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const currentDragY = useRef(0);
  const scrollContainerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Animasi Buka Menu (Slide Up Halus)
  const openMenu = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsMenuOpen(true);
    setDragY(0);
    currentDragY.current = 0;
    setTimeout(() => {
      setIsVisible(true);
    }, 15);
  };

  // Animasi Tutup Menu (Slide Down Halus, Tidak Langsung Flicker Hilang)
  const closeMenu = () => {
    setIsDragging(false);
    setIsVisible(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false);
      setDragY(0);
      currentDragY.current = 0;
      touchStartY.current = 0;
    }, 280);
  };

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  // Handler Gesture Drag-to-Dismiss (Satu kesatuan: Header, Drag Pill & User info)
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    currentDragY.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStartY.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) {
      currentDragY.current = deltaY;
      setDragY(deltaY);
    } else {
      currentDragY.current = 0;
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // threshold swipe down > 100px langsung close dengan animasi slide down
    if (currentDragY.current > 100) {
      closeMenu();
    } else {
      // Spring back halus ke posisi semula
      setDragY(0);
      currentDragY.current = 0;
      touchStartY.current = 0;
    }
  };

  // Handler jika user swipe down saat scroll konten berada di paling atas
  const handleContentTouchStart = (e) => {
    if (
      scrollContainerRef.current &&
      scrollContainerRef.current.scrollTop <= 0
    ) {
      touchStartY.current = e.touches[0].clientY;
      currentDragY.current = 0;
    }
  };

  const handleContentTouchMove = (e) => {
    if (!touchStartY.current) return;
    if (
      scrollContainerRef.current &&
      scrollContainerRef.current.scrollTop > 0
    ) {
      setIsDragging(false);
      setDragY(0);
      return;
    }
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) {
      setIsDragging(true);
      currentDragY.current = deltaY;
      setDragY(deltaY);
    }
  };

  return (
    <div className="lg:hidden">
      {/* 1. Mobile Top Header (Clean: Dark/Light toggle + Small Profile Avatar) */}
      <header
        className={`sticky top-0 z-40 w-full backdrop-blur-md px-4 h-14 flex items-center justify-between border-b transition-colors ${
          isDark
            ? "bg-[#090D16]/90 border-slate-800 text-[#F8FAFC]"
            : "bg-white/90 border-slate-200 text-[#0F172A]"
        }`}
      >
        {/* Brand Logo & Date */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-ai-violet-600 via-ai-violet-500 to-sage-500 flex items-center justify-center text-white shadow-glow-violet">
            <BsStars className="text-sm animate-twinkle" />
          </div>
          <div className="flex flex-col">
            <span
              className={`font-bold text-sm leading-tight ${
                isDark ? "text-[#F8FAFC]" : "text-[#0F172A]"
              }`}
            >
              Personal Assistant
            </span>
            <span
              className={`text-[10px] font-mono ${
                isDark ? "text-[#94A3B8]" : "text-[#64748B]"
              }`}
            >
              {todayStr}
            </span>
          </div>
        </Link>

        {/* Right Controls: Theme Switcher & Small Profile Avatar */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? "bg-[#1E293B] text-[#F8FAFC] border-[#334155]"
                : "bg-white text-[#0F172A] border-[#E2E8F0]"
            }`}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <BsSun className="text-amber-400 text-sm" />
            ) : (
              <BsMoonStars className="text-ai-violet-600 text-sm" />
            )}
          </button>

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border ${
              isDark
                ? "bg-[#334155] text-[#F8FAFC] border-[#475569]"
                : "bg-[#E2E8F0] text-[#0F172A] border-[#CBD5E1]"
            }`}
            title={user?.fullName || user?.email || "User Profile"}
          >
            {(user?.fullName || user?.email || "U").charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* 2. Mobile Drawer Menu (Bottom Sheet dengan Animasi Slide Down & Fade Out Halus) */}
      {isMenuOpen && (
        <div
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end transition-opacity duration-200 ${
            isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={closeMenu}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: !isVisible
                ? "translateY(100%)"
                : `translateY(${dragY}px)`,
              transition: isDragging
                ? "none"
                : "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
            className={`rounded-t-3xl border-t shadow-2xl h-[50vh] max-h-[50vh] flex flex-col overflow-hidden transition-colors ${
              isDark
                ? "bg-[#1E293B] text-[#F8FAFC] border-[#334155]"
                : "bg-[#FFFFFF] text-[#0F172A] border-[#E2E8F0]"
            }`}
          >
            {/* FIXED HEADER: Satu kesatuan (Drag Handle + User Info + Button X di Kanan Atas) */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`flex-shrink-0 px-5 pt-2.5 pb-2.5 border-b select-none cursor-grab active:cursor-grabbing touch-none transition-colors ${
                isDark
                  ? "bg-[#1E293B] border-[#334155]"
                  : "bg-[#FFFFFF] border-[#E2E8F0]"
              }`}
            >
              {/* Visual Drag Pill Bar */}
              <div className="w-full flex items-center justify-center pb-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-150 ${
                    dragY > 20
                      ? "w-16 bg-sage-500"
                      : isDark
                        ? "w-12 bg-[#475569]"
                        : "w-12 bg-[#CBD5E1]"
                  }`}
                />
              </div>

              {/* Compact User Info Row with Button X at Fixed Right */}
              <div className="flex items-center justify-between gap-3">
                {user ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 border ${
                        isDark
                          ? "bg-[#334155] text-[#F8FAFC] border-[#475569]"
                          : "bg-[#E2E8F0] text-[#0F172A] border-[#CBD5E1]"
                      }`}
                    >
                      {(user.fullName || user.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`font-semibold text-sm truncate leading-tight ${
                          isDark ? "text-[#F8FAFC]" : "text-[#0F172A]"
                        }`}
                      >
                        {user.fullName || user.email}
                      </div>
                      <div
                        className={`text-xs font-mono leading-tight mt-0.5 ${
                          isDark ? "text-[#94A3B8]" : "text-[#64748B]"
                        }`}
                      >
                        Role: {user.role || "User"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span
                    className={`font-semibold text-sm ${
                      isDark ? "text-[#F8FAFC]" : "text-[#0F172A]"
                    }`}
                  >
                    Menu Navigasi
                  </span>
                )}

                {/* Fixed Close Button 'X' at Top Right */}
                <button
                  type="button"
                  onClick={closeMenu}
                  onTouchStart={(e) => e.stopPropagation()}
                  aria-label="Tutup Menu"
                  className={`p-1.5 rounded-xl text-2xl flex items-center justify-center transition-colors flex-shrink-0 ${
                    isDark
                      ? "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
                  }`}
                >
                  <BsX className="text-2xl" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE MENU CONTENT (Proporsional, Nyaman Disentuh, dan Bisa Di-scroll) */}
            <div
              ref={scrollContainerRef}
              onTouchStart={handleContentTouchStart}
              onTouchMove={handleContentTouchMove}
              onTouchEnd={handleTouchEnd}
              className="flex-1 overflow-y-auto px-5 py-3 pb-20 space-y-3 overscroll-contain"
            >
              {/* SECTION: NAVIGASI CEPAT */}
              <div>
                <div
                  className={`text-xs font-mono uppercase tracking-wider font-semibold px-2 mb-2 ${
                    isDark ? "text-[#94A3B8]" : "text-[#64748B]"
                  }`}
                >
                  NAVIGASI CEPAT
                </div>
                <div className="space-y-1.5">
                  <Link
                    to="/"
                    onClick={closeMenu}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                      isDark
                        ? "text-[#F8FAFC] hover:bg-[#334155]/70"
                        : "text-[#0F172A] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BsJournalText className="text-sage-600 dark:text-sage-400 text-base" />
                      <span>Dashboard & Journal</span>
                    </div>
                    <BsChevronRight
                      className={`text-xs ${
                        isDark ? "text-[#94A3B8]" : "text-[#64748B]"
                      }`}
                    />
                  </Link>

                  <Link
                    to="/activity"
                    onClick={closeMenu}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                      isDark
                        ? "text-[#F8FAFC] hover:bg-[#334155]/70"
                        : "text-[#0F172A] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BsCheck2Square className="text-sage-600 dark:text-sage-400 text-base" />
                      <span>Activities & Habit</span>
                    </div>
                    <BsChevronRight
                      className={`text-xs ${
                        isDark ? "text-[#94A3B8]" : "text-[#64748B]"
                      }`}
                    />
                  </Link>

                  <Link
                    to="/ai-features"
                    onClick={closeMenu}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                      isDark
                        ? "text-[#F8FAFC] hover:bg-[#334155]/70"
                        : "text-[#0F172A] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BsCpu className="text-ai-violet-600 dark:text-ai-violet-400 text-base" />
                      <span>Fitur & Personalisasi AI</span>
                    </div>
                    <BsChevronRight
                      className={`text-xs ${
                        isDark ? "text-[#94A3B8]" : "text-[#64748B]"
                      }`}
                    />
                  </Link>
                </div>
              </div>

              {/* SECTION: PANEL ADMIN */}
              {user?.role === "Admin" && (
                <div>
                  <div
                    className={`text-xs font-mono uppercase tracking-wider font-semibold px-2 pt-2 mb-2 ${
                      isDark ? "text-[#94A3B8]" : "text-[#64748B]"
                    }`}
                  >
                    PANEL ADMIN
                  </div>
                  <div className="space-y-1.5">
                    <Link
                      to="/logs"
                      onClick={closeMenu}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                        isDark
                          ? "text-[#F8FAFC] hover:bg-[#334155]/70"
                          : "text-[#0F172A] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <BsShieldLock className="text-amber-600 dark:text-amber-400 text-base" />
                        <span>API Logs & Telemetry</span>
                      </div>
                      <BsChevronRight
                        className={`text-xs ${
                          isDark ? "text-[#94A3B8]" : "text-[#64748B]"
                        }`}
                      />
                    </Link>

                    <Link
                      to="/userActivation"
                      onClick={closeMenu}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                        isDark
                          ? "text-[#F8FAFC] hover:bg-[#334155]/70"
                          : "text-[#0F172A] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <BsPerson className="text-ai-violet-600 dark:text-ai-violet-400 text-base" />
                        <span>Manajemen Pengguna</span>
                      </div>
                      <BsChevronRight
                        className={`text-xs ${
                          isDark ? "text-[#94A3B8]" : "text-[#64748B]"
                        }`}
                      />
                    </Link>
                  </div>
                </div>
              )}

              {/* Tombol Logout: Berada di paling bawah daftar scroll, terlindung dari salah sentuh */}
              {user && (
                <div
                  className={`pt-5 mt-4 border-t pb-8 ${
                    isDark ? "border-[#334155]" : "border-[#E2E8F0]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-3 px-4 rounded-2xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center gap-2 transition-colors border border-red-200 dark:border-red-900/40 active:scale-98"
                  >
                    <FiLogOut className="text-base" />
                    <span>Keluar dari Akun (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Mobile Bottom Navigation Dock (5 Tab Simetris: 2 Kiri - 1 Floating Tengah - 2 Kanan) */}
      <nav
        aria-label="Mobile Navigation Dock"
        className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t px-2 py-2 pb-safe transition-colors ${
          isDark
            ? "bg-[#090D16]/95 border-slate-800"
            : "bg-white/95 border-slate-200"
        }`}
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-center">
          {/* Tab 1: [Home] */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center py-1 transition-all duration-150 ${
              isActive("/")
                ? "text-sage-600 dark:text-sage-400 font-bold"
                : isDark
                  ? "text-[#94A3B8] font-medium"
                  : "text-slate-500 font-medium"
            }`}
          >
            <BsJournalText className="text-lg mb-1" />
            <span className="text-[10px] tracking-tight">Home</span>
            {isActive("/") && (
              <span className="w-1.5 h-1.5 rounded-full bg-sage-500 mt-0.5" />
            )}
          </Link>

          {/* Tab 2: [Habit] */}
          <Link
            to="/activity"
            className={`flex flex-col items-center justify-center py-1 transition-all duration-150 ${
              isActive("/activity")
                ? "text-sage-600 dark:text-sage-400 font-bold"
                : isDark
                  ? "text-[#94A3B8] font-medium"
                  : "text-slate-500 font-medium"
            }`}
          >
            <BsCheck2Square className="text-lg mb-1" />
            <span className="text-[10px] tracking-tight">Habit</span>
            {isActive("/activity") && (
              <span className="w-1.5 h-1.5 rounded-full bg-sage-500 mt-0.5" />
            )}
          </Link>

          {/* Tab 3: [Voice AI] (Tombol Lingkaran Utama: Buka Voice Assistant Bottom Sheet) */}
          <button
            type="button"
            onClick={openAssistant}
            title="Bicara dengan AI Voice Assistant"
            className="flex flex-col items-center -mt-5 group focus:outline-none"
          >
            {/* Lingkaran Tombol Diam (Statis & Overflow Hidden) */}
            <div
              className={`w-12 h-12 rounded-full relative overflow-hidden flex items-center justify-center shadow-lg transition-transform duration-200 active:scale-95 group-hover:scale-105 border-2 ${
                isVoiceOpen
                  ? "border-ai-violet-500 shadow-glow-violet scale-105"
                  : isDark
                    ? "border-[#090D16] shadow-ai-violet-950/60"
                    : "border-white shadow-ai-violet-500/25"
              }`}
            >
              {/* 1. Internal Rotating Gradient (AI Violet & Sage Green) */}
              <div className="absolute -inset-2 bg-[conic-gradient(from_0deg,#7C3AED,#3D996E,#8B5CF6,#7C3AED)] animate-spin-slow opacity-85 blur-[1px]" />

              {/* 2. Frosted Inner Glass Mask untuk Kedalaman & Kontras */}
              <div className="absolute inset-[2px] rounded-full bg-slate-950/25 dark:bg-slate-950/45 backdrop-blur-[0.5px]" />

              {/* 3. Partikel Titik-Titik Kecil Bergerak Mengorbit (Signature Antigravity Particles) */}
              <div className="absolute inset-0 flex items-center justify-center animate-[spin_8s_linear_infinite] pointer-events-none">
                {/* Titik 1: Atas Kanan */}
                <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-white/95 shadow-[0_0_5px_rgba(255,255,255,0.9)] animate-pulse" />
                {/* Titik 2: Bawah Kiri */}
                <span className="absolute bottom-2.5 left-2 w-1 h-1 rounded-full bg-sage-300 shadow-[0_0_4px_rgba(149,205,177,0.9)]" />
                {/* Titik 3: Atas Kiri Mikro */}
                <span className="absolute top-3 left-2.5 w-1 h-1 rounded-full bg-ai-violet-200 shadow-[0_0_4px_rgba(221,214,254,0.8)] animate-pulse delay-100" />
              </div>

              {/* 4. Ikon Utama BsStars (3 Bintang) Berkilau Halus di Tengah */}
              <div className="relative z-10 text-white flex items-center justify-center animate-twinkle">
                <BsStars className="text-xl drop-shadow-[0_0_6px_rgba(255,255,255,0.75)]" />
              </div>
            </div>

            <span
              className={`text-[10px] font-semibold mt-1 transition-colors ${
                isVoiceOpen
                  ? "text-ai-violet-600 dark:text-ai-violet-400 font-bold"
                  : isDark
                    ? "text-[#94A3B8] group-hover:text-[#F8FAFC]"
                    : "text-slate-500 group-hover:text-slate-900"
              }`}
            >
              Bicara
            </span>
          </button>

          {/* Tab 4: [Memori] (Mengarah ke Fitur AI & Memory) */}
          <Link
            to="/ai-features"
            className={`flex flex-col items-center justify-center py-1 transition-all duration-150 ${
              isActive("/ai-features")
                ? "text-ai-violet-600 dark:text-ai-violet-400 font-bold"
                : isDark
                  ? "text-[#94A3B8] font-medium"
                  : "text-slate-500 font-medium"
            }`}
          >
            <BsDatabase className="text-lg mb-1" />
            <span className="text-[10px] tracking-tight">Memori</span>
            {isActive("/ai-features") && (
              <span className="w-1.5 h-1.5 rounded-full bg-ai-violet-500 mt-0.5" />
            )}
          </Link>

          {/* Tab 5: [Menu] (Membuka Drawer Menu) */}
          <button
            type="button"
            onClick={isMenuOpen ? closeMenu : openMenu}
            className={`flex flex-col items-center justify-center py-1 transition-all duration-150 ${
              isMenuOpen
                ? "text-ai-violet-600 dark:text-ai-violet-400 font-bold"
                : isDark
                  ? "text-[#94A3B8] font-medium"
                  : "text-slate-500 font-medium"
            }`}
          >
            <BsList className="text-lg mb-1" />
            <span className="text-[10px] tracking-tight">Menu</span>
            {isMenuOpen && (
              <span className="w-1.5 h-1.5 rounded-full bg-ai-violet-500 mt-0.5" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}

export default MobileNavigation;
