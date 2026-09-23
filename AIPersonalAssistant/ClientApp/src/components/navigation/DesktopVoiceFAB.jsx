import React from "react";
import { BsStars, BsMicFill } from "react-icons/bs";
import { useVoiceAssistant } from "../../context/VoiceAssistantContext";

/**
 * Desktop Floating Action Button (FAB)
 * Melayang di pojok kanan bawah desktop untuk membuka AI Voice Assistant secara instan.
 */
export const DesktopVoiceFAB = () => {
  const { openAssistant, isOpen } = useVoiceAssistant();

  // Sembunyikan FAB jika modal Voice Assistant sedang terbuka
  if (isOpen) return null;

  return (
    <div className="hidden lg:flex fixed bottom-6 right-6 z-40 animate-fade-in">
      <button
        type="button"
        onClick={openAssistant}
        aria-label="Tanya AI Assistant"
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-ai-violet-600 via-purple-600 to-indigo-600 text-white font-medium text-xs shadow-lg shadow-ai-violet-500/30 hover:shadow-ai-violet-500/50 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 backdrop-blur-xs select-none"
      >
        {/* Glow Halo Ping Ring */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-ai-violet-500 to-purple-500 opacity-0 group-hover:opacity-40 blur-xs transition-opacity duration-300 -z-10" />

        {/* Icon with Star Twinkle */}
        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs flex-shrink-0">
          <BsStars className="animate-twinkle" />
        </div>

        {/* Text Label */}
        <span className="tracking-wide font-semibold text-xs drop-shadow-xs">
          Ask AI Assistant
        </span>

        {/* Small Mic Icon Accent */}
        <BsMicFill className="text-[11px] text-white/80 group-hover:text-white transition-colors" />
      </button>
    </div>
  );
};

export default DesktopVoiceFAB;
