import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  BsSun,
  BsMoonStars,
  BsStars,
  BsCheck2Square,
  BsCpu,
  BsShieldLock,
  BsJournalText,
} from "react-icons/bs";
import { FiLogOut, FiUser } from "react-icons/fi";

export function DesktopNavbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/", icon: BsJournalText },
    { label: "Activities", path: "/activity", icon: BsCheck2Square },
    { label: "AI Features", path: "/ai-features", icon: BsCpu },
  ];

  const adminItems = [
    { label: "API Logs", path: "/logs", icon: BsShieldLock },
    { label: "Users", path: "/userActivation", icon: FiUser },
  ];

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="hidden lg:block sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-deep-950/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-ai-violet-600 via-ai-violet-500 to-sage-500 flex items-center justify-center text-white shadow-glow-violet transition-transform duration-200 group-hover:scale-105">
            <BsStars className="text-lg animate-twinkle" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                Personal Assistant
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wide uppercase bg-sage-100 text-sage-700 dark:bg-sage-900/50 dark:text-sage-300 border border-sage-200 dark:border-sage-800">
                Mindful
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono -mt-0.5">
              Mindful Journal & Tracker
            </span>
          </div>
        </Link>

        {/* Center: Navigation Links (Linear Pill Style) */}
        <nav className="flex items-center gap-1 bg-slate-100/80 dark:bg-deep-850/90 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                  active
                    ? "bg-white dark:bg-deep-750 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/60"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40"
                }`}
              >
                <Icon
                  className={`text-sm ${active ? "text-sage-600 dark:text-sage-400" : ""}`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user?.role === "Admin" && (
            <>
              <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1 self-center" />
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                      active
                        ? "bg-white dark:bg-deep-750 text-ai-violet-700 dark:text-ai-violet-300 shadow-sm border border-slate-200/50 dark:border-slate-700/60"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <Icon
                      className={`text-sm ${active ? "text-ai-violet-600 dark:text-ai-violet-400" : ""}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Right: Theme Switcher & User Profile */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-deep-850 dark:hover:bg-deep-750 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-800 transition-all duration-150 shadow-xs"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <BsSun className="text-amber-400 text-base transition-transform rotate-0 hover:rotate-45" />
            ) : (
              <BsMoonStars className="text-ai-violet-600 text-base transition-transform rotate-0 hover:-rotate-12" />
            )}
          </button>

          {/* User Profile Pill */}
          {user && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                {(user.fullName || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                  {user.fullName || user.email}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 capitalize">
                  {user.role || "User"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 ml-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Logout"
              >
                <FiLogOut className="text-sm" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default DesktopNavbar;
