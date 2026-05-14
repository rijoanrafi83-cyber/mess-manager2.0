import { useMemo } from "react";

import { useTheme } from "../context/ThemeContext";

export function useChartTheme() {
  const {
    accentColor,
    chartColors,
    dark,
    themeTokens,
  } = useTheme();

  return useMemo(() => {
    const text =
      themeTokens["--text-muted"] ||
      (dark ? "#94a3b8" : "#64748b");
    const border =
      themeTokens["--border-soft"] ||
      (dark
        ? "rgba(255,255,255,0.1)"
        : "rgba(15,23,42,0.1)");
    const card =
      themeTokens["--bg-elevated"] ||
      themeTokens["--bg-card"] ||
      (dark ? "#111827" : "#ffffff");

    return {
      accent: accentColor,
      colors: chartColors,
      grid: border,
      axis: text,
      tooltip: {
        background: card,
        border,
        color:
          themeTokens["--text-primary"] ||
          (dark ? "#f8fafc" : "#0f172a"),
      },
      gradientFrom: accentColor,
      gradientTo: `${accentColor}12`,
    };
  }, [
    accentColor,
    chartColors,
    dark,
    themeTokens,
  ]);
}
