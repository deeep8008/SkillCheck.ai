import { useState } from "react";
import { googleAuth } from "../services/auth.api";

export default function GoogleAuthButton({ mode = "login", onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  function handleGoogleClick() {
    if (loading) return;

    if (!clientId) {
      onError?.("Google Client ID is not configured.");
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      onError?.("Google authentication is still initializing. Please wait a second and try again.");
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: async (tokenResponse) => {
          if (tokenResponse?.error) {
            onError?.(tokenResponse.error_description || "Google authorization was cancelled.");
            return;
          }

          if (tokenResponse?.access_token) {
            setLoading(true);
            try {
              const data = await googleAuth({
                accessToken: tokenResponse.access_token,
                mode
              });
              onSuccess?.(data);
            } catch (err) {
              onError?.(err.response?.data?.message || "Google authentication failed. Please try again.");
            } finally {
              setLoading(false);
            }
          }
        },
        error_callback: (err) => {
          onError?.(err?.message || "Could not open Google Sign-In window.");
        }
      });

      client.requestAccessToken();
    } catch (err) {
      onError?.("Failed to launch Google authentication. Please try again.");
    }
  }

  const label = mode === "register" ? "INITIALIZE WITH GOOGLE" : "CONTINUE WITH GOOGLE";

  return (
    <div className="w-full">
      {/* Divider */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800" />
        </div>
        <div className="relative bg-neutral-900/90 px-3 font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
          Or authorize via
        </div>
      </div>

      {/* Cyberpunk HUD Styled Button */}
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={loading}
        className="group relative flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden border border-neutral-800 bg-neutral-950/90 py-3.5 px-4 text-xs font-bold tracking-widest text-white uppercase shadow-sm transition-all duration-300 hover:border-red-500 hover:bg-neutral-900/90 hover:shadow-[0_0_25px_rgba(239,68,68,0.25)] focus:border-red-500 focus:outline-none active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
      >
        {/* HUD Corner Accents */}
        <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-2 w-2 border-t border-l border-neutral-700 transition-colors group-hover:border-red-500" />
        <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 h-2 w-2 border-t border-r border-neutral-700 transition-colors group-hover:border-red-500" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-neutral-700 transition-colors group-hover:border-red-500" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-neutral-700 transition-colors group-hover:border-red-500" />

        {/* Hover Sweep Effect */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-red-500/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />

        {/* Google SVG Icon */}
        <svg
          className="relative z-10 h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110"
          viewBox="0 0 24 24"
        >
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
          />
          <path
            fill="#FBBC05"
            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.4 7.5 23 12 23z"
          />
        </svg>

        <span className="relative z-10 flex items-center gap-2">
          {loading ? "AUTHORIZING..." : label}
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
            &rarr;
          </span>
        </span>
      </button>
    </div>
  );
}
