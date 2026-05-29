import { API_BASE_URL } from "./network";

const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");
const PHOTO_URL_FIELDS = ["photo_urls", "photoUrls", "photos"];
const VIDEO_URL_FIELDS = ["video_url", "videoUrl", "video"];

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
  if (!url || /^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  return `${API_ORIGIN}/${String(url).replace(/^\/+/, "")}`;
}

export function getReportVideoUrl(report) {
  for (const field of VIDEO_URL_FIELDS) {
    const url = report?.[field];

    if (typeof url === "string" && url.trim()) {
      return url;
    }
  }

  return null;
}
