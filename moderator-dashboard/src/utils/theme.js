import { STORAGE_KEYS } from "../constants/storageKeys";

function normalizeStoredValue(value) {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

export function readStoredDarkMode() {
  const stored = normalizeStoredValue(
    localStorage.getItem(STORAGE_KEYS.DARK_MODE),
  );
  return stored ?? false;
}

export function persistDarkMode(enabled) {
  localStorage.setItem(STORAGE_KEYS.DARK_MODE, enabled ? "1" : "0");
}

export function applyDarkMode(enabled) {
  const isDark = Boolean(enabled);
  const root = document.documentElement;

  root.classList.toggle("dark", isDark);
  root.setAttribute("data-theme", isDark ? "dark" : "light");
  root.style.colorScheme = isDark ? "dark" : "light";
}
