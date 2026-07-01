import { FC, useEffect, useRef } from "react";
import { useLocation } from "react-router";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Pushes a virtual pageview into the GTM dataLayer on every client-side route
 * change. GTM/GA4 only observe the initial document load on their own, so
 * history-based (pushState) SPA navigation must be reported explicitly.
 *
 * Renders nothing. Must be mounted inside a Router so useLocation() works.
 * The useEffect never runs during SSR, so this is a no-op on the server.
 */
const RouteChangeTracker: FC = () => {
  const location = useLocation();
  // Skip the first fire: the initial page load is already counted by the GTM
  // snippet / GA4 config tag, so pushing here as well would double-count it.
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "page_view",
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  return null;
};

export default RouteChangeTracker;
