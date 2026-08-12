"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

interface NavbarContextType {
  setBackURL: (url: string) => void;
  backURL: string | null;
}

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export default function ContextToolNavbar({
  children,
}: {
  children: React.ReactNode;
}) {
  const [backURL, setBackURL] = useState<string | null>("toolbox");

  return (
    <NavbarContext.Provider value={{ setBackURL, backURL }}>
      <ToolNavbarLayout>{children}</ToolNavbarLayout>
    </NavbarContext.Provider>
  );
}

export const useNavbar = () => {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error("useNavbar must be used within a ContextNavbar");
  }
  return context;
};

const ToolNavbarLayout = ({ children }: { children: React.ReactNode }) => {
  const { backURL } = useNavbar();
  const router = useRouter();

  const handleBack = () => {
    if (backURL) {
      router.push(`/${backURL}`);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0b0d]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center px-5 py-3 sm:px-8">
          <motion.button
            type="button"
            onClick={handleBack}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="group flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-mono text-xs text-white/70 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
          >
            <ArrowLeft
              size={14}
              strokeWidth={1.75}
              className="transition-transform duration-150 group-hover:-translate-x-0.5"
            />
            Back
          </motion.button>
        </div>
      </nav>
      {children}
    </div>
  );
};
