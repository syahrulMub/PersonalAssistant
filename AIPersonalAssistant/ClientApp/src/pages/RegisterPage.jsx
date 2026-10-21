import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  BsStars,
  BsSun,
  BsMoonStars,
  BsPerson,
  BsEnvelope,
  BsLock,
  BsEye,
  BsEyeSlash,
  BsCheckCircle,
  BsExclamationTriangle,
  BsArrowRight,
} from "react-icons/bs";

export const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setIsLoading(true);

    try {
      const res = await register(fullName, email, password);
      // Jika backend memerlukan approval admin
      if (res.message) {
        setInfoMsg(res.message);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Pendaftaran akun gagal. Silakan coba kembali.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-deep-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 relative overflow-hidden selection:bg-sage-200 selection:text-sage-900 dark:selection:bg-sage-900 dark:selection:text-sage-200">
      {/* Ambient Lighting Gradients */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sage-500/10 dark:bg-sage-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-ai-violet-500/10 dark:bg-ai-violet-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Theme Switcher */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle Theme"
        className="absolute top-5 right-5 sm:top-8 sm:right-8 p-2.5 rounded-2xl bg-white/80 dark:bg-deep-850/80 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs backdrop-blur-md z-20"
        title={isDark ? "Beralih ke Light Mode" : "Beralih ke Dark Mode"}
      >
        {isDark ? (
          <BsSun className="text-amber-400 text-lg transition-transform hover:rotate-45" />
        ) : (
          <BsMoonStars className="text-ai-violet-600 text-lg transition-transform hover:-rotate-12" />
        )}
      </button>

      {/* Main Register Card */}
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-deep-850/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl dark:shadow-glass relative z-10 animate-fade-in space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sage-600 via-sage-500 to-ai-violet-500 flex items-center justify-center text-white shadow-glow-sage mx-auto transition-transform hover:scale-105 duration-200">
            <BsStars className="text-2xl animate-twinkle" />
          </div>

          <div className="flex justify-center">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wide uppercase bg-sage-100 text-sage-700 dark:bg-sage-900/50 dark:text-sage-300 border border-sage-200 dark:border-sage-800">
              Registrasi Akun Baru
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Mulai Perjalanan Mindful
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
            Buat akun untuk mengelola refleksi dan produktivitas harian
          </p>
        </div>

        {/* Success / Info Alert */}
        {infoMsg && (
          <div className="p-4 rounded-2xl bg-sage-50/90 dark:bg-sage-950/40 border border-sage-200/80 dark:border-sage-800/60 text-sage-800 dark:text-sage-300 text-xs flex items-start gap-2.5 animate-fade-in shadow-xs">
            <BsCheckCircle className="text-sage-500 text-base mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <span className="font-semibold block">Pendaftaran Berhasil</span>
              <p className="leading-relaxed">{infoMsg}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 font-semibold text-sage-700 dark:text-sage-300 underline text-xs mt-1"
              >
                <span>Menuju Halaman Login</span>
                <BsArrowRight className="text-xs" />
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in shadow-xs">
            <BsExclamationTriangle className="text-rose-500 text-sm mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold block mb-0.5">Pendaftaran Gagal</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-slate-500">
                <BsPerson className="text-sm" />
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50/80 dark:bg-deep-900/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/40 focus:border-sage-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Alamat Email
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-slate-500">
                <BsEnvelope className="text-sm" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50/80 dark:bg-deep-900/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/40 focus:border-sage-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-slate-500">
                <BsLock className="text-sm" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                disabled={isLoading}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border bg-slate-50/80 dark:bg-deep-900/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/40 focus:border-sage-500 transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1"
                title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
              >
                {showPassword ? (
                  <BsEyeSlash className="text-sm" />
                ) : (
                  <BsEye className="text-sm" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sage-600 via-sage-500 to-ai-violet-600 hover:from-sage-500 hover:to-ai-violet-500 shadow-md shadow-sage-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mendaftarkan Akun...</span>
              </>
            ) : (
              <>
                <span>Daftarkan Akun Baru</span>
                <BsArrowRight className="text-sm" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-center space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sudah memiliki akun?{" "}
            <Link
              to="/login"
              className="font-semibold text-ai-violet-600 dark:text-ai-violet-400 hover:underline transition-colors"
            >
              Masuk di sini
            </Link>
          </p>

          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
            dev by syahrulMub with AI @2026
          </p>
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
