import { Flag, LayoutGrid, Radio } from "lucide-react";

export const WORKFLOW_STEPS = [
  { id: "verified", label: "Verified" },
  { id: "dispatched", label: "Dispatched" },
  { id: "on_scene", label: "On Scene" },
  { id: "investigating", label: "Investigating" },
  { id: "police_closed", label: "Closed" },
];

export const STATUS_TRANSITIONS = {
  verified: ["dispatched"],
  dispatched: ["on_scene"],
  on_scene: ["investigating"],
  investigating: ["police_closed"],
  police_closed: [],
};

export const STATUS_ACTION_CONFIG = {
  dispatched: {
    label: "Dispatch Unit",
    confirmTitle: "Dispatch unit?",
    confirmMessage:
      "This marks the incident as dispatched and notifies responders.",
    confirmClassName: "bg-primary hover:bg-primary/90 text-bg",
  },
  on_scene: {
    label: "Mark On Scene",
    confirmTitle: "Mark unit on scene?",
    confirmMessage:
      "Use this only when a responding unit has arrived at the location.",
    confirmClassName: "bg-warning hover:bg-warning/90 text-bg",
  },
  investigating: {
    label: "Mark Investigating",
    confirmTitle: "Move to investigating?",
    confirmMessage:
      "This marks active scene handling as complete and starts investigation.",
    confirmClassName: "bg-warning/70 hover:bg-warning/90 text-bg",
  },
  police_closed: {
    label: "Close Case",
    confirmTitle: "Close this case?",
    confirmMessage:
      "Closing is recorded in the audit log and ends the active LE workflow.",
    confirmClassName:
      "bg-success/20 hover:bg-success/30 text-success border border-success/40",
  },
};

export const UNACTIONED_AGE_THRESHOLD_MINUTES = 30;

export const SEVERITY_COLOR = {
  critical: "#A855F7",
  high: "#E5484D",
  medium: "#F5A623",
  low: "#3B9EFF",
};

export const LEI_QUEUE_WIDTH = { min: 320, max: 760, default: 420 };
export const LEI_SPLITTER_WIDTH = 8;
export const LEI_MIN_DETAIL_WIDTH = 520;

export const VIEWS = [
  { id: "queue", label: "Incident Queue", Icon: Radio },
  { id: "map", label: "Operations Map", Icon: LayoutGrid },
  { id: "closed", label: "Closed Cases", Icon: Flag },
];
