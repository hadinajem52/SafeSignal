import React from "react";
import { NAV, IC } from "./settingsConstants";

export function SqToggle({ checked, onChange, disabled, id }) {
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

export function SettingRow({ label, desc, children, noBorderTop }) {
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

export function SecHead({ title, meta }) {
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

export function Toast({ message, type = "success" }) {
  return (
    <div
      className={`st-toast${type === "error" ? " error" : type === "warn" ? " warn" : ""}`}
    >
      {type === "success" ? IC.check : IC.warn}
      {message}
    </div>
  );
}

export function SettingsScaffold({ activeSection, onSectionChange, sectionContent }) {
  return (
    <div className="st-container">
      <div className="st-topbar">
        <span className="st-topbar-title">Settings</span>
      </div>

      <div className="st-body">
        <nav className="st-snav">
          <div className="st-snav-group">
            <span className="st-snav-group-label">Sections</span>
            {NAV.map((item) => (
              <button
                key={item.id}
                className={`st-snav-item${activeSection === item.id ? " active" : ""}`}
                onClick={() => onSectionChange(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="st-scroll">{sectionContent}</div>
      </div>
    </div>
  );
}
