"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import SearchBar from "@/app/components/ui/searchbar";
import CategoryFilter from "@/app/components/ui/category-filter";
import ToolCard from "@/app/components/ui/toolcards";
import {
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  TOOLS,
  type ToolCategory,
} from "@/app/lib/tools";

const EASE = [0.22, 1, 0.36, 1] as const;

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

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

// Replace cardVariants with scroll-aware version
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: EASE,
      delay: Math.min(index % 3, 2) * 0.08, // sequence by column position, capped
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15, ease: EASE },
  },
};

const emptyStateVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: EASE } },
};

export default function MainPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const matchesCategory = category === "All" || tool.category === category;
      const matchesQuery =
        q.length === 0 ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      tools: filtered.filter((tool) => tool.category === cat),
    })).filter((group) => group.tools.length > 0);
  }, [filtered]);

  return (
    <main className="min-h-screen bg-[#0a0b0d]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16">
        <motion.header
          initial="hidden"
          animate="show"
          variants={headerVariants}
          className="flex flex-col gap-4"
        >
          <h2 className="font-mono text-2xl flex items-center flex gap-2 font-semibold tracking-tight text-white sm:text-3xl">
            <span className="text-emerald-400">
              <img
                src="/logo/codepentry_logo.svg"
                className="h-10 w-10"
                alt=""
              />
            </span>{" "}
            DevAidKit
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            A local-first collection of everyday developer tools. Nothing leaves
            your browser, nothing to install.
          </p>
        </motion.header>

        <motion.div
          initial="hidden"
          animate="show"
          variants={controlsVariants}
          className="flex flex-col gap-4"
        >
          <SearchBar value={query} onChange={setQuery} />
          <CategoryFilter active={category} onChange={setCategory} />
        </motion.div>

        <AnimatePresence mode="popLayout">
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
                $ no tools matched &quot;{query}&quot;
              </p>
              <p className="text-xs text-white/30">
                Try a different search or clear the filter.
              </p>
            </motion.div>
          ) : (
            <motion.div key="results" className="flex flex-col gap-10">
              <AnimatePresence mode="popLayout">
                {grouped.map((group) => (
                  <motion.section
                    key={group.category}
                    layout="position"
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    variants={sectionVariants}
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <AnimatePresence mode="popLayout">
                        {group.tools.map((tool, index) => (
                          <motion.div
                            key={tool.slug}
                            layout="position"
                            custom={index}
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="show"
                            exit="exit"
                            viewport={{
                              once: true,
                              amount: 0.2,
                              margin: "0px 0px -60px 0px",
                            }}
                          >
                            <ToolCard tool={tool} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.section>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
