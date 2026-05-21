/**
 * BreakfastModeToggle
 *
 * A 3-state cycling button for breakfast mode selection.
 * Cycles through: Off → Half → Full → Off
 *
 * Replaces the binary Check/X toggle for the breakfast column
 * in PermanentMealManager.
 */

import { motion } from "framer-motion";
import { Check, Minus, X } from "lucide-react";

const MODE_CONFIG = {
  off: {
    icon: X,
    label: "Off",
    className:
      "theme-muted border-gray-200/70 dark:border-white/10 theme-muted-text hover:bg-[var(--bg-card)]",
  },
  half: {
    icon: Minus,
    label: "Half",
    className:
      "bg-orange-500/80 text-white border-transparent shadow-lg shadow-orange-500/20",
  },
  full: {
    icon: Check,
    label: "Full",
    className:
      "bg-orange-500 text-white border-transparent shadow-lg shadow-orange-500/25",
  },
};

export function BreakfastModeToggle({ mode = "off", disabled = false, memberName, onCycle }) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.off;
  const Icon = config.icon;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      disabled={disabled}
      onClick={onCycle}
      className={`relative inline-flex h-12 w-16 items-center justify-center rounded-2xl border transition-all duration-300 ${config.className} ${
        disabled ? "cursor-default opacity-60" : "hover:-translate-y-0.5"
      }`}
      aria-label={`Breakfast ${config.label} for ${memberName}`}
    >
      <Icon size={18} />
      {mode === "full" && (
        <motion.span
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white/80"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        />
      )}
      {mode === "half" && (
        <motion.span
          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-white/60"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        />
      )}
    </motion.button>
  );
}
