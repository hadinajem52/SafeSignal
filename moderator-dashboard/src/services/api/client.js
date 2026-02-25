import axios from "axios";
import { API_BASE_URL } from "../../utils/network";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { ROUTES } from "../../constants/routes";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const rawApi = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== ROUTES.LOGIN
      ) {
        window.location.href = ROUTES.LOGIN;
      }
    }

    return Promise.reject(error);
  },
);
