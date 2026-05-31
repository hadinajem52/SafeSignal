import {
  STATUS_COLORS,
  STATUS_COLORS_HEX,
  STATUS_LABELS,
} from "../constants/incident";

export const SEVERITY_VARIANTS = {
  REPORTS: "reports",
  LAW_ENFORCEMENT: "law_enforcement",
};

export const getStatusColor = (status) =>
  STATUS_COLORS[status] || STATUS_COLORS.default;

export const getStatusHexColor = (status) =>
  STATUS_COLORS_HEX[status] || STATUS_COLORS_HEX.default;

export const formatStatusLabel = (status) => {
  if (!status || typeof status !== "string") {
    return "N/A";
  }

  if (STATUS_LABELS[status]) {
    return STATUS_LABELS[status];
  }

  return status.replace(/_/g, " ").toUpperCase();
};

export const formatCategoryLabel = (category) => {
  if (!category || typeof category !== "string") {
    return "N/A";
  }

  return category.replace(/_/g, " ").toUpperCase();
};

export const openMapsUrl = (latitude, longitude) =>
  Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : "#";
