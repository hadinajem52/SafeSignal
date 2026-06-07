import { PanelRightClose, PanelRightOpen } from "lucide-react";
import IncidentTimeline from "./IncidentTimeline";

/**
 * Right-docked, collapsible "Timeline & Comms" panel shared by the moderator
 * Reports view and the Law Enforcement view so both render an identical chat UI.
 * Width and collapse state are controlled by the parent.
 *
 * Pass allowInternal={false} (e.g. law enforcement) for a public-only composer.
 */
const TimelineCommsPanel = ({
  incidentId,
  collapsed,
  onToggle,
  width = 300,
  allowInternal = true,
  emptyLabel = "No report selected",
}) => {
  return (
    <div
      style={{ width: collapsed ? "44px" : `${width}px` }}
      className="flex-shrink-0 border-l border-border overflow-hidden flex flex-col bg-surface/30"
    >
      {collapsed ? (
        <div className="flex h-full flex-col items-center bg-surface">
          <button
            type="button"
            onClick={() => onToggle(false)}
            aria-label="Expand Timeline and Comms panel"
            title="Expand Timeline and Comms"
            className="mt-3 inline-flex size-8 items-center justify-center border border-border text-muted hover:border-primary/40 hover:text-primary"
          >
            <PanelRightOpen size={15} />
          </button>
          <div
            className="mt-4 text-[10px] font-bold uppercase text-muted"
            style={{ writingMode: "vertical-rl" }}
          >
            Timeline &amp; Comms
          </div>
        </div>
      ) : (
        <>
          <div className="flex-shrink-0 h-[52px] px-4 flex items-center justify-between gap-3 border-b border-border bg-surface">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-text">
                Timeline &amp; Comms
              </p>
              <p className="text-[10px] text-muted mt-0.5 truncate">
                Notes &amp; reporter messages
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggle(true)}
              aria-label="Collapse Timeline and Comms panel"
              title="Collapse Timeline and Comms"
              className="inline-flex size-8 flex-shrink-0 items-center justify-center border border-border text-muted hover:border-primary/40 hover:text-primary"
            >
              <PanelRightClose size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {incidentId ? (
              <IncidentTimeline incidentId={incidentId} allowInternal={allowInternal} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted text-[11px] font-semibold uppercase tracking-[0.04em]">
                {emptyLabel}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TimelineCommsPanel;
