import { API_BASE_URL } from "./network";

const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");
const PHOTO_URL_FIELDS = ["photo_urls", "photoUrls", "photos"];

export function getReportPhotoUrls(report) {
  for (const field of PHOTO_URL_FIELDS) {
    const urls = report?.[field];

    if (Array.isArray(urls) && urls.length > 0) {
      return urls.filter((url) => typeof url === "string" && url.trim());
    }
  }

  return [];
}

export function resolveReportPhotoUrl(url) {
  if (!url || /^(https?:|data:|blob:|file:)/i.test(url)) {
    return url;
  }

  return `${API_ORIGIN}/${String(url).replace(/^\/+/, "")}`;
}
