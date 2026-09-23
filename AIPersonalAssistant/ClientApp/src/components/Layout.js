import React from "react";
import { useLocation } from "react-router-dom";
import { DesktopNavbar } from "./navigation/DesktopNavbar";
import { MobileNavigation } from "./navigation/MobileNavigation";
import { DesktopVoiceFAB } from "./navigation/DesktopVoiceFAB";
import { VoiceAssistantModal } from "./activity/VoiceAssistantModal";
import { VoiceAssistantProvider } from "../context/VoiceAssistantContext";

export function Layout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <VoiceAssistantProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-deep-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 selection:bg-sage-200 selection:text-sage-900 dark:selection:bg-sage-900 dark:selection:text-sage-200">
        {/* 1. Desktop Navbar (Linear/Raycast Style) */}
        <DesktopNavbar />

        {/* 2. Mobile Top Header & Bottom Dock (Apple Style) */}
        <MobileNavigation />

        {/* 3. Main Content Wrapper */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-12 animate-fade-in">
          {children}
        </main>

        {/* 4. Global Subtle Footer untuk halaman selain Home */}
        {!isHome && (
          <footer className="w-full py-4 text-center text-xs font-mono text-slate-400 dark:text-[#94A3B8]/70 pb-24 lg:pb-6">
            dev by syahrulMub with AI @2026
          </footer>
        )}

        {/* 5. Desktop Floating Action Button (Pojok Kanan Bawah) */}
        <DesktopVoiceFAB />

        {/* 6. AI Voice Assistant Modal (Bottom Sheet Mobile & Floating Overlay Desktop) */}
        <VoiceAssistantModal />
      </div>
    </VoiceAssistantProvider>
  );
}

export default Layout;
