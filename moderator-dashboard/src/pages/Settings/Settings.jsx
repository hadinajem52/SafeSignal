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
import { DEFAULT_SETTINGS } from "./settingsConstants";
import { getInitials, loadLocalPrefs, saveLocalPrefs } from "./settingsUtils";
import { SettingsScaffold, Toast } from "./settingsComponents";
import {
  AppearanceSection,
  NotificationsSection,
  ProfileSection,
  SecuritySection,
  SystemSection,
} from "./settingsSections";

function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState("profile");
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

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

  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username ?? "");
  const [emailInput, setEmailInput] = useState(user?.email ?? "");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (user?.username) setDisplayName(user.username);
    if (user?.email) setEmailInput(user.email);
  }, [user]);

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

  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

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

  function updateApiSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function persistLocalPref(key, value) {
    const p = loadLocalPrefs();
    p[key] = value;
    saveLocalPrefs(p);
  }

  function toggleSeverity(key) {
    setAlertSeverities((prev) => {
      const has = prev.includes(key);
      const next = has ? prev.filter((k) => k !== key) : [...prev, key];
      persistLocalPref("alertSeverities", next);
      return next;
    });
  }

  function toggleDay(dayIndex) {
    setDigestDays((prev) => {
      const has = prev.includes(dayIndex);
      const next = has
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b);
      persistLocalPref("digestDays", next);
      return next;
    });
  }

  function handleDarkModeChange(val) {
    applyDarkMode(val);
    persistDarkMode(val);
    setSettings((prev) => ({ ...prev, darkMode: val }));
    darkModeMutation.mutate(val);
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
  }

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

  const sectionContentMap = {
    profile: (
      <ProfileSection
        user={user}
        displayName={displayName}
        emailInput={emailInput}
        editingProfile={editingProfile}
        setEditingProfile={setEditingProfile}
        setDisplayName={setDisplayName}
        setEmailInput={setEmailInput}
        memberSince={memberSince}
        language={language}
        setLanguage={setLanguage}
        timezone={timezone}
        setTimezone={setTimezone}
        dateFormat={dateFormat}
        setDateFormat={setDateFormat}
        persistLocalPref={persistLocalPref}
        showToast={showToast}
        initials={getInitials(displayName || user?.username || "")}
      />
    ),
    notif: (
      <NotificationsSection
        settings={settings}
        isMutating={isMutating}
        updateApiSetting={updateApiSetting}
        showToast={showToast}
        saveMutation={saveMutation}
        alertSeverities={alertSeverities}
        toggleSeverity={toggleSeverity}
        digestFreq={digestFreq}
        setDigestFreq={setDigestFreq}
        persistLocalPref={persistLocalPref}
        digestDays={digestDays}
        toggleDay={toggleDay}
        setSettings={setSettings}
        digestMutation={digestMutation}
      />
    ),
    appearance: (
      <AppearanceSection
        settings={settings}
        darkModeMutation={darkModeMutation}
        handleDarkModeChange={handleDarkModeChange}
        density={density}
        setDensity={setDensity}
        dateFormat={dateFormat}
        setDateFormat={setDateFormat}
        timezone={timezone}
        setTimezone={setTimezone}
        persistLocalPref={persistLocalPref}
        showToast={showToast}
        isMutating={isMutating}
      />
    ),
    security: (
      <SecuritySection
        showPw={showPw}
        setShowPw={setShowPw}
        currentPw={currentPw}
        setCurrentPw={setCurrentPw}
        newPw={newPw}
        setNewPw={setNewPw}
        confirmPw={confirmPw}
        setConfirmPw={setConfirmPw}
        handleChangePassword={handleChangePassword}
        twoFaEnabled={twoFaEnabled}
        setTwoFaEnabled={setTwoFaEnabled}
        showToast={showToast}
      />
    ),
    system: (
      <SystemSection
        isAdmin={isAdmin}
        settings={settings}
        isMutating={isMutating}
        updateApiSetting={updateApiSetting}
        saveMutation={saveMutation}
        setConfirmReset={setConfirmReset}
        resetMutation={resetMutation}
      />
    ),
  };

  return (
    <>
      <style>{SETTINGS_CSS}</style>
      <SettingsScaffold
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        sectionContent={
          sectionContentMap[activeSection] ?? sectionContentMap.profile
        }
      />

      {toast && <Toast message={toast.message} type={toast.type} />}

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
