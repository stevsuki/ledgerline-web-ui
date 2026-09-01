"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import {
  THEME_COOKIE,
  persistPreference,
  type Theme,
} from "@/lib/preferences";

/** Theme lives on <html data-theme>, stamped by the server from a cookie. */
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  persistPreference(THEME_COOKIE, theme);
}

export function ThemeToggle({ initial }: { readonly initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-secondary btn-icon"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}

const THEME_DESCRIPTION: Readonly<Record<Theme, string>> = {
  dark: "Dark — cool ink ground, one warm accent",
  light: "Light — soft paper ground, one warm accent",
};

/** The Settings screen's Appearance row. */
export function ThemeSegment({ initial }: { readonly initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    applyTheme(next);
    setTheme(next);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-row">Appearance</p>
        <p className="text-meta text-muted mt-0.5">
          {THEME_DESCRIPTION[theme]}
        </p>
      </div>
      <div className="seg" role="group" aria-label="Theme">
        <label className="seg-opt">
          <input
            type="radio"
            name="theme"
            value="light"
            checked={theme === "light"}
            onChange={() => choose("light")}
          />
          Light
        </label>
        <label className="seg-opt">
          <input
            type="radio"
            name="theme"
            value="dark"
            checked={theme === "dark"}
            onChange={() => choose("dark")}
          />
          Dark
        </label>
      </div>
    </div>
  );
}
