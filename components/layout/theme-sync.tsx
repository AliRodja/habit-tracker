"use client";

import { useEffect } from "react";
import type { Theme } from "@/lib/constants";
import { applyTheme } from "@/lib/theme";

export function ThemeSync({ theme }: { theme: Theme }) {
  useEffect(() => applyTheme(theme), [theme]);
  return null;
}
