const leStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  .lei-root {
    --le-bg: #07090B;
    --le-surface: #0D1117;
    --le-surface2: #131920;
    --le-border: #1C2430;
    --le-border2: #243040;
    --le-muted: #3D4F65;
    --le-text: #D9E4F0;
    --le-text-dim: #5C7390;
    --le-amber: #F5A623;
    --le-red: #E5484D;
    --le-blue: #3B9EFF;
    --le-green: #30A46C;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: var(--le-text);
    background: var(--le-bg);
  }
  .lei-root * { box-sizing: border-box; margin: 0; padding: 0; }

  /* TOPBAR */
  .lei-topbar {
    border-bottom: 1px solid var(--le-border);
    padding: 0 24px;
    display: flex;
    align-items: center;
    background: var(--le-surface);
    flex-shrink: 0;
    height: 52px;
  }
  .lei-topbar-title {
    font-weight: 800;
    font-size: 17px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--le-text);
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: 32px;
    flex-shrink: 0;
  }
  .lei-tab-bar { display: flex; flex: 1; }
  .lei-tab {
    padding: 0 20px;
    height: 52px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    letter-spacing: 0.04em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--le-text-dim);
    cursor: pointer;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    transition: color 0.1s;
  }
  .lei-tab:hover { color: var(--le-text); }
  .lei-tab.active { color: var(--le-blue); border-bottom-color: var(--le-blue); }
  .lei-live-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .lei-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    animation: lei-pulse 2s ease-in-out infinite;
  }
  @keyframes lei-pulse { 0%,100%{opacity:1}50%{opacity:0.3} }

  /* ALERT BANNER */
  .lei-alert-banner-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 24px;
    background: rgba(245,166,35,0.05);
    border: none;
    border-bottom: 1px solid rgba(245,166,35,0.2);
    cursor: pointer;
    transition: background 0.1s;
  }
  .lei-alert-banner-toggle:hover { background: rgba(245,166,35,0.09); }
  .lei-alert-banner-left {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--le-amber);
    letter-spacing: 0.04em;
  }
  .lei-alert-count {
    font-size: 10px;
    background: var(--le-amber);
    color: #000;
    padding: 2px 6px;
    font-weight: 700;
    border-radius: 2px;
  }
  .lei-alert-rows { border-bottom: 1px solid rgba(245,166,35,0.15); }
  .lei-alert-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 9px 24px;
    border-top: 1px solid var(--le-border);
    cursor: pointer;
    background: none;
    transition: background 0.1s;
  }
  .lei-alert-row:hover { background: rgba(245,166,35,0.04); }
  .lei-alert-row-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .lei-alert-row-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

  /* CONTENT SPLIT */
  .lei-content {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  .lei-content-inner {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
  .lei-splitter {
    width: 8px;
    flex-shrink: 0;
    cursor: col-resize;
    touch-action: none;
    background: transparent;
    position: relative;
  }
  .lei-splitter::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    transform: translateX(-50%);
    background: var(--le-border2);
  }
  .lei-splitter:hover::after,
  .lei-splitter.active::after {
    background: var(--le-blue);
  }

  /* QUEUE PANEL */
  .lei-queue-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
    background: var(--le-surface);
  }
  .lei-queue-filters {
    padding: 14px 16px;
    border-bottom: 1px solid var(--le-border);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .lei-search-box {
    background: var(--le-surface2);
    border: 1px solid var(--le-border2);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
  }
  .lei-search-box input {
    background: none;
    border: none;
    outline: none;
    color: var(--le-text);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px;
    flex: 1;
  }
  .lei-search-box input::placeholder { color: var(--le-text-dim); }
  .lei-filter-row { display: flex; gap: 8px; align-items: center; }
  .lei-select {
    flex: 1;
    background: var(--le-surface2);
    border: 1px solid var(--le-border2);
    color: var(--le-text);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    padding: 6px 10px;
    outline: none;
    cursor: pointer;
    appearance: none;
  }
  .lei-sort-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    border: 1px solid var(--le-border2);
    color: var(--le-text-dim);
    background: none;
    text-transform: uppercase;
    transition: all 0.1s;
  }
  .lei-sort-btn.active { background: rgba(59,158,255,0.08); border-color: var(--le-blue); color: var(--le-blue); }

  /* COLUMN HEADERS */
  .lei-queue-cols {
    display: grid;
    grid-template-columns: 1fr 72px 80px 90px;
    padding: 7px 16px;
    border-bottom: 1px solid var(--le-border);
    flex-shrink: 0;
    background: var(--le-surface);
    gap: 8px;
  }
  .lei-col-label {
    font-size: 9px;
    letter-spacing: 0.06em;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--le-muted);
  }

  /* INCIDENT ROWS */
  .lei-incident-list { flex: 1; overflow-y: auto; }
  .lei-incident-list::-webkit-scrollbar { width: 3px; }
  .lei-incident-list::-webkit-scrollbar-thumb { background: var(--le-border2); }
  .lei-incident-row {
    display: grid;
    grid-template-columns: 1fr 72px 80px 90px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--le-border);
    cursor: pointer;
    transition: background 0.1s;
    align-items: center;
    background: var(--le-surface);
    gap: 8px;
  }
  .lei-incident-row > div:first-child { min-width: 0; }
  .lei-incident-row:hover { background: var(--le-surface2); }
  .lei-incident-row.selected { background: rgba(59,158,255,0.05); border-left: 2px solid var(--le-blue); padding-left: 14px; }
  .lei-incident-row.aged { background: rgba(229,72,77,0.06); }
  .lei-incident-title { font-size: 13px; font-weight: 600; color: var(--le-text); margin-bottom: 2px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lei-incident-preview { font-size: 10px; color: var(--le-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lei-sev-badge { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .lei-sev-label { font-size: 9px; letter-spacing: 0.05em; font-weight: 700; }
  .lei-sev-dots { display: flex; gap: 2px; }
  .lei-sev-dot { width: 5px; height: 5px; border-radius: 50%; }
  .lei-age-cell { font-size: 11px; color: var(--le-text-dim); font-variant-numeric: tabular-nums; }
  .lei-age-flag { font-size: 9px; color: var(--le-amber); margin-top: 2px; }
  .lei-action-btn {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 5px 9px;
    border: 1px solid var(--le-blue);
    color: var(--le-blue);
    background: rgba(59,158,255,0.06);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .lei-action-btn:hover:not(:disabled) { background: var(--le-blue); color: #000; }
  .lei-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .lei-empty { display: flex; align-items: center; justify-content: center; height: 120px; color: var(--le-muted); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }

  /* DETAIL PANEL */
  .lei-detail-panel { display: flex; flex-direction: column; overflow: hidden; height: 100%; background: var(--le-bg); }
  .lei-detail-scroll { flex: 1; overflow-y: auto; padding: 24px; }
  .lei-detail-scroll::-webkit-scrollbar { width: 3px; }
  .lei-detail-scroll::-webkit-scrollbar-thumb { background: var(--le-border2); }
  .lei-detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
  .lei-detail-title { font-size: 26px; font-weight: 800; letter-spacing: 0.01em; text-transform: uppercase; color: var(--le-text); line-height: 1.15; flex: 1; }
  .lei-status-chip { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border: 1px solid; flex-shrink: 0; margin-top: 3px; }
  .lei-status-chip.verified { border-color: var(--le-green); color: var(--le-green); background: rgba(48,164,108,0.08); }
  .lei-status-chip.dispatched { border-color: var(--le-blue); color: var(--le-blue); background: rgba(59,158,255,0.08); }
  .lei-status-chip.on_scene { border-color: var(--le-blue); color: var(--le-blue); background: rgba(59,158,255,0.06); }
  .lei-status-chip.investigating { border-color: var(--le-amber); color: var(--le-amber); background: rgba(245,166,35,0.08); }
  .lei-status-chip.police_closed { border-color: var(--le-muted); color: var(--le-muted); background: rgba(61,79,101,0.1); }
  .lei-detail-body { font-size: 13px; line-height: 1.7; color: var(--le-text-dim); margin-bottom: 20px; border-left: 2px solid var(--le-border2); padding-left: 14px; }
  .lei-meta-grid { display: grid; grid-template-columns: repeat(3,1fr); border: 1px solid var(--le-border); margin-bottom: 24px; }
  .lei-meta-cell { padding: 12px 14px; border-right: 1px solid var(--le-border); }
  .lei-meta-cell:last-child { border-right: none; }
  .lei-meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--le-muted); margin-bottom: 4px; }
  .lei-meta-value { font-size: 12px; color: var(--le-text); font-weight: 500; }
  .lei-section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--le-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .lei-section-label::after { content:''; flex:1; height:1px; background: var(--le-border); }

  /* WORKFLOW */
  .lei-workflow-steps { display: flex; align-items: flex-start; }
  .lei-workflow-step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; }
  .lei-workflow-step:not(:last-child)::after { content:''; position:absolute; top:11px; left:50%; width:100%; height:1px; background: var(--le-border2); z-index:0; }
  .lei-workflow-step.done::after { background: var(--le-blue); }
  .lei-step-circle { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--le-border2); display:flex; align-items:center; justify-content:center; background:var(--le-surface); position:relative; z-index:1; font-size:9px; color:var(--le-muted); font-weight:600; }
  .lei-step-circle.done { border-color:var(--le-blue); background:rgba(59,158,255,0.15); color:var(--le-blue); }
  .lei-step-circle.current { border-color:var(--le-amber); background:rgba(245,166,35,0.15); color:var(--le-amber); }
  .lei-step-name { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--le-muted); text-align:center; }
  .lei-step-name.done { color:var(--le-blue); }
  .lei-step-name.current { color:var(--le-amber); }

  /* ACTION ROW */
  .lei-action-row { display:flex; gap:10px; margin-top:16px; flex-wrap:wrap; align-items:center; }
  .lei-btn-primary { font-size:11px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; padding:10px 20px; border:1.5px solid var(--le-blue); color:var(--le-blue); background:rgba(59,158,255,0.08); cursor:pointer; transition:all 0.15s; font-family:'Plus Jakarta Sans',sans-serif; display:flex; align-items:center; gap:6px; }
  .lei-btn-primary:hover:not(:disabled) { background:var(--le-blue); color:#000; }
  .lei-btn-primary:disabled { opacity:0.4; cursor:not-allowed; }
  .lei-btn-ghost { font-size:11px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; padding:10px 16px; border:1px solid var(--le-border2); color:var(--le-text-dim); background:none; cursor:pointer; transition:all 0.1s; font-family:'Plus Jakarta Sans',sans-serif; display:flex; align-items:center; gap:6px; }
  .lei-btn-ghost:hover:not(:disabled) { border-color:var(--le-muted); color:var(--le-text); }
  .lei-btn-ghost:disabled { opacity:0.4; cursor:not-allowed; }
  .lei-btn-close { font-size:11px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; padding:10px 16px; border:1px solid var(--le-border2); color:var(--le-text-dim); background:none; cursor:pointer; transition:all 0.1s; font-family:'Plus Jakarta Sans',sans-serif; margin-left:auto; display:flex; align-items:center; gap:6px; }
  .lei-btn-close:hover:not(:disabled) { border-color:var(--le-red); color:var(--le-red); }
  .lei-btn-close:disabled { opacity:0.4; cursor:not-allowed; }

  /* MAP */
  .lei-map-container { background:#090D12; border:1px solid var(--le-border); position:relative; overflow:hidden; margin-top:8px; }
  .lei-map-open-link { position:absolute; top:8px; left:10px; font-size:9px; color:var(--le-blue); letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; text-decoration:none; z-index:10; background:rgba(13,17,23,0.7); padding:2px 6px; }
  .lei-map-open-link:hover { text-decoration:underline; }

  /* CUSTODY */
  .lei-custody-entry { border:1px solid var(--le-border); padding:10px 12px; margin-bottom:8px; background:var(--le-surface); }
  .lei-custody-action { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--le-text); }
  .lei-custody-meta { font-size:10px; color:var(--le-text-dim); margin-top:3px; font-variant-numeric:tabular-nums; }

  /* TOAST */
  .lei-toast-stack { position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none; }
  .lei-toast { min-width:260px; max-width:400px; padding:10px 14px; font-size:11px; font-family:'Plus Jakarta Sans',sans-serif; font-weight:600; letter-spacing:0.04em; border:1px solid; pointer-events:auto; }
  .lei-toast.success { border-color:rgba(48,164,108,0.4); background:rgba(48,164,108,0.08); color:var(--le-green); }
  .lei-toast.error { border-color:rgba(229,72,77,0.4); background:rgba(229,72,77,0.08); color:var(--le-red); }
  .lei-toast.warning { border-color:rgba(245,166,35,0.4); background:rgba(245,166,35,0.08); color:var(--le-amber); }

  /* CLOSED */
  .lei-closed-wrap { padding:24px; overflow-y:auto; flex:1; }
  .lei-closed-table { width:100%; border-collapse:collapse; }
  .lei-closed-table th { text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--le-muted); padding:10px 14px; border-bottom:1px solid var(--le-border); background:var(--le-surface); }
  .lei-closed-table td { padding:10px 14px; font-size:12px; color:var(--le-text-dim); border-bottom:1px solid var(--le-border); }
  .lei-closed-table tr:hover td { background:rgba(255,255,255,0.02); }
  .lei-closed-title { font-size:13px; font-weight:600; color:var(--le-text); margin-bottom:2px; }

  /* SELECT PROMPT */
  .lei-select-prompt { display:flex; align-items:center; justify-content:center; height:100%; font-size:11px; color:var(--le-muted); letter-spacing:0.06em; text-transform:uppercase; }

  /* OPS MAP */
  .lei-ops-map-header { padding:14px 20px; border-bottom:1px solid var(--le-border); background:var(--le-surface); flex-shrink:0; }
  .lei-ops-map-title { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--le-text); }
  .lei-ops-map-sub { font-size:11px; color:var(--le-text-dim); margin-top:3px; }

  .lei-evidence-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .lei-evidence-img { width:100%; height:96px; object-fit:cover; border:1px solid var(--le-border); }
`;

export default leStyles;

