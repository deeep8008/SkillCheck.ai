import { useEffect, useRef, useState } from "react";
import { googleAuth } from "../services/auth.api";

export default function GoogleAuthButton({ onSuccess, onError }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      console.warn("VITE_GOOGLE_CLIENT_ID is not set.");
      return;
    }

    let interval;
    function initGoogle() {
      if (window.google?.accounts?.id && containerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              if (!response?.credential) return;
              setLoading(true);
              try {
                const data = await googleAuth({ credential: response.credential });
                onSuccess?.(data);
              } catch (err) {
                onError?.(err.response?.data?.message || "Google sign-in failed. Please try again.");
              } finally {
                setLoading(false);
              }
            }
          });

          // Clear any previous render
          containerRef.current.innerHTML = "";

          window.google.accounts.id.renderButton(containerRef.current, {
            theme: "filled_black",
            size: "large",
            width: "100%",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left"
          });

          return true;
        } catch (e) {
          console.error("Error rendering Google Sign-In button:", e);
        }
      }
      return false;
    }

    if (!initGoogle()) {
      interval = setInterval(() => {
        if (initGoogle()) clearInterval(interval);
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [clientId, onSuccess, onError]);

  return (
    <div className="w-full">
      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800" />
        </div>
        <div className="relative bg-neutral-900/90 px-3 font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
          Or authorize via
        </div>
      </div>

      <div className="relative min-h-[44px] flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/80 text-xs text-red-400">
            Verifying with Google…
          </div>
        )}
        <div ref={containerRef} className="w-full flex justify-center [&>div]:w-full" />
      </div>
    </div>
  );
}
