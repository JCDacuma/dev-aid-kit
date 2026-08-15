import { memo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CATEGORY_COLORS, type Tool } from "@/app/lib/tools";
import { motion } from "framer-motion";

const MotionLink = motion.create(Link);

const cardVariants = {
  rest: { y: 0 },
  hover: { y: -3 },
};

const TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

function ToolCard({ tool }: { tool: Tool }) {
  const accent = CATEGORY_COLORS[tool.category];
  const Icon = tool.icon;

  return (
    <MotionLink
      href={`/${tool.slug}`}
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={cardVariants}
      transition={TRANSITION}
      style={{ "--accent": accent } as React.CSSProperties}
      className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-lg border border-white/10 bg-white/2 p-5 transition-colors duration-200 hover:border-white/15 will-change-transform"
    >
      <div className="absolute inset-0 bg-linear-to-b from-[#0a0b0d]/20 via-[#0a0b0d]/40 to-[#0a0b0d]/70" />
      <span className="pointer-events-none absolute left-0 top-0 z-10 h-3 w-3 border-l border-t border-transparent transition-all duration-200 group-hover:h-4 group-hover:w-4 group-hover:border-(--accent)" />
      <span className="pointer-events-none absolute right-0 top-0 z-10 h-3 w-3 border-r border-t border-transparent transition-all duration-200 group-hover:h-4 group-hover:w-4 group-hover:border-(--accent)" />
      <span className="pointer-events-none absolute bottom-0 left-0 z-10 h-3 w-3 border-b border-l border-transparent transition-all duration-200 group-hover:h-4 group-hover:w-4 group-hover:border-(--accent)" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-3 w-3 border-b border-r border-transparent transition-all duration-200 group-hover:h-4 group-hover:w-4 group-hover:border-(--accent)" />

      <div className="relative z-10 flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/40"
          style={{ color: accent }}
        >
          <Icon size={17} strokeWidth={1.75} />
        </div>
        <ArrowUpRight
          size={16}
          style={{ color: accent }}
          className="mt-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-1.5">
        <h3 className="font-mono text-[15px] leading-snug text-white/90 line-clamp-1">
          {tool.name}
        </h3>
        <p className="text-[13px] leading-relaxed text-white/60 line-clamp-3">
          {tool.description}
        </p>
      </div>
    </MotionLink>
  );
}

export default memo(ToolCard);
