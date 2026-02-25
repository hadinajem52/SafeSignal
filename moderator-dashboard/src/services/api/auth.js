import { api, rawApi } from "./client";
import { requestData, requestWithMessage } from "./request";

export const authAPI = {
  register: async ({ username, email, password, role = "citizen" }) =>
    requestWithMessage(
      () =>
        api.post("/auth/register", {
          username,
          email,
          password,
          role,
        }),
      "Failed to submit application",
    ),

  login: async (email, password) =>
    requestData(() => rawApi.post("/auth/login", { email, password }), "Login failed"),

  me: async (token, signal) =>
    requestData(
      () =>
        rawApi.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        }),
      "Session expired",
    ),
};
