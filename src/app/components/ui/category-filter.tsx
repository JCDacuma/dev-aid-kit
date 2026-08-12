"use client";

import {
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  type ToolCategory,
} from "@/app/lib/tools";

interface CategoryFilterProps {
  active: ToolCategory | "All";
  onChange: (category: ToolCategory | "All") => void;
}

export default function CategoryFilter({
  active,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("All")}
        className={`rounded-full border px-3.5 py-1.5 font-mono text-[12px] transition-colors ${
          active === "All"
            ? "border-white/20 bg-white/10 text-white"
            : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80"
        }`}
      >
        All
      </button>
      {CATEGORY_ORDER.map((category) => {
        const isActive = active === category;
        const color = CATEGORY_COLORS[category];
        return (
          <button
            key={category}
            onClick={() => onChange(category)}
            style={
              isActive
                ? {
                    borderColor: `${color}66`,
                    backgroundColor: `${color}14`,
                    color,
                  }
                : undefined
            }
            className={`rounded-full border px-3.5 py-1.5 font-mono text-[12px] transition-colors ${
              isActive
                ? ""
                : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
