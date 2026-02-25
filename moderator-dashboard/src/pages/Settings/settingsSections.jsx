import React from "react";
import { DAYS, IC, SEVERITIES } from "./settingsConstants";
import { SecHead, SettingRow, SqToggle } from "./settingsComponents";

export function ProfileSection({
  user,
  displayName,
  emailInput,
  editingProfile,
  setEditingProfile,
  setDisplayName,
  setEmailInput,
  memberSince,
  language,
  setLanguage,
  timezone,
  setTimezone,
  dateFormat,
  setDateFormat,
  persistLocalPref,
  showToast,
  initials,
}) {
  return (
    <>
      <div className="st-section">
        <SecHead title="Profile" />
        <div className="st-profile-card">
          <div className="st-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="st-profile-name">{displayName || user?.username || "Unknown"}</div>
            <div className="st-profile-role">{user?.role ?? "moderator"}</div>
            <div className="st-profile-email">{user?.email ?? ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
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
              <button className="st-btn st-btn-ghost" onClick={() => setEditingProfile(true)}>
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="st-block">
          <SettingRow label="Display Name" desc="Shown in audit logs and team views" noBorderTop>
            {editingProfile ? (
              <input
                className="st-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{ minWidth: 200 }}
              />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                {displayName || user?.username}
              </span>
            )}
          </SettingRow>
          <SettingRow label="Email Address" desc="Used for notifications and login">
            {editingProfile ? (
              <input
                className="st-input"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ minWidth: 220 }}
              />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)" }}>
                {user?.email}
              </span>
            )}
          </SettingRow>
          <SettingRow label="Account Role" desc="Assigned by admin — contact admin to change">
            <span className="st-role-badge">{user?.role ?? "moderator"}</span>
          </SettingRow>
          <SettingRow label="Member Since" desc="Account creation date">
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)" }}>
              {memberSince}
            </span>
          </SettingRow>
        </div>
      </div>

      <div className="st-section">
        <SecHead title="Preferences" />
        <div className="st-block">
          <SettingRow label="Language" desc="Interface display language" noBorderTop>
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
          <SettingRow label="Timezone" desc="Used for timestamps throughout the dashboard">
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
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="Europe/London">Europe/London (GMT+1)</option>
              <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
            </select>
          </SettingRow>
          <SettingRow label="Date Format" desc="Applied to all timestamps and exports">
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

export function NotificationsSection({
  settings,
  isMutating,
  updateApiSetting,
  showToast,
  saveMutation,
  alertSeverities,
  toggleSeverity,
  digestFreq,
  setDigestFreq,
  persistLocalPref,
  digestDays,
  toggleDay,
  setSettings,
  digestMutation,
}) {
  return (
    <>
      <div className="st-section">
        <SecHead title="Channels" />
        <div className="st-block">
          <SettingRow label="Email Notifications" desc="Receive email notifications for report updates" noBorderTop>
            <SqToggle
              id="notif-email"
              checked={settings.emailNotifications}
              onChange={(val) => updateApiSetting("emailNotifications", val)}
              disabled={isMutating}
            />
          </SettingRow>
          <SettingRow label="Report Alerts" desc="Get notified immediately for high-severity reports">
            <SqToggle
              id="notif-alerts"
              checked={settings.reportAlerts}
              onChange={(val) => updateApiSetting("reportAlerts", val)}
              disabled={isMutating}
            />
          </SettingRow>
          <SettingRow label="Browser Notifications" desc="Push notifications in supported browsers">
            <SqToggle
              id="notif-browser"
              checked={false}
              onChange={() => showToast("Browser notifications not yet supported.", "warn")}
            />
          </SettingRow>
          <SettingRow label="Sound Alerts" desc="Play a sound for critical incident notifications">
            <SqToggle
              id="notif-sound"
              checked={false}
              onChange={() => showToast("Sound alerts not yet supported.", "warn")}
            />
          </SettingRow>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
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
                  <div className="st-sev-dot" style={{ background: s.color, opacity: active ? 1 : 0.25 }} />
                  {active && <span style={{ color: s.color }}>{IC.check}</span>}
                </div>
                <div className="st-sev-name" style={{ color: active ? s.color : "var(--color-text-muted)" }}>
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
          <SettingRow label="Frequency" desc="How often to receive the digest">
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
                  <div key={d} className="st-day-item" onClick={() => toggleDay(i)}>
                    <span className="st-day-label">{d}</span>
                    <div className={`st-day-box ${on ? "on" : "off"}`}>
                      {on ? IC.check : <span style={{ fontSize: 10 }}>—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {settings.weeklyDigest && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              className="st-btn st-btn-ghost"
              onClick={() => digestMutation.mutate()}
              disabled={digestMutation.isPending}
            >
              {IC.send} {digestMutation.isPending ? "Sending…" : "Send Digest Now"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function AppearanceSection({
  settings,
  darkModeMutation,
  handleDarkModeChange,
  density,
  setDensity,
  dateFormat,
  setDateFormat,
  timezone,
  setTimezone,
  persistLocalPref,
  showToast,
  isMutating,
}) {
  return (
    <>
      <div className="st-section">
        <SecHead title="Theme" />
        <div className="st-block">
          <SettingRow label="Dark Mode" desc="Use a dark interface theme across the dashboard" noBorderTop>
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
          <SettingRow label="Density" desc="Control spacing and row height in tables and lists" noBorderTop>
            <select className="st-select" value={density} onChange={(e) => setDensity(e.target.value)}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </SettingRow>
          <SettingRow label="Date Format" desc="Applied to all timestamps and exports">
            <select className="st-select" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </SettingRow>
          <SettingRow label="Timezone" desc="Used for timestamps throughout the dashboard">
            <select className="st-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="Asia/Beirut">Asia/Beirut (GMT+3)</option>
              <option value="UTC">UTC (GMT+0)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="Europe/London">Europe/London (GMT+1)</option>
              <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
            </select>
          </SettingRow>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
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

export function SecuritySection({
  showPw,
  setShowPw,
  currentPw,
  setCurrentPw,
  newPw,
  setNewPw,
  confirmPw,
  setConfirmPw,
  handleChangePassword,
  twoFaEnabled,
  setTwoFaEnabled,
  showToast,
}) {
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
            <button className="st-btn st-btn-primary" onClick={handleChangePassword}>
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
                showToast("Two-factor authentication is not available in this build.", "warn");
                setTwoFaEnabled(false);
              }}
            />
          </SettingRow>
        </div>
      </div>
    </>
  );
}

export function SystemSection({
  isAdmin,
  settings,
  isMutating,
  updateApiSetting,
  saveMutation,
  setConfirmReset,
  resetMutation,
}) {
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
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--color-primary)" }}>
                    {settings.minConfidenceScore}%
                  </span>
                </div>
                <input
                  type="range"
                  className="st-range"
                  min={0}
                  max={100}
                  value={settings.minConfidenceScore}
                  onChange={(e) => updateApiSetting("minConfidenceScore", parseInt(e.target.value, 10))}
                  disabled={isMutating}
                />
                <div className="st-range-row">
                  <span>Conservative (0%)</span>
                  <span>Aggressive (100%)</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button className="st-btn st-btn-primary" onClick={() => saveMutation.mutate(settings)} disabled={isMutating}>
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
                Restore all dashboard settings to their factory defaults. This cannot be undone.
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
