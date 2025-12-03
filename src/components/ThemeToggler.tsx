import { faMoon, faSun } from "@fortawesome/free-regular-svg-icons";
import { faDisplay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { SourcifyMenuItem, SourcifyMenuTitle } from "../SourcifyMenu";
import { useIsClient } from "../hooks/useIsClient";

type Theme = "light" | "dark" | "system";

function updateTheme(theme: Theme) {
  if (typeof window === 'undefined') return;

  const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const isDarkMode =
    theme === "dark" || (theme === "system" && darkModeQuery.matches);
  if (isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return "system";
  return (localStorage.getItem("theme") as Theme) ?? "system";
}

const ThemeToggler: React.FC = () => {
  const isClient = useIsClient();
  const [theme, setTheme] = useState<Theme>("system");
  const [updated, setUpdated] = useState<number | null>(null);

  // Initialize theme from localStorage on client
  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!isClient) return;

    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const mediaQueryListener = () => {
      if (theme === "system") {
        setUpdated(Date.now());
      }
    };
    darkModeQuery.addEventListener("change", mediaQueryListener);

    return () => {
      darkModeQuery.removeEventListener("change", mediaQueryListener);
    };
  }, [isClient, theme]);

  // Apply theme changes
  useEffect(() => {
    if (isClient) {
      updateTheme(theme);
    }
  }, [isClient, theme, updated]);

  const handleThemeChange = (newTheme: Theme) => {
    if (typeof localStorage !== 'undefined') {
      if (newTheme === "system") {
        localStorage.removeItem("theme");
      } else {
        localStorage.setItem("theme", newTheme);
      }
    }
    setTheme(newTheme);
    updateTheme(newTheme);
  };

  return (
    <>
      <SourcifyMenuTitle>Theme</SourcifyMenuTitle>
      <SourcifyMenuItem
        checked={theme === "light"}
        onClick={() => handleThemeChange("light")}
      >
        <FontAwesomeIcon icon={faSun} className="w-4 mr-0.5" /> Light
      </SourcifyMenuItem>
      <SourcifyMenuItem
        checked={theme === "dark"}
        onClick={() => handleThemeChange("dark")}
      >
        <FontAwesomeIcon icon={faMoon} className="w-4 mr-0.5" /> Dark
      </SourcifyMenuItem>
      <SourcifyMenuItem
        checked={theme === "system"}
        onClick={() => handleThemeChange("system")}
      >
        <FontAwesomeIcon icon={faDisplay} className="w-4 mr-0.5" /> System
      </SourcifyMenuItem>
    </>
  );
};

export default ThemeToggler;
