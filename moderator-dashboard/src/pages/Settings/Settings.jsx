import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LoadingState from "../../components/LoadingState";
import { useAuth } from "../../context/AuthContext";
import { settingsAPI } from "../../services/api";
import { applyDarkMode, persistDarkMode } from "../../utils/theme";
import ConfirmDialog from "../../components/ConfirmDialog";
import { SETTINGS_CSS } from "./settingsStyles";
import {
  DAYS,
  DEFAULT_SETTINGS,
  IC,
  NAV,
  SEVERITIES,
} from "./settingsConstants";
import { getInitials, loadLocalPrefs, saveLocalPrefs } from "./settingsUtils";

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
function SqToggle({ checked, onChange, disabled, id }) {
  return (
    <label className="sq-wrap" htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <div className="sq-track" />
      <div className="sq-thumb" />
    </label>
  );
}

function SettingRow({ label, desc, children, noBorderTop }) {
  return (
    <div className="st-row" style={noBorderTop ? { borderTop: "none" } : {}}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="st-label">{label}</div>
        {desc && <div className="st-desc">{desc}</div>}
      </div>
      <div className="st-ctrl">{children}</div>
    </div>
  );
}

function SecHead({ title, meta }) {
  return (
    <div className="st-sec-head">
      <div className="st-sec-title">{title}</div>
      <div className="st-sec-line" />
      {meta && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--color-text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}

function Toast({ message, type = "success" }) {
  return (
    <div
      className={`st-toast${type === "error" ? " error" : type === "warn" ? " warn" : ""}`}
    >
      {type === "success" ? IC.check : IC.warn}
      {message}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────────── */
function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState("profile");
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Local prefs — not persisted to server
  const localPrefs = useMemo(() => loadLocalPrefs(), []);
  const [alertSeverities, setAlertSeverities] = useState(
    localPrefs.alertSeverities ?? ["critical", "high"],
  );
  const [digestDays, setDigestDays] = useState(
    localPrefs.digestDays ?? [0, 1, 2, 3, 4],
  );
  const [digestFreq, setDigestFreq] = useState(
    localPrefs.digestFreq ?? "weekly",
  );
  const [density, setDensity] = useState(localPrefs.density ?? "comfortable");
  const [dateFormat, setDateFormat] = useState(
    localPrefs.dateFormat ?? "MM/DD/YYYY",
  );
  const [timezone, setTimezone] = useState(
    localPrefs.timezone ?? "Asia/Beirut",
  );
  const [language, setLanguage] = useState(localPrefs.language ?? "en");

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username ?? "");
  const [emailInput, setEmailInput] = useState(user?.email ?? "");

  // Security
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  // Confirm reset
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (user?.username) setDisplayName(user.username);
    if (user?.email) setEmailInput(user.email);
  }, [user]);

  /* ── Fetch settings ──────────────────────────────────────────────────────── */
  const { isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboardSettings"],
    queryFn: async () => {
      const result = await settingsAPI.get();
      if (result.success) return result.data;
      throw new Error(result.error);
    },
    onSuccess: (data) => {
      setSettings(data);
      if (typeof data.darkMode === "boolean") {
        applyDarkMode(data.darkMode);
        persistDarkMode(data.darkMode);
      }
    },
  });

  const persistedSettings = queryClient.getQueryData(["dashboardSettings"]);
  useEffect(() => {
    if (persistedSettings) {
      setSettings(persistedSettings);
      if (typeof persistedSettings.darkMode === "boolean") {
        applyDarkMode(persistedSettings.darkMode);
        persistDarkMode(persistedSettings.darkMode);
      }
    }
  }, [persistedSettings]);

  /* ── Toast ───────────────────────────────────────────────────────────────── */
  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── Mutations ───────────────────────────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async (next) => {
      const result = await settingsAPI.update(next);
      if (result.success) return result.data;
      throw new Error(result.error);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["dashboardSettings"], data);
      setSettings(data);
      showToast("Settings saved.");
    },
    onError: (err) =>
      showToast(err.message || "Failed to save settings.", "error"),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const result = await settingsAPI.reset();
      if (result.success) return result.data;
      throw new Error(result.error);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["dashboardSettings"], data);
      setSettings(data);
      if (typeof data.darkMode === "boolean") {
        applyDarkMode(data.darkMode);
        persistDarkMode(data.darkMode);
      }
      showToast("Settings reset to defaults.");
    },
    onError: (err) => showToast(err.message || "Failed to reset.", "error"),
  });

  const digestMutation = useMutation({
    mutationFn: async () => {
      const result = await settingsAPI.sendWeeklyDigestNow();
      if (result.success) return result.data;
      throw new Error(result.error);
    },
    onSuccess: (data) =>
      showToast(`Digest sent. ${data?.summary?.total_reports ?? 0} reports.`),
    onError: (err) =>
      showToast(err.message || "Failed to send digest.", "error"),
  });

  const darkModeMutation = useMutation({
    mutationFn: async (val) => {
      const result = await settingsAPI.update({ darkMode: val });
      if (result.success) return result.data;
      throw new Error(result.error);
    },
    onMutate: async (val) => {
      await queryClient.cancelQueries({ queryKey: ["dashboardSettings"] });
      const prev = queryClient.getQueryData(["dashboardSettings"]);
      queryClient.setQueryData(["dashboardSettings"], (c) =>
        c ? { ...c, darkMode: val } : c,
      );
      return { prev };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["dashboardSettings"], data);
      setSettings(data);
      applyDarkMode(data.darkMode);
      persistDarkMode(data.darkMode);
      showToast("Dark mode preference saved.");
    },
    onError: (err, _val, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["dashboardSettings"], ctx.prev);
        setSettings(ctx.prev);
        applyDarkMode(ctx.prev.darkMode);
        persistDarkMode(ctx.prev.darkMode);
      }
      showToast(err.message || "Failed to update dark mode.", "error");
    },
  });

  const isMutating =
    saveMutation.isPending ||
    resetMutation.isPending ||
    digestMutation.isPending ||
    darkModeMutation.isPending;

  /* ── Handlers ────────────────────────────────────────────────────────────── */
  function updateApiSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function persistLocalPref(key, value) {
    const p = loadLocalPrefs();
    p[key] = value;
    saveLocalPrefs(p);
  }

  function handleDarkModeChange(val) {
    applyDarkMode(val);
    persistDarkMode(val);
    setSettings((p) => ({ ...p, darkMode: val }));
    darkModeMutation.mutate(val);
  }

  function toggleSeverity(key) {
    setAlertSeverities((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      persistLocalPref("alertSeverities", next);
      return next;
    });
  }

  function toggleDay(i) {
    setDigestDays((prev) => {
      const next = prev.includes(i)
        ? prev.filter((d) => d !== i)
        : [...prev, i].sort((a, b) => a - b);
      persistLocalPref("digestDays", next);
      return next;
    });
  }

  function handleChangePassword(e) {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) {
      showToast("Please fill in all password fields.", "warn");
      return;
    }
    if (newPw !== confirmPw) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (newPw.length < 8) {
      showToast("Password must be at least 8 characters.", "warn");
      return;
    }
    showToast("Password change is not available in this build.", "warn");
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  }

  /* ── Member since ────────────────────────────────────────────────────────── */
  const memberSince = useMemo(() => {
    const raw = user?.createdAt || user?.created_at;
    if (!raw) return "—";
    try {
      return new Date(raw).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  }, [user]);

  /* ── Loading / error ─────────────────────────────────────────────────────── */
  if (isLoading) return <LoadingState />;
  if (isError) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "var(--color-error)", marginBottom: 12 }}>
          {error?.message || "Failed to load settings"}
        </p>
        <button className="st-btn st-btn-primary" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  /* ── Section renderers ───────────────────────────────────────────────────── */
  function renderProfile() {
    const initials = getInitials(displayName || user?.username || "");
    return (
      <>
        <div className="st-section">
          <SecHead title="Profile" />
          <div className="st-profile-card">
            <div className="st-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="st-profile-name">
                {displayName || user?.username || "Unknown"}
              </div>
              <div className="st-profile-role">{user?.role ?? "moderator"}</div>
              <div className="st-profile-email">{user?.email ?? ""}</div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              {editingProfile ? (
                <button
                  className="st-btn st-btn-primary"
                  onClick={() => {
                    setEditingProfile(false);
                    showToast("Profile display updated.");
                  }}
                >
                  {IC.check} Save
                </button>
              ) : (
                <button
                  className="st-btn st-btn-ghost"
                  onClick={() => setEditingProfile(true)}
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="st-block">
            <SettingRow
              label="Display Name"
              desc="Shown in audit logs and team views"
              noBorderTop
            >
              {editingProfile ? (
                <input
                  className="st-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{ minWidth: 200 }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text)",
                  }}
                >
                  {displayName || user?.username}
                </span>
              )}
            </SettingRow>
            <SettingRow
              label="Email Address"
              desc="Used for notifications and login"
            >
              {editingProfile ? (
                <input
                  className="st-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ minWidth: 220 }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-muted)",
                  }}
                >
                  {user?.email}
                </span>
              )}
            </SettingRow>
            <SettingRow
              label="Account Role"
              desc="Assigned by admin — contact admin to change"
            >
              <span className="st-role-badge">{user?.role ?? "moderator"}</span>
            </SettingRow>
            <SettingRow label="Member Since" desc="Account creation date">
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                }}
              >
                {memberSince}
              </span>
            </SettingRow>
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Preferences" />
          <div className="st-block">
            <SettingRow
              label="Language"
              desc="Interface display language"
              noBorderTop
            >
              <select
                className="st-select"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  persistLocalPref("language", e.target.value);
                }}
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="fr">French</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Timezone"
              desc="Used for timestamps throughout the dashboard"
            >
              <select
                className="st-select"
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  persistLocalPref("timezone", e.target.value);
                }}
              >
                <option value="Asia/Beirut">Asia/Beirut (GMT+3)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">
                  America/New_York (GMT-5)
                </option>
                <option value="Europe/London">Europe/London (GMT+1)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Date Format"
              desc="Applied to all timestamps and exports"
            >
              <select
                className="st-select"
                value={dateFormat}
                onChange={(e) => {
                  setDateFormat(e.target.value);
                  persistLocalPref("dateFormat", e.target.value);
                }}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </SettingRow>
          </div>
        </div>
      </>
    );
  }

  function renderNotifications() {
    return (
      <>
        <div className="st-section">
          <SecHead title="Channels" />
          <div className="st-block">
            <SettingRow
              label="Email Notifications"
              desc="Receive email notifications for report updates"
              noBorderTop
            >
              <SqToggle
                id="notif-email"
                checked={settings.emailNotifications}
                onChange={(val) => updateApiSetting("emailNotifications", val)}
                disabled={isMutating}
              />
            </SettingRow>
            <SettingRow
              label="Report Alerts"
              desc="Get notified immediately for high-severity reports"
            >
              <SqToggle
                id="notif-alerts"
                checked={settings.reportAlerts}
                onChange={(val) => updateApiSetting("reportAlerts", val)}
                disabled={isMutating}
              />
            </SettingRow>
            <SettingRow
              label="Browser Notifications"
              desc="Push notifications in supported browsers"
            >
              <SqToggle
                id="notif-browser"
                checked={false}
                onChange={() =>
                  showToast("Browser notifications not yet supported.", "warn")
                }
              />
            </SettingRow>
            <SettingRow
              label="Sound Alerts"
              desc="Play a sound for critical incident notifications"
            >
              <SqToggle
                id="notif-sound"
                checked={false}
                onChange={() =>
                  showToast("Sound alerts not yet supported.", "warn")
                }
              />
            </SettingRow>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 10,
            }}
          >
            <button
              className="st-btn st-btn-primary"
              onClick={() => saveMutation.mutate(settings)}
              disabled={isMutating}
            >
              {IC.check} Save Channels
            </button>
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Alert Severity Filter" meta="Tap to toggle" />
          <div className="st-sev-grid">
            {SEVERITIES.map((s) => {
              const active = alertSeverities.includes(s.key);
              return (
                <div
                  key={s.key}
                  className={`st-sev-cell${active ? " active" : ""}`}
                  onClick={() => toggleSeverity(s.key)}
                >
                  <div className="st-sev-top">
                    <div
                      className="st-sev-dot"
                      style={{
                        background: s.color,
                        opacity: active ? 1 : 0.25,
                      }}
                    />
                    {active && (
                      <span style={{ color: s.color }}>{IC.check}</span>
                    )}
                  </div>
                  <div
                    className="st-sev-name"
                    style={{
                      color: active ? s.color : "var(--color-text-muted)",
                    }}
                  >
                    {s.label}
                  </div>
                  <div className="st-sev-desc">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Weekly Digest" />
          <div className="st-block">
            <SettingRow
              label="Enable Weekly Digest"
              desc="Receive a weekly summary of moderation activity"
              noBorderTop
            >
              <SqToggle
                id="notif-digest"
                checked={settings.weeklyDigest}
                onChange={(val) => {
                  const next = { ...settings, weeklyDigest: val };
                  setSettings(next);
                  saveMutation.mutate(next);
                }}
                disabled={isMutating}
              />
            </SettingRow>
            <SettingRow
              label="Frequency"
              desc="How often to receive the digest"
            >
              <select
                className="st-select"
                value={digestFreq}
                onChange={(e) => {
                  setDigestFreq(e.target.value);
                  persistLocalPref("digestFreq", e.target.value);
                }}
                disabled={!settings.weeklyDigest}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
              </select>
            </SettingRow>
            {settings.weeklyDigest && (
              <div className="st-day-grid">
                {DAYS.map((d, i) => {
                  const on = digestDays.includes(i);
                  return (
                    <div
                      key={d}
                      className="st-day-item"
                      onClick={() => toggleDay(i)}
                    >
                      <span className="st-day-label">{d}</span>
                      <div className={`st-day-box ${on ? "on" : "off"}`}>
                        {on ? (
                          IC.check
                        ) : (
                          <span style={{ fontSize: 10 }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {settings.weeklyDigest && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
              }}
            >
              <button
                className="st-btn st-btn-ghost"
                onClick={() => digestMutation.mutate()}
                disabled={digestMutation.isPending}
              >
                {IC.send}{" "}
                {digestMutation.isPending ? "Sending…" : "Send Digest Now"}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderAppearance() {
    return (
      <>
        <div className="st-section">
          <SecHead title="Theme" />
          <div className="st-block">
            <SettingRow
              label="Dark Mode"
              desc="Use a dark interface theme across the dashboard"
              noBorderTop
            >
              <SqToggle
                id="app-dark"
                checked={settings.darkMode}
                onChange={handleDarkModeChange}
                disabled={darkModeMutation.isPending}
              />
            </SettingRow>
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Display" />
          <div className="st-block">
            <SettingRow
              label="Density"
              desc="Control spacing and row height in tables and lists"
              noBorderTop
            >
              <select
                className="st-select"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Date Format"
              desc="Applied to all timestamps and exports"
            >
              <select
                className="st-select"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Timezone"
              desc="Used for timestamps throughout the dashboard"
            >
              <select
                className="st-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Asia/Beirut">Asia/Beirut (GMT+3)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">
                  America/New_York (GMT-5)
                </option>
                <option value="Europe/London">Europe/London (GMT+1)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
              </select>
            </SettingRow>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 10,
            }}
          >
            <button
              className="st-btn st-btn-primary"
              onClick={() => {
                persistLocalPref("density", density);
                persistLocalPref("dateFormat", dateFormat);
                persistLocalPref("timezone", timezone);
                showToast("Appearance preferences saved.");
              }}
              disabled={isMutating}
            >
              {IC.check} Save Appearance
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderSecurity() {
    return (
      <>
        <div className="st-section">
          <SecHead title="Change Password" />
          <div className="st-block">
            <div className="st-col-row">
              <div className="st-label">Current Password</div>
              <div className="st-input-row">
                <input
                  className="st-input"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
              </div>
            </div>
            <div className="st-col-row">
              <div className="st-label">New Password</div>
              <div className="st-input-row">
                <input
                  className="st-input"
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>
            </div>
            <div className="st-col-row">
              <div className="st-label">Confirm New Password</div>
              <div className="st-input-row">
                <input
                  className="st-input"
                  type={showPw ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                />
                <button
                  className="st-btn st-btn-ghost"
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ padding: "6px 10px" }}
                >
                  {showPw ? IC.eyeOff : IC.eye}
                </button>
              </div>
            </div>
            <div className="st-row" style={{ justifyContent: "flex-end" }}>
              <button
                className="st-btn st-btn-primary"
                onClick={handleChangePassword}
              >
                {IC.lock} Update Password
              </button>
            </div>
          </div>
        </div>

        <div className="st-section">
          <SecHead title="Two-Factor Authentication" />
          <div className="st-block">
            <SettingRow
              label="Enable 2FA"
              desc="Require a one-time code from your authenticator app at login"
              noBorderTop
            >
              <SqToggle
                id="sec-2fa"
                checked={twoFaEnabled}
                onChange={() => {
                  showToast(
                    "Two-factor authentication is not available in this build.",
                    "warn",
                  );
                  setTwoFaEnabled(false);
                }}
              />
            </SettingRow>
          </div>
        </div>
      </>
    );
  }

  function renderSystem() {
    return (
      <>
        <div className="st-section">
          <SecHead title="System Information" />
          <div className="st-sys-grid">
            <div className="st-sys-cell">
              <div className="st-sys-cell-label">Dashboard Version</div>
              <div className="st-sys-cell-value">1.0.0</div>
            </div>
            <div className="st-sys-cell">
              <div className="st-sys-cell-label">API Version</div>
              <div className="st-sys-cell-value">1.0.0</div>
            </div>
            <div className="st-sys-cell">
              <div className="st-sys-cell-label">Build Date</div>
              <div className="st-sys-cell-value">Feb 2026</div>
            </div>
            <div className="st-sys-cell">
              <div className="st-sys-cell-label">Status</div>
              <div className="st-sys-cell-value ok">Operational</div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="st-section">
            <SecHead title="Moderation Defaults" meta="Admin only" />
            <div className="st-block">
              <SettingRow
                label="Auto-Verify Reports"
                desc="Automatically verify reports that exceed the confidence threshold"
                noBorderTop
              >
                <SqToggle
                  id="sys-autoverify"
                  checked={settings.autoVerify}
                  onChange={(val) => updateApiSetting("autoVerify", val)}
                  disabled={isMutating}
                />
              </SettingRow>
              {settings.autoVerify && (
                <div className="st-slider-area">
                  <div className="st-slider-label">
                    <span>Min. Confidence Threshold</span>
                    <span
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--color-primary)",
                      }}
                    >
                      {settings.minConfidenceScore}%
                    </span>
                  </div>
                  <input
                    type="range"
                    className="st-range"
                    min={0}
                    max={100}
                    value={settings.minConfidenceScore}
                    onChange={(e) =>
                      updateApiSetting(
                        "minConfidenceScore",
                        parseInt(e.target.value, 10),
                      )
                    }
                    disabled={isMutating}
                  />
                  <div className="st-range-row">
                    <span>Conservative (0%)</span>
                    <span>Aggressive (100%)</span>
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
              }}
            >
              <button
                className="st-btn st-btn-primary"
                onClick={() => saveMutation.mutate(settings)}
                disabled={isMutating}
              >
                {IC.check} Save System Settings
              </button>
            </div>
          </div>
        )}

        <div className="st-section">
          <SecHead title="Danger Zone" />
          <div className="st-danger-card">
            <div className="st-danger-row">
              <div style={{ flex: 1 }}>
                <div className="st-danger-title">Reset All Settings</div>
                <div className="st-danger-desc">
                  Restore all dashboard settings to their factory defaults. This
                  cannot be undone.
                </div>
              </div>
              <button
                className="st-btn st-btn-danger"
                onClick={() => setConfirmReset(true)}
                disabled={resetMutation.isPending}
              >
                {IC.refresh} Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const SECTION_RENDERERS = {
    profile: renderProfile,
    notif: renderNotifications,
    appearance: renderAppearance,
    security: renderSecurity,
    system: renderSystem,
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{SETTINGS_CSS}</style>

      <div className="st-container">
        {/* Topbar */}
        <div className="st-topbar">
          <span className="st-topbar-title">Settings</span>
        </div>

        {/* Body */}
        <div className="st-body">
          {/* Section nav */}
          <nav className="st-snav">
            <div className="st-snav-group">
              <span className="st-snav-group-label">Sections</span>
              {NAV.map((item) => (
                <button
                  key={item.id}
                  className={`st-snav-item${activeSection === item.id ? " active" : ""}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="st-scroll">
            {(SECTION_RENDERERS[activeSection] ?? SECTION_RENDERERS.profile)()}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Confirm: Reset Settings */}
      <ConfirmDialog
        visible={confirmReset}
        title="Reset All Settings?"
        message="All dashboard settings will be restored to factory defaults. This includes notification preferences, moderation thresholds, and appearance options."
        confirmLabel="Reset Settings"
        cancelLabel="Cancel"
        confirmDisabled={resetMutation.isPending}
        onConfirm={() => {
          setConfirmReset(false);
          resetMutation.mutate();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}

export default SettingsPage;
