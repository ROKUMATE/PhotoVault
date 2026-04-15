import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const http = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const userId = window.localStorage.getItem("photovault:userId");
  if (userId) {
    config.headers = config.headers ?? {};
    config.headers["x-user-id"] = userId;
  }

  return config;
});

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}
