import React from "react";
import { formatDate } from "../../utils/dateUtils";
import {
  accuracyColor,
  buildTimeline,
  calcAccuracy,
  getInitials,
  isLowSignal,
  roleChipClass,
  roleLabel,
} from "./usersHelpers";
import {
  IconCheck,
  IconMail,
  IconSearch,
  IconUp,
  IconUsers,
  IconWarn,
} from "./usersIcons";

function SignalBars({ accuracy, total }) {
  const count = Math.min(Math.max(total, 1), 8);
  return (
    <div className="u-signal-bars">
      {Array.from({ length: count }, (_, i) => {
        const threshold = count === 1 ? 0 : (i / (count - 1)) * 100;
        const filled = threshold <= accuracy;
        return (
          <div
            key={i}
            className="u-signal-bar"
            style={{
              height: `${30 + (i / count) * 70}%`,
              background: filled ? accuracyColor(accuracy) : "var(--color-border)",
              opacity: filled ? 0.85 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

function AlertDialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  onConfirm,
  confirmVariant = "blue",
  confirmDisabled = false,
}) {
  if (!open) return null;
  return (
    <div
      className="u-dialog-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="u-dialog">
        <div className="u-dialog-hdr">
          <div className="u-dialog-title">{title}</div>
          <div className="u-dialog-desc">{description}</div>
        </div>
        {children && <div className="u-dialog-body">{children}</div>}
        <div className="u-dialog-foot">
          <button className="u-dialog-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`u-dialog-confirm ${confirmVariant}`}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersView({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  filtered,
  isLoading,
  isError,
  error,
  refetch,
  selectedId,
  onSelectUser,
  selected,
  kpis,
  isAdmin,
  onOpenPromote,
  onOpenSuspend,
  suspendDialog,
  onCloseSuspend,
  promoteDialog,
  onClosePromote,
  actionError,
  suspendMutation,
  unsuspendMutation,
  roleMutation,
  promoteRole,
  onPromoteRoleChange,
  onConfirmSuspend,
  onConfirmPromote,
}) {
  return (
    <>
      <div className="u-wrap">
        <div className="u-topbar">
          <div className="u-topbar-title">Users Management</div>
          <button className="u-invite-btn">
            <IconMail /> Invite User
          </button>
        </div>

        <div className="u-kpi">
          <div className="u-kpi-cell ab-blue">
            <div className="u-kpi-label">Total Users</div>
            <div className="u-kpi-value">{kpis.total}</div>
          </div>
          <div className="u-kpi-cell ab-green">
            <div className="u-kpi-label">Active</div>
            <div className="u-kpi-value">{kpis.active}</div>
          </div>
          <div className="u-kpi-cell ab-red">
            <div className="u-kpi-label">Suspended</div>
            <div className="u-kpi-value">{kpis.suspended}</div>
          </div>
          <div className="u-kpi-cell ab-amber">
            <div className="u-kpi-label">Staff / Mods</div>
            <div className="u-kpi-value">{kpis.mods}</div>
          </div>
          <div className="u-kpi-cell ab-red">
            <div className="u-kpi-label">Low Signal ⚠</div>
            <div className="u-kpi-value">{kpis.lowSignal}</div>
          </div>
        </div>

        <div className="u-toolbar">
          <div className="u-search">
            <IconSearch />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <select className="u-select" value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="citizen">Citizen</option>
            <option value="moderator">Moderator</option>
            <option value="law_enforcement">Law Enforcement</option>
            <option value="admin">Admin</option>
          </select>
          {["all", "active", "suspended"].map((s) => (
            <button
              key={s}
              className={`u-filter-btn ${statusFilter === s ? "active" : ""}`}
              onClick={() => onStatusFilterChange(s)}
            >
              {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="u-count">{filtered.length} users</div>
        </div>

        <div className="u-panels">
          <div className="u-list-panel">
            <div className="u-list-header">
              <div className="u-col-lbl">User</div>
              <div className="u-col-lbl">Role</div>
              <div className="u-col-lbl">Status</div>
              <div className="u-col-lbl" style={{ textAlign: "right" }}>
                Reports
              </div>
            </div>
            <div className="u-list">
              {isLoading && <div className="u-loading">Loading users…</div>}
              {isError && (
                <div className="u-loading" style={{ flexDirection: "column", gap: 12 }}>
                  <span style={{ color: "var(--color-error)" }}>{error?.message || "Failed to load users"}</span>
                  <button className="u-act-btn" onClick={() => refetch()}>
                    Retry
                  </button>
                </div>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <div className="u-loading">No users found</div>
              )}
              {!isLoading &&
                !isError &&
                filtered.map((u) => {
                  const accuracy = calcAccuracy(u.verifiedReports, u.totalReports);
                  const borderColor =
                    u.totalReports === 0 ? "var(--color-border)" : accuracyColor(accuracy);
                  return (
                    <div
                      key={u.id}
                      className={`u-row ${selectedId === u.id ? "sel" : ""} ${u.isSuspended ? "susp" : ""}`}
                      onClick={() => onSelectUser(u.id)}
                    >
                      <div className="u-user-info">
                        <div className="u-avatar" style={{ borderColor }}>
                          {getInitials(u.name)}
                        </div>
                        <div className="u-name-block">
                          <div className="u-name">{u.name}</div>
                          <div className="u-email">{u.email}</div>
                        </div>
                      </div>
                      <div>
                        <span className={`u-role-chip ${roleChipClass(u.role)}`}>{roleLabel(u.role)}</span>
                      </div>
                      <div>
                        <span className={`u-status-chip ${u.isSuspended ? "suspended" : "active"}`}>
                          {u.isSuspended ? "Suspended" : "Active"}
                        </span>
                      </div>
                      <div>
                        <div className="u-rep-count">{u.totalReports}</div>
                        <div className="u-rep-verif">{u.verifiedReports}✓</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {selected ? (
            (() => {
              const accuracy = calcAccuracy(selected.verifiedReports, selected.totalReports);
              const avatarColor =
                selected.totalReports === 0 ? "var(--color-text-muted)" : accuracyColor(accuracy);
              const timeline = buildTimeline(selected);
              const lowSignal = isLowSignal(selected);
              return (
                <div className="u-detail">
                  <div className="u-detail-bar">
                    <div className="u-detail-name">{selected.name}</div>
                    {isAdmin && (
                      <button className="u-act-btn promote" onClick={onOpenPromote}>
                        <IconUp /> Promote
                      </button>
                    )}
                    {isAdmin &&
                      (selected.isSuspended ? (
                        <button
                          className="u-act-btn restore"
                          disabled={unsuspendMutation.isPending}
                          onClick={() => unsuspendMutation.mutate(selected.id)}
                        >
                          <IconCheck /> {unsuspendMutation.isPending ? "Restoring…" : "Restore"}
                        </button>
                      ) : (
                        <button className="u-act-btn suspend" onClick={onOpenSuspend}>
                          <IconWarn /> Suspend
                        </button>
                      ))}
                  </div>

                  <div className="u-detail-scroll">
                    {actionError && <div className="u-err">{actionError}</div>}

                    <div className="u-profile">
                      <div className="u-profile-avatar" style={{ borderColor: avatarColor, color: avatarColor }}>
                        {getInitials(selected.name)}
                      </div>
                      <div>
                        <div className="u-profile-name">{selected.name}</div>
                        <div className="u-profile-email">{selected.email}</div>
                        <div className="u-profile-chips">
                          <span className={`u-role-chip ${roleChipClass(selected.role)}`}>
                            {roleLabel(selected.role)}
                          </span>
                          <span className={`u-status-chip ${selected.isSuspended ? "suspended" : "active"}`}>
                            {selected.isSuspended ? "Suspended" : "Active"}
                          </span>
                          {lowSignal && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                padding: "2px 6px",
                                border: "1px solid var(--color-error)",
                                color: "var(--color-error)",
                                background: "rgba(255,51,51,0.08)",
                              }}
                            >
                              ⚠ Low Signal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="u-sec-row">
                      <div className="u-sec-title">Account Details</div>
                      <div className="u-sec-line" />
                    </div>
                    <div className="u-meta-grid">
                      <div className="u-meta-cell">
                        <div className="u-meta-lbl">Joined</div>
                        <div className="u-meta-val">{formatDate(selected.joinedDate)}</div>
                      </div>
                      <div className="u-meta-cell">
                        <div className="u-meta-lbl">Role</div>
                        <div className="u-meta-val" style={{ textTransform: "capitalize" }}>
                          {selected.role.replace("_", " ")}
                        </div>
                      </div>
                      <div className="u-meta-cell">
                        <div className="u-meta-lbl">Total Reports</div>
                        <div className="u-meta-val">{selected.totalReports}</div>
                      </div>
                      <div className="u-meta-cell">
                        <div className="u-meta-lbl">Verified Reports</div>
                        <div className="u-meta-val" style={{ color: "var(--color-success)" }}>
                          {selected.verifiedReports}
                        </div>
                      </div>
                    </div>

                    <div className="u-sec-row">
                      <div className="u-sec-title">Signal Quality</div>
                      <div className="u-sec-line" />
                    </div>
                    <div className="u-signal">
                      <div className="u-signal-hdr">
                        <div>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "var(--color-text-muted)",
                              marginBottom: 4,
                            }}
                          >
                            Report Accuracy
                          </div>
                          <div className="u-signal-pct" style={{ color: accuracyColor(accuracy) }}>
                            {accuracy}%
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "var(--color-text-muted)",
                              marginBottom: 4,
                            }}
                          >
                            Verified / Total
                          </div>
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 800,
                              color: "var(--color-text)",
                              fontVariantNumeric: "tabular-nums",
                              lineHeight: 1,
                            }}
                          >
                            {selected.verifiedReports}
                            <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                              /{selected.totalReports}
                            </span>
                          </div>
                        </div>
                      </div>
                      <SignalBars accuracy={accuracy} total={selected.totalReports} />
                      {lowSignal && (
                        <div className="u-signal-warn">
                          <IconWarn />
                          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-error)" }}>
                            0% accuracy with {selected.totalReports} submissions — consider suspending to
                            prevent queue noise.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="u-sec-row">
                      <div className="u-sec-title">Account Activity</div>
                      <div className="u-sec-line" />
                    </div>
                    <div className="u-tl">
                      {timeline.map((ev, i) => (
                        <div key={i} className="u-tl-entry">
                          <div className="u-tl-dot-col">
                            <div className="u-tl-dot" style={{ background: ev.color, borderColor: ev.color }} />
                            {i < timeline.length - 1 && <div className="u-tl-line" />}
                          </div>
                          <div style={{ flex: 1, paddingBottom: 4 }}>
                            <div className="u-tl-text">{ev.text}</div>
                            {ev.meta && <div className="u-tl-meta">{ev.meta}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="u-detail">
              <div className="u-empty">
                <IconUsers />
                Select a user to view details
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <AlertDialog
          open={suspendDialog}
          onClose={onCloseSuspend}
          title="Suspend Account"
          description={`Suspend ${selected.name}? They will lose access immediately and all pending reports will be flagged for manual review. This action is logged.`}
          confirmLabel={suspendMutation.isPending ? "Suspending…" : "Confirm Suspend"}
          confirmVariant="red"
          confirmDisabled={suspendMutation.isPending}
          onConfirm={onConfirmSuspend}
        />
      )}

      {selected && (
        <AlertDialog
          open={promoteDialog}
          onClose={onClosePromote}
          title="Change Role"
          description={`Change role for ${selected.name}. This grants or revokes elevated permissions.`}
          confirmLabel={roleMutation.isPending ? "Saving…" : "Confirm"}
          confirmVariant="blue"
          confirmDisabled={roleMutation.isPending || promoteRole === selected.role}
          onConfirm={onConfirmPromote}
        >
          <div className="u-dialog-select-lbl">New Role</div>
          <select
            className="u-dialog-select"
            value={promoteRole}
            onChange={(e) => onPromoteRoleChange(e.target.value)}
          >
            <option value="moderator">Moderator</option>
            <option value="law_enforcement">Law Enforcement</option>
            <option value="admin">Admin</option>
            <option value="citizen">Citizen (demote)</option>
          </select>
        </AlertDialog>
      )}
    </>
  );
}
