import axios from "axios";

// 1. Buat instance dulu
const api = axios.create({
  baseURL: "/api",
});

// 2. Pasang interceptor request (ambil token langsung dari localStorage)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 3. Pasang interceptor response (JANGAN panggil useAuth() di sini)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// 4. Export di paling bawah
export default api;
