"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import HeroBackground from "@/app/components/ui/hero-backgrounds";
import { TOOLS, CATEGORY_ORDER } from "@/app/lib/tools";

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay },
  }),
};

function TerminalCycle() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (TOOLS.length === 0) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % TOOLS.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const tool = TOOLS[index];
  if (!tool) return null;

  return (
    <div
      className="flex h-6 items-center justify-center gap-2 font-mono text-sm text-white/50 sm:text-base"
      aria-live="polite"
      aria-label="Terminal showing available developer tools"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={tool.slug}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="text-white/80"
        >
          {tool.name.toLowerCase().replace(/\s+/g, "-")}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function scrollToTools(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  document
    .getElementById("tools")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function HeroSection() {
  return (
    <section
      aria-label="DevAidKit Developer Tools & Utilities"
      className="relative isolate flex min-h-160 h-screen w-full flex-col items-center justify-center overflow-hidden border-b border-white/5 px-5 py-24 sm:min-h-[82vh] sm:py-28"
    >
      <HeroBackground />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,11,13,0.15)_0%,rgba(10,11,13,0.75)_65%,rgba(10,11,13,0.96)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent to-[#0a0b0d]" />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-6 text-center">
        <motion.div
          initial="hidden"
          animate="show"
          custom={0.06}
          variants={fadeUp}
          className="flex items-center gap-3"
        >
          <img
            src="/logo/codepentry_logo.svg"
            className="h-10 w-10 sm:h-15 sm:w-15 mb-2"
            alt="DevAidKit Logo"
          />
          <h1 className="font-mono text-3xl font-bold tracking-tight text-white sm:text-5xl">
            DevAidKit
          </h1>
        </motion.div>

        <motion.p
          initial="hidden"
          animate="show"
          custom={0.12}
          variants={fadeUp}
          className="max-w-xl text-balance text-sm leading-relaxed text-white/60 sm:text-base"
        >
          Essential, client-side developer utilities designed for speed and
          total privacy. Fast, free, and runs entirely in your browser.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="show"
          custom={0.18}
          variants={fadeUp}
        >
          <TerminalCycle />
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          custom={0.24}
          variants={fadeUp}
          className="mt-2 flex flex-col items-center gap-5  sm:gap-8"
        >
          <div className="flex items-center gap-4 font-mono text-xs text-white/35 sm:gap-5">
            <span>
              <span className="text-white/70">{TOOLS.length}</span> tools ready
            </span>

            <span>
              <span className="text-white/70">100%</span> private (client-side)
            </span>
          </div>
          <a
            href="#tools"
            onClick={scrollToTools}
            className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-5 py-2.5 font-mono text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-400/50 hover:bg-emerald-400/15 focus-visible:outline  focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Explore Free Dev Tools
          </a>
        </motion.div>
      </div>
    </section>
  );
}
