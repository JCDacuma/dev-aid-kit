"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors focus-within:border-emerald-400/40">
      <Search size={16} className="shrink-0 text-white/30" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tools..."
        className="w-full bg-transparent font-mono text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
      />
      <kbd className="hidden shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-white/30 sm:block">
        ⌘K
      </kbd>
    </div>
  );
}
