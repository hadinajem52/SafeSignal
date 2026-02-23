import { ChevronRight } from "lucide-react";
import { SkeletonLoader } from "./UIStates";
import SectionCard from "./SectionCard";

export default function PlatformStatusCard({ stats, extras = [], loading = false }) {
  const platformStatus = [
    { label: "Pending Review", value: stats.pendingReports, color: "text-warning" },
    { label: "Verified", value: stats.verifiedReports, color: "text-success" },
    { label: "Rejected", value: stats.rejectedReports, color: "text-error" },
    { label: "Active Users", value: stats.activeUsers, color: "text-primary" },
    { label: "Suspended", value: stats.suspendedUsers, color: "text-muted" },
    ...extras,
  ];

  return (
    <SectionCard title="Platform Status">
      {platformStatus.map((item, i) => (
        <div
          key={item.label}
          className={`flex items-center gap-3 py-2.5 ${i < platformStatus.length - 1 ? "border-b border-border" : ""}`}
        >
          <span className="flex-1 text-xs text-text">{item.label}</span>
          {loading ? (
            <SkeletonLoader className="h-4 w-8" />
          ) : (
            <span className={`text-xs font-bold ${item.color} w-8 text-right`}>
              {item.value}
            </span>
          )}
          <ChevronRight size={12} className="text-muted flex-shrink-0" />
        </div>
      ))}
    </SectionCard>
  );
}
