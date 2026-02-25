import { api } from "./api/client";
import { authAPI } from "./api/auth";
import { reportsAPI } from "./api/reports";
import { usersAPI } from "./api/users";
import { statsAPI } from "./api/stats";
import { settingsAPI } from "./api/settings";
import { leiAPI } from "./api/lei";
import { adminAPI } from "./api/admin";
import { timelineAPI } from "./api/timeline";

export {
  authAPI,
  reportsAPI,
  usersAPI,
  statsAPI,
  settingsAPI,
  leiAPI,
  adminAPI,
  timelineAPI,
};

export default api;
