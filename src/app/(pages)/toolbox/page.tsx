"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import SearchBar from "@/app/components/ui/searchbar";
import CategoryFilter from "@/app/components/ui/category-filter";
import ToolCard from "@/app/components/ui/toolcards";
import HeroSection from "@/app/components/layouts/hero-sections";
import {
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  TOOLS,
  type ToolCategory,
} from "@/app/lib/tools";

const EASE = [0.22, 1, 0.36, 1] as const;

const controlsVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE, delay: 0.08 },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.035, delayChildren: 0.04 },
  },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE } },
};

// Scroll-aware and reversible (hides smoothly when scrolled out of view).
// layout="position" (not full `layout`) is what keeps this cheap: it only
// interpolates x/y transforms instead of measuring + animating size/borders
// on every card, every time whileInView toggles during a scroll.
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASE,
      delay: Math.min(index % 3, 2) * 0.06,
    },
  }),
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15, ease: EASE } },
};

const emptyStateVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: EASE } },
};

// IntersectionObserver-driven (whileInView), so this is off the main thread
// scroll path — cheap regardless of list size.
const VIEWPORT = {
  once: false,
  amount: 0.25,
  margin: "0px 0px -80px 0px",
} as const;

export default function MainPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "All">("All");

  // Defers re-filtering while the user is still typing fast, keeping input
  // latency low even with a large TOOLS array.
  const deferredQuery = useDeferredValue(query);

  const handleQueryChange = useCallback((v: string) => setQuery(v), []);
  const handleCategoryChange = useCallback(
    (c: ToolCategory | "All") => setCategory(c),
    [],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const matchesCategory = category === "All" || tool.category === category;
      if (!matchesCategory) return false;
      if (q.length === 0) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q)
      );
    });
  }, [deferredQuery, category]);

  const grouped = useMemo(() => {
    const groups: { category: ToolCategory; tools: typeof TOOLS }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const tools = filtered.filter((tool) => tool.category === cat);
      if (tools.length > 0) groups.push({ category: cat, tools });
    }
    return groups;
  }, [filtered]);

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <HeroSection />
      <div
        id="tools"
        className="mx-auto flex w-full max-w-7xl scroll-mt-8 flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16"
      >
        <motion.div
          initial="hidden"
          animate="show"
          variants={controlsVariants}
          className="flex flex-col gap-4"
        >
          <SearchBar value={query} onChange={handleQueryChange} />
          <CategoryFilter active={category} onChange={handleCategoryChange} />
        </motion.div>

        <AnimatePresence mode="popLayout" initial={false}>
          {grouped.length === 0 ? (
            <motion.div
              key="empty"
              initial="hidden"
              animate="show"
              exit="exit"
              variants={emptyStateVariants}
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 py-16 text-center"
            >
              <p className="font-mono text-sm text-white/50">
                No tools matched &quot;{query}&quot;
              </p>
              <p className="text-xs text-white/30">
                Try a different search or clear the filter.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              className="flex flex-col gap-10 min-h-[calc(100vh-250px)]"
            >
              {grouped.map((group) => (
                <motion.section
                  key={group.category}
                  layout="position"
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-white/35">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: CATEGORY_COLORS[group.category],
                      }}
                    />
                    {group.category}
                  </div>
                  <motion.div
                    variants={sectionVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {group.tools.map((tool, index) => (
                        <motion.div
                          key={tool.slug}
                          layout="position"
                          custom={index}
                          variants={cardVariants}
                          initial="hidden"
                          whileInView="show"
                          exit="exit"
                          viewport={VIEWPORT}
                          className="h-full"
                        >
                          <ToolCard tool={tool} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </motion.section>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
