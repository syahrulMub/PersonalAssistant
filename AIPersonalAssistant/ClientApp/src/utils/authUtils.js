/**
 * Utility untuk Otentikasi dan Validasi Token JWT
 */

/**
 * Decode payload dari token JWT
 * @param {string} token - Token JWT
 * @returns {object|null} - Decoded payload object atau null jika tidak valid
 */
export const decodeJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

/**
 * Memeriksa apakah token JWT sudah kedaluwarsa (expired)
 * @param {string} token - Token JWT
 * @returns {boolean} - true jika expired/tidak valid, false jika masih aktif
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload) return true;
  if (!payload.exp) return false;

  // Buffer 5 detik untuk mencegah kondisi balapan (race condition) sebelum token habis
  return Date.now() >= payload.exp * 1000 - 5000;
};

/**
 * Menangani token yang telah kedaluwarsa atau sesi berakhir:
 * - Hapus data sesi dari localStorage
 * - Kirim event kustom ke React tree
 * - Tendang/redirect user ke halaman /login
 */
export const handleAuthExpired = () => {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch (e) {
    console.error("Gagal menghapus sesi otentikasi dari localStorage:", e);
  }

  if (typeof window !== "undefined") {
    // Beritahukan komponen aktif lewat CustomEvent
    window.dispatchEvent(new Event("auth:expired"));

    const pathname = window.location.pathname;
    // Jangan redirect jika pengguna memang sedang berada di halaman login atau register
    if (!pathname.startsWith("/login") && !pathname.startsWith("/register")) {
      window.location.href = "/login?expired=1";
    }
  }
};

let isFetchInterceptorSetUp = false;

/**
 * Memasang interceptor global pada window.fetch agar setiap request internal
 * yang mengembalikan status HTTP 401 Unauthorized otomatis memicu handleAuthExpired()
 */
export const setupFetchInterceptor = () => {
  if (typeof window === "undefined" || isFetchInterceptorSetUp) return;
  isFetchInterceptorSetUp = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);

      if (response && response.status === 401) {
        const hasToken = Boolean(localStorage.getItem("token"));
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

        if (hasToken || (url && url.includes("/api/"))) {
          handleAuthExpired();
        }
      }

      return response;
    } catch (err) {
      throw err;
    }
  };
};
