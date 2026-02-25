export const SETTINGS_CSS = `
  .st-container { display:flex; flex-direction:column; height:100%; overflow:hidden; background:var(--color-bg); }

  .st-topbar {
    border-bottom:1px solid var(--color-border);
    padding:0 24px; display:flex; align-items:center; height:52px;
    background:var(--color-card); flex-shrink:0; gap:16px;
  }
  .st-topbar-title {
    font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:17px;
    letter-spacing:0.06em; text-transform:uppercase; color:var(--color-text);
  }

  .st-body { display:flex; flex:1; overflow:hidden; min-height:0; }

  .st-snav {
    width:204px; border-right:1px solid var(--color-border);
    padding:16px 0; overflow-y:auto; flex-shrink:0; background:var(--color-card);
  }
  .st-snav-group { padding:10px 0 4px; }
  .st-snav-group-label {
    font-size:9px; font-weight:700; text-transform:uppercase;
    letter-spacing:0.06em; color:var(--color-text-muted); padding:0 16px 6px;
    display:block;
  }
  .st-snav-item {
    display:flex; align-items:center; gap:9px; padding:8px 16px;
    font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; font-weight:600;
    color:var(--color-text-muted); cursor:pointer; border:none; background:none;
    border-left:2px solid transparent; width:100%; text-align:left;
    transition:color 0.1s, background 0.1s, border-left-color 0.1s;
  }
  .st-snav-item:hover { color:var(--color-text); background:var(--color-surface); }
  .st-snav-item.active {
    color:var(--color-primary); border-left-color:var(--color-primary);
    background:rgba(0,240,255,0.04);
  }

  .st-scroll { flex:1; overflow-y:auto; padding:24px; }
  .st-scroll::-webkit-scrollbar { width:3px; }
  .st-scroll::-webkit-scrollbar-thumb { background:var(--color-border); }

  .st-sec-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .st-sec-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); white-space:nowrap; }
  .st-sec-line { flex:1; height:1px; background:var(--color-border); }
  .st-section { margin-bottom:28px; }

  .st-block { background:var(--color-card); border:1px solid var(--color-border); overflow:hidden; margin-bottom:1px; }
  .st-row { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; gap:24px; }
  .st-row+.st-row { border-top:1px solid var(--color-border); }
  .st-label { font-size:13px; font-weight:600; color:var(--color-text); margin-bottom:2px; }
  .st-desc { font-size:11px; font-weight:500; color:var(--color-text-muted); line-height:1.5; }
  .st-ctrl { flex-shrink:0; display:flex; align-items:center; gap:10px; }

  /* Square Toggle */
  .sq-wrap { position:relative; width:38px; height:20px; cursor:pointer; flex-shrink:0; }
  .sq-wrap input { opacity:0; width:0; height:0; position:absolute; }
  .sq-track {
    position:absolute; inset:0; border:1px solid var(--color-border);
    background:var(--color-surface); transition:background 0.15s, border-color 0.15s;
  }
  .sq-wrap input:checked + .sq-track { background:var(--color-primary); border-color:var(--color-primary); }
  .sq-thumb {
    position:absolute; top:3px; left:3px; width:12px; height:12px;
    background:var(--color-text-muted); transition:transform 0.15s, background 0.15s;
    pointer-events:none;
  }
  .sq-wrap input:checked ~ .sq-thumb { transform:translateX(18px); background:#000; }
  .sq-wrap:has(input:disabled) { cursor:not-allowed; opacity:.55; }

  .st-select {
    background:var(--color-surface); border:1px solid var(--color-border);
    color:var(--color-text); font-family:'Plus Jakarta Sans',sans-serif;
    font-size:12px; font-weight:600; padding:6px 10px; outline:none; cursor:pointer;
    appearance:none; min-width:140px;
  }
  .st-select:focus { border-color:var(--color-primary); }
  .st-input {
    background:var(--color-surface); border:1px solid var(--color-border);
    color:var(--color-text); font-family:'Plus Jakarta Sans',sans-serif;
    font-size:12px; font-weight:500; padding:6px 10px; outline:none; flex:1; min-width:0;
  }
  .st-input:focus { border-color:var(--color-primary); }
  .st-input::placeholder { color:var(--color-text-muted); }
  .st-input.mono { font-family:'IBM Plex Mono',monospace; font-size:12px; }
  .st-input-row { display:flex; gap:8px; align-items:center; margin-top:8px; }

  .st-btn {
    display:flex; align-items:center; gap:5px; padding:6px 12px;
    font-family:'Plus Jakarta Sans',sans-serif; font-size:10px; font-weight:700;
    letter-spacing:0.04em; text-transform:uppercase; cursor:pointer;
    transition:all 0.12s; white-space:nowrap; border:none;
  }
  .st-btn:disabled { opacity:.5; cursor:not-allowed; }
  .st-btn-ghost { border:1px solid var(--color-border) !important; background:none; color:var(--color-text-muted); }
  .st-btn-ghost:hover:not(:disabled) { color:var(--color-text); border-color:var(--color-text-muted) !important; }
  .st-btn-primary { border:1.5px solid var(--color-primary) !important; background:rgba(0,240,255,0.06); color:var(--color-primary); }
  .st-btn-primary:hover:not(:disabled) { background:var(--color-primary); color:#000; }
  .st-btn-danger { border:1.5px solid var(--color-error) !important; background:rgba(229,72,77,0.06); color:var(--color-error); }
  .st-btn-danger:hover:not(:disabled) { background:var(--color-error); color:#fff; }
  .st-btn-warning { border:1.5px solid var(--color-warning) !important; background:rgba(245,166,35,0.06); color:var(--color-warning); }
  .st-btn-warning:hover:not(:disabled) { background:var(--color-warning); color:#000; }

  .st-profile-card {
    display:flex; align-items:center; gap:14px; padding:16px 18px;
    background:var(--color-card); border:1px solid var(--color-border); margin-bottom:1px;
  }
  .st-avatar {
    width:44px; height:44px; border:1.5px solid var(--color-primary);
    display:flex; align-items:center; justify-content:center;
    font-size:16px; font-weight:800; color:var(--color-primary);
    background:rgba(0,240,255,0.06); flex-shrink:0; font-family:'Plus Jakarta Sans',sans-serif;
  }
  .st-profile-name { font-size:15px; font-weight:800; color:var(--color-text); margin-bottom:2px; }
  .st-profile-role { font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--color-primary); }
  .st-profile-email { font-size:11px; font-weight:500; color:var(--color-text-muted); margin-top:2px; }
  .st-role-badge { font-size:10px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; border:1px solid var(--color-primary); padding:2px 8px; color:var(--color-primary); }

  .st-sev-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--color-border); border:1px solid var(--color-border); }
  .st-sev-cell { background:var(--color-card); padding:12px 14px; cursor:pointer; transition:background 0.1s; user-select:none; }
  .st-sev-cell:hover { background:var(--color-surface); }
  .st-sev-cell.active { background:var(--color-surface); }
  .st-sev-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
  .st-sev-dot { width:8px; height:8px; border-radius:50%; }
  .st-sev-name { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px; }
  .st-sev-desc { font-size:10px; font-weight:500; color:var(--color-text-muted); }

  .st-day-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:14px 18px; border-top:1px solid var(--color-border); }
  .st-day-item { display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; }
  .st-day-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--color-text-muted); }
  .st-day-box { width:32px; height:32px; border:1px solid var(--color-border); display:flex; align-items:center; justify-content:center; transition:all 0.1s; background:var(--color-surface); font-size:12px; font-weight:700; }
  .st-day-box.on { border-color:var(--color-primary); background:rgba(0,240,255,0.08); color:var(--color-primary); }
  .st-day-box.off { color:var(--color-text-muted); }

  .st-key-block { background:var(--color-surface); border:1px solid var(--color-border); display:flex; align-items:center; gap:10px; padding:10px 14px; }
  .st-key-text { font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--color-text); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .st-session-row { display:flex; align-items:center; gap:12px; padding:11px 18px; border-top:1px solid var(--color-border); }
  .st-session-icon { width:28px; height:28px; border:1px solid var(--color-border); display:flex; align-items:center; justify-content:center; color:var(--color-text-muted); flex-shrink:0; }
  .st-session-device { font-size:12px; font-weight:600; color:var(--color-text); }
  .st-session-meta { font-size:10px; font-weight:500; color:var(--color-text-muted); margin-top:1px; }
  .st-session-current { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--color-success); border:1px solid var(--color-success); padding:1px 6px; }
  .st-session-revoke { margin-left:auto; display:flex; align-items:center; gap:4px; padding:4px 10px; font-family:'Plus Jakarta Sans',sans-serif; font-size:9px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; border:1px solid transparent; background:none; color:var(--color-text-muted); cursor:pointer; transition:all 0.1s; }
  .st-session-revoke:hover { border-color:var(--color-error); color:var(--color-error); }

  .st-toast { position:fixed; bottom:24px; right:24px; background:var(--color-card); border:1px solid var(--color-success); border-left:3px solid var(--color-success); padding:10px 16px; font-size:12px; font-weight:600; color:var(--color-success); display:flex; align-items:center; gap:8px; z-index:9999; animation:st-up 0.2s ease-out; pointer-events:none; font-family:'Plus Jakarta Sans',sans-serif; }
  .st-toast.error { border-color:var(--color-error); border-left-color:var(--color-error); color:var(--color-error); }
  .st-toast.warn { border-color:var(--color-warning); border-left-color:var(--color-warning); color:var(--color-warning); }
  @keyframes st-up { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

  .st-danger-card { border:1px solid rgba(229,72,77,0.22); background:rgba(229,72,77,0.025); margin-bottom:1px; }
  .st-danger-row { display:flex; align-items:center; gap:14px; padding:14px 18px; }
  .st-danger-title { font-size:12px; font-weight:700; color:var(--color-error); margin-bottom:2px; }
  .st-danger-desc { font-size:11px; font-weight:500; color:var(--color-text-muted); }

  .st-sys-grid { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--color-border); border:1px solid var(--color-border); }
  .st-sys-cell { background:var(--color-card); padding:14px 16px; }
  .st-sys-cell-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-muted); margin-bottom:4px; }
  .st-sys-cell-value { font-size:14px; font-weight:700; color:var(--color-text); }
  .st-sys-cell-value.ok { color:var(--color-success); }

  .st-slider-area { padding:10px 18px 14px; border-top:1px solid var(--color-border); }
  .st-slider-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-text-muted); margin-bottom:8px; display:flex; justify-content:space-between; }
  input[type=range].st-range { width:100%; height:2px; accent-color:var(--color-primary); background:var(--color-border); cursor:pointer; }
  .st-range-row { display:flex; justify-content:space-between; font-size:10px; font-weight:600; color:var(--color-text-muted); margin-top:6px; }

  .st-inset { border-top:1px solid var(--color-border); padding:14px 18px; background:var(--color-surface); }
  .st-inset-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-muted); margin-bottom:8px; }
  .st-col-row { display:flex; flex-direction:column; gap:8px; padding:14px 18px; }
  .st-col-row+.st-col-row { border-top:1px solid var(--color-border); }
`
