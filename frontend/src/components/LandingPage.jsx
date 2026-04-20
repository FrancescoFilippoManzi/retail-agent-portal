import { useEffect, useRef } from "react";

/**
 * LandingPage
 * Renders circe_landing.html in a full-screen iframe.
 * When a tile is clicked inside the iframe it fires postMessage
 * { type: 'circe-navigate', tab: '<tabId>' } which we catch here
 * and forward to the parent via onNavigate(tabId).
 */
export default function LandingPage({ onNavigate, onEnter }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    function handleMessage(e) {
      if (e.data?.type === "circe-enter") {
        onEnter?.();
      } else if (e.data?.type === "circe-navigate" && e.data.tab) {
        onNavigate(e.data.tab);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onNavigate, onEnter]);

  return (
    <iframe
      ref={iframeRef}
      src="/circe_landing.html"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
        zIndex: 10,
      }}
      title="Circe"
    />
  );
}
