import axios from "axios";
import { handleAuthExpired } from "../utils/authUtils";

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

// 3. Pasang interceptor response (auto-kick jika status 401 Unauthorized / Token Expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      handleAuthExpired();
    }
    return Promise.reject(error);
  },
);

// 4. Export di paling bawah
export default api;
