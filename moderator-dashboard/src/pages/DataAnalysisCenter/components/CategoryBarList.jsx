import { useMemo } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { SkeletonLoader, EmptyState } from "./UIStates";

export default function CategoryBarList({
  incidents = [],
  maxCategories = 6,
  accentColor = "bg-primary",
  loading = false,
  emptyTitle = "No categories tracked",
  emptyDescription = "There are no incidents logged to categorize.",
  emptyText = "No data",
}) {
  const { categories, maxCat } = useMemo(() => {
    const categoryMap = {};
    incidents.forEach((inc) => {
      const cat = inc.category || "other";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const cats = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxCategories);

    return { categories: cats, maxCat: cats[0]?.[1] || 1 };
  }, [incidents, maxCategories]);

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <SkeletonLoader key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    if (emptyDescription) {
      return <EmptyState title={emptyTitle} description={emptyDescription} />;
    }
    return <p className="text-xs text-muted text-center py-3">{emptyText}</p>;
  }

  return categories.map(([cat, count], i) => (
    <div
      key={cat}
      className={`flex items-center gap-3 py-2.5 ${i < categories.length - 1 ? "border-b border-border" : ""}`}
    >
      <div className="w-6 h-6 rounded bg-surface flex items-center justify-center flex-shrink-0">
        <FileText size={10} className="text-muted" />
      </div>
      <span className="flex-1 text-xs text-text capitalize min-w-0 truncate">
        {cat.replace(/_/g, " ")}
      </span>
      <span className="text-xs text-muted w-6 text-right flex-shrink-0">
        {count}
      </span>
      <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden flex-shrink-0">
        <div
          className={`h-full rounded-full ${accentColor}`}
          style={{ width: `${Math.round((count / maxCat) * 100)}%` }}
        />
      </div>
      <ChevronRight size={12} className="text-muted flex-shrink-0" />
    </div>
  ));
}
