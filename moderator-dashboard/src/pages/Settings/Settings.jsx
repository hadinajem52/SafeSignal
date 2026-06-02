import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LoadingState from "../../components/LoadingState";
import { useAuth } from "../../context/AuthContext";
import { authAPI, settingsAPI } from "../../services/api";
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
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState("profile");
  const [toast, setToast] = useState(null);
  const [digestNotice, setDigestNotice] = useState(null);
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
  const [profilePreferenceDraft, setProfilePreferenceDraft] = useState({
    language: localPrefs.language ?? "en",
    timezone: localPrefs.timezone ?? "Asia/Beirut",
    dateFormat: localPrefs.dateFormat ?? "MM/DD/YYYY",
  });

  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username ?? "");
  const [emailAddress, setEmailAddress] = useState(user?.email ?? "");
  const [profileDraftName, setProfileDraftName] = useState(user?.username ?? "");
  const [profileDraftEmail, setProfileDraftEmail] = useState(user?.email ?? "");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const nextName = user?.username ?? "";
    const nextEmail = user?.email ?? "";

    setDisplayName(nextName);
    setEmailAddress(nextEmail);
    setProfileDraftName(nextName);
    setProfileDraftEmail(nextEmail);
  }, [user]);

  function startProfileEdit() {
    setProfileDraftName(displayName);
    setProfileDraftEmail(emailAddress);
    setEditingProfile(true);
  }

  function saveProfileDraft() {
    const username = profileDraftName.trim();
    const email = profileDraftEmail.trim();

    if (!username || !email) {
      showToast("Display name and email are required.", "warn");
      return;
    }

    profileMutation.mutate({ username, email });
  }

  useEffect(() => {
    setProfilePreferenceDraft({ language, timezone, dateFormat });
  }, [language, timezone, dateFormat]);

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

  const profileMutation = useMutation({
    mutationFn: async (profile) => {
      const result = await authAPI.updateProfile(profile);
      if (result.success) return result.data?.user;
      throw new Error(result.error);
    },
    onSuccess: (updatedUser) => {
      if (!updatedUser) {
        showToast("Invalid profile response.", "error");
        return;
      }

      updateUser(updatedUser);
      setDisplayName(updatedUser.username ?? "");
      setEmailAddress(updatedUser.email ?? "");
      setProfileDraftName(updatedUser.username ?? "");
      setProfileDraftEmail(updatedUser.email ?? "");
      setEditingProfile(false);
      showToast("Profile updated.");
    },
    onError: (err) =>
      showToast(err.message || "Failed to update profile.", "error"),
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const result = await authAPI.changePassword({
        currentPassword,
        newPassword,
      });
      if (result.success) return result.data;
      throw new Error(result.error);
    },
    onSuccess: () => {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      showToast("Password updated.");
    },
    onError: (err) =>
      showToast(err.message || "Failed to update password.", "error"),
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
    onMutate: () => setDigestNotice(null),
    onSuccess: (data) => {
      const reportCount = data?.summary?.total_reports ?? 0;
      setDigestNotice(`Digest sent successfully. ${reportCount} reports included.`);
      showToast(`Digest sent. ${reportCount} reports.`);
    },
    onError: (err) => {
      setDigestNotice(null);
      showToast(err.message || "Failed to send digest.", "error");
    },
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
    darkModeMutation.isPending ||
    profileMutation.isPending ||
    passwordMutation.isPending;

  async function updateApiSetting(key, value) {
    if (key === "browserNotifications" && value) {
      if (!("Notification" in window)) {
        showToast("Browser notifications are not supported.", "warn");
        return;
      }

      if (Notification.permission === "denied") {
        showToast("Browser notifications are blocked by the browser.", "warn");
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          showToast("Browser notification permission was not granted.", "warn");
          return;
        }
      }
    }

    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function persistLocalPref(key, value) {
    const p = loadLocalPrefs();
    p[key] = value;
    saveLocalPrefs(p);
  }

  function updateProfilePreferenceDraft(key, value) {
    setProfilePreferenceDraft((prev) => ({ ...prev, [key]: value }));
  }

  function saveProfilePreferences() {
    setLanguage(profilePreferenceDraft.language);
    setTimezone(profilePreferenceDraft.timezone);
    setDateFormat(profilePreferenceDraft.dateFormat);
    persistLocalPref("language", profilePreferenceDraft.language);
    persistLocalPref("timezone", profilePreferenceDraft.timezone);
    persistLocalPref("dateFormat", profilePreferenceDraft.dateFormat);
    showToast("Preferences saved.");
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
    passwordMutation.mutate({
      currentPassword: currentPw,
      newPassword: newPw,
    });
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

  const hasUnsavedProfilePreferences =
    profilePreferenceDraft.language !== language ||
    profilePreferenceDraft.timezone !== timezone ||
    profilePreferenceDraft.dateFormat !== dateFormat;

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
        emailAddress={emailAddress}
        profileDraftName={profileDraftName}
        profileDraftEmail={profileDraftEmail}
        editingProfile={editingProfile}
        startProfileEdit={startProfileEdit}
        saveProfileDraft={saveProfileDraft}
        profileSaving={profileMutation.isPending}
        setProfileDraftName={setProfileDraftName}
        setProfileDraftEmail={setProfileDraftEmail}
        memberSince={memberSince}
        preferenceDraft={profilePreferenceDraft}
        hasUnsavedPreferences={hasUnsavedProfilePreferences}
        updatePreferenceDraft={updateProfilePreferenceDraft}
        saveProfilePreferences={saveProfilePreferences}
        initials={getInitials(displayName || user?.username || "")}
      />
    ),
    notif: (
      <NotificationsSection
        settings={settings}
        isMutating={isMutating}
        updateApiSetting={updateApiSetting}
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
        digestNotice={digestNotice}
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
        passwordSaving={passwordMutation.isPending}
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
