export const USERS_CSS = `
  .u-wrap { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; background: var(--color-bg); }

  /* KPI BAR */
  .u-kpi { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: var(--color-border); border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
  .u-kpi-cell { background: var(--color-card); padding: 10px 18px; position: relative; }
  .u-kpi-cell::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; }
  .u-kpi-cell.ab-blue::before  { background: var(--color-primary); }
  .u-kpi-cell.ab-green::before { background: var(--color-success); }
  .u-kpi-cell.ab-red::before   { background: var(--color-error); }
  .u-kpi-cell.ab-amber::before { background: var(--color-warning); }
  .u-kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 4px; }
  .u-kpi-value { font-size: 22px; font-weight: 800; color: var(--color-text); line-height: 1; font-variant-numeric: tabular-nums; }

  /* TOPBAR */
  .u-topbar { border-bottom: 1px solid var(--color-border); padding: 0 24px; display: flex; align-items: center; background: var(--color-card); flex-shrink: 0; height: 52px; gap: 14px; }
  .u-topbar-title { font-weight: 800; font-size: 17px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--color-text); flex: 1; }
  .u-invite-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--color-primary); background: rgba(0,240,255,0.06); color: var(--color-primary); cursor: pointer; }
  .u-invite-btn:hover { background: rgba(0,240,255,0.12); }

  /* TOOLBAR */
  .u-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-bottom: 1px solid var(--color-border); background: var(--color-card); flex-shrink: 0; flex-wrap: wrap; }
  .u-search { background: var(--color-surface); border: 1px solid var(--color-border); display: flex; align-items: center; gap: 8px; padding: 7px 12px; flex: 1; min-width: 180px; max-width: 340px; }
  .u-search input { background: none; border: none; outline: none; color: var(--color-text); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 500; flex: 1; }
  .u-search input::placeholder { color: var(--color-text-muted); }
  .u-search svg { color: var(--color-text-muted); flex-shrink: 0; }
  .u-select { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600; padding: 7px 10px; outline: none; cursor: pointer; appearance: none; }
  .u-filter-btn { display: flex; align-items: center; gap: 5px; padding: 6px 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--color-border); background: none; color: var(--color-text-muted); cursor: pointer; transition: all 0.1s; }
  .u-filter-btn:hover { color: var(--color-text); border-color: var(--color-text-muted); }
  .u-filter-btn.active { background: rgba(0,240,255,0.06); border-color: var(--color-primary); color: var(--color-primary); }
  .u-count { font-size: 11px; font-weight: 600; color: var(--color-text-muted); font-variant-numeric: tabular-nums; margin-left: auto; white-space: nowrap; }

  /* PANELS */
  .u-panels { display: grid; grid-template-columns: 420px 1fr; flex: 1; overflow: hidden; min-height: 0; }

  /* LIST */
  .u-list-panel { border-right: 1px solid var(--color-border); display: flex; flex-direction: column; overflow: hidden; }
  .u-list-header { display: grid; grid-template-columns: 1fr 72px 80px 64px; padding: 8px 16px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
  .u-col-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--color-text-muted); }
  .u-list { flex: 1; overflow-y: auto; }
  .u-list::-webkit-scrollbar { width: 3px; }
  .u-list::-webkit-scrollbar-thumb { background: var(--color-border); }
  .u-row { display: grid; grid-template-columns: 1fr 72px 80px 64px; padding: 11px 16px; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 0.1s; align-items: center; }
  .u-row:hover { background: var(--color-surface); }
  .u-row.sel { background: rgba(0,240,255,0.04); border-left: 2px solid var(--color-primary); padding-left: 14px; }
  .u-row.susp { opacity: 0.55; }

  .u-avatar { width: 28px; height: 28px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--color-text-muted); background: var(--color-surface); flex-shrink: 0; text-transform: uppercase; }
  .u-user-info { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .u-name-block { min-width: 0; }
  .u-name { font-size: 12px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .u-email { font-size: 10px; font-weight: 500; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }

  .u-role-chip { font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 6px; border: 1px solid var(--color-border); color: var(--color-text-muted); }
  .u-role-chip.moderator { border-color: var(--color-primary); color: var(--color-primary); }
  .u-role-chip.admin     { border-color: var(--color-warning); color: var(--color-warning); }
  .u-role-chip.le        { border-color: var(--color-success); color: var(--color-success); }

  .u-status-chip { font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 6px; border: 1px solid; display: inline-flex; align-items: center; }
  .u-status-chip.active    { border-color: var(--color-success); color: var(--color-success); background: rgba(0,240,255,0.06); }
  .u-status-chip.suspended { border-color: var(--color-error); color: var(--color-error); background: rgba(255,51,51,0.06); }

  .u-rep-count { font-size: 12px; font-weight: 700; color: var(--color-text); font-variant-numeric: tabular-nums; text-align: right; }
  .u-rep-verif { font-size: 9px; font-weight: 600; color: var(--color-text-muted); font-variant-numeric: tabular-nums; margin-top: 1px; text-align: right; }

  /* DETAIL */
  .u-detail { display: flex; flex-direction: column; overflow: hidden; background: var(--color-bg); }
  .u-detail-bar { display: flex; align-items: center; gap: 10px; padding: 0 20px; height: 52px; border-bottom: 1px solid var(--color-border); background: var(--color-card); flex-shrink: 0; }
  .u-detail-name { font-weight: 800; font-size: 14px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--color-text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .u-act-btn { display: flex; align-items: center; gap: 5px; padding: 5px 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--color-border); background: none; color: var(--color-text-muted); cursor: pointer; transition: all 0.1s; white-space: nowrap; }
  .u-act-btn:hover { color: var(--color-text); border-color: var(--color-text-muted); }
  .u-act-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .u-act-btn.promote:hover { border-color: var(--color-primary); color: var(--color-primary); }
  .u-act-btn.suspend:hover { border-color: var(--color-error); color: var(--color-error); }
  .u-act-btn.restore:hover { border-color: var(--color-success); color: var(--color-success); }

  .u-detail-scroll { flex: 1; overflow-y: auto; padding: 20px; }
  .u-detail-scroll::-webkit-scrollbar { width: 3px; }
  .u-detail-scroll::-webkit-scrollbar-thumb { background: var(--color-border); }

  /* SECTION DIVIDER */
  .u-sec-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; margin-top: 4px; }
  .u-sec-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); white-space: nowrap; }
  .u-sec-line { flex: 1; height: 1px; background: var(--color-border); }

  /* PROFILE BLOCK */
  .u-profile { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--color-surface); border: 1px solid var(--color-border); margin-bottom: 20px; }
  .u-profile-avatar { width: 48px; height: 48px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; background: var(--color-card); flex-shrink: 0; text-transform: uppercase; }
  .u-profile-name { font-size: 17px; font-weight: 800; letter-spacing: 0.01em; color: var(--color-text); line-height: 1.15; }
  .u-profile-email { font-size: 11px; font-weight: 500; color: var(--color-text-muted); margin-top: 3px; }
  .u-profile-chips { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }

  /* META GRID */
  .u-meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--color-border); margin-bottom: 20px; }
  .u-meta-cell { padding: 11px 14px; border-right: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
  .u-meta-cell:nth-child(even) { border-right: none; }
  .u-meta-cell:nth-last-child(-n+2) { border-bottom: none; }
  .u-meta-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin-bottom: 4px; }
  .u-meta-val { font-size: 13px; font-weight: 600; color: var(--color-text); font-variant-numeric: tabular-nums; }

  /* SIGNAL */
  .u-signal { border: 1px solid var(--color-border); margin-bottom: 20px; }
  .u-signal-hdr { padding: 10px 14px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; }
  .u-signal-pct { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
  .u-signal-bars { display: flex; gap: 3px; padding: 14px; align-items: flex-end; height: 72px; }
  .u-signal-bar { flex: 1; }
  .u-signal-warn { padding: 10px 14px; border-top: 1px solid var(--color-border); background: rgba(255,51,51,0.04); display: flex; gap: 6px; align-items: center; }

  /* TIMELINE */
  .u-tl { background: var(--color-card); border: 1px solid var(--color-border); padding: 0 14px; margin-bottom: 20px; }
  .u-tl-entry { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
  .u-tl-entry:last-child { border-bottom: none; }
  .u-tl-dot-col { display: flex; flex-direction: column; align-items: center; padding-top: 2px; }
  .u-tl-dot { width: 7px; height: 7px; border-radius: 50%; border: 1.5px solid; flex-shrink: 0; }
  .u-tl-line { width: 1px; flex: 1; background: var(--color-border); margin-top: 3px; min-height: 10px; }
  .u-tl-text { font-size: 11px; font-weight: 600; color: var(--color-text); }
  .u-tl-meta { font-size: 10px; font-weight: 500; color: var(--color-text-muted); margin-top: 1px; font-variant-numeric: tabular-nums; }

  /* EMPTY */
  .u-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; color: var(--color-text-muted); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }

  /* ALERT DIALOG OVERLAY */
  .u-dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50; }
  .u-dialog { background: var(--color-card); border: 1px solid var(--color-border); width: 100%; max-width: 420px; }
  .u-dialog-hdr { padding: 20px 20px 0; }
  .u-dialog-title { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.01em; color: var(--color-text); margin-bottom: 8px; }
  .u-dialog-desc { font-size: 13px; color: var(--color-text-muted); line-height: 1.6; }
  .u-dialog-body { padding: 16px 20px; }
  .u-dialog-select-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 6px; }
  .u-dialog-select { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600; padding: 8px 10px; outline: none; cursor: pointer; appearance: none; width: 100%; }
  .u-dialog-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 0 20px 20px; }
  .u-dialog-cancel { background: none; border: 1px solid var(--color-border); color: var(--color-text-muted); font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; padding: 8px 16px; cursor: pointer; }
  .u-dialog-cancel:hover { border-color: var(--color-text-muted); color: var(--color-text); }
  .u-dialog-confirm { border: none; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; padding: 8px 20px; cursor: pointer; }
  .u-dialog-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  .u-dialog-confirm.blue { background: var(--color-primary); color: #000; }
  .u-dialog-confirm.red  { background: var(--color-error); color: #fff; }

  /* ERROR BANNER */
  .u-err { padding: 8px 14px; background: rgba(255,51,51,0.08); border: 1px solid var(--color-error); font-size: 11px; font-weight: 600; color: var(--color-error); margin-bottom: 12px; }

  /* LOADING */
  .u-loading { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
`
