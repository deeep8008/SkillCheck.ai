import { useState } from "react";
import { login } from "../services/auth.api";
import { Link, useNavigate } from "react-router";

const Login = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const data = await login(values);
      setSuccess(data.message);
      form.reset();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to connect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 p-6 font-['Space_Grotesk',sans-serif] selection:bg-red-500 selection:text-white">
      {/* Subtle Futuristic Grid Background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

      {/* Ambient Red Glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/15 blur-[110px]" />

      <form
        className="relative z-10 w-full max-w-md border border-neutral-800/90 bg-neutral-900/75 p-6 shadow-[0_0_50px_-12px_rgba(220,38,38,0.2)] backdrop-blur-xl sm:p-10"
        onSubmit={handleSubmit}
      >
        {/* Top Glowing Accent Bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_2px_12px_rgba(220,38,38,0.8)]" />

        {/* HUD Corner Accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-red-500" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-red-500" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-red-500" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-red-500" />

        {/* Brand Header */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <p className="font-['Orbitron',sans-serif] text-xl font-extrabold tracking-wider text-white uppercase">
            SkillCheck<span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">.ai</span>
          </p>
          <span className="inline-flex items-center gap-1.5 border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-red-400 uppercase">
            <span className="h-1.5 w-1.5 motion-safe:animate-pulse rounded-full bg-red-500" />
            Sys.Auth
          </span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="font-['Orbitron',sans-serif] text-2xl font-bold tracking-wide text-white uppercase sm:text-3xl">
            System Login
          </h1>
          <p className="mt-1.5 text-xs tracking-wider text-neutral-400 uppercase">
            Enter credentials to initialize session
          </p>
        </div>

        {/* Username or Email Input */}
        <label className="group mb-6 block space-y-2 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
          <span className="transition-colors group-focus-within:text-red-400">
            Username or Email
          </span>
          <span className="relative block">
            <input
              type="text"
              name="identifier"
              autoComplete="username"
              placeholder="Username or email address"
              required
              className="w-full border border-neutral-800 bg-neutral-950/90 px-4 py-3 text-sm font-normal tracking-normal text-white placeholder:text-neutral-600 transition-all duration-200 focus:border-red-500 focus:bg-neutral-950 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)] focus:outline-none"
            />
            <span className="pointer-events-none absolute top-0 right-0 h-2 w-2 border-t border-r border-neutral-700 transition-colors group-focus-within:border-red-500" />
          </span>
        </label>

        {/* Password Input */}
        <label className="group mb-8 block space-y-2 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
          <span className="flex items-center justify-between">
            <span className="transition-colors group-focus-within:text-red-400">
              Password
            </span>
          </span>
          <span className="relative block">
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              required
              className="w-full border border-neutral-800 bg-neutral-950/90 px-4 py-3 text-sm font-normal tracking-normal text-white placeholder:text-neutral-600 transition-all duration-200 focus:border-red-500 focus:bg-neutral-950 focus:shadow-[0_0_15px_rgba(239,68,68,0.15)] focus:outline-none"
            />
            <span className="pointer-events-none absolute top-0 right-0 h-2 w-2 border-t border-r border-neutral-700 transition-colors group-focus-within:border-red-500" />
          </span>
        </label>

        {error && <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>}
        {success && <p role="status" className="mb-4 text-sm text-white">{success}</p>}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="disabled:cursor-wait disabled:opacity-60 group relative w-full cursor-pointer overflow-hidden bg-red-600 py-3.5 font-['Orbitron',sans-serif] text-sm font-bold tracking-widest text-white uppercase shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all duration-300 hover:bg-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500 active:scale-[0.99]"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isSubmitting ? "Signing in..." : "Authenticate"}
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">
              &rarr;
            </span>
          </span>
          {/* Hover Sweep Effect */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        </button>

        {/* Footer Link */}
        <p className="mt-8 border-t border-neutral-800/80 pt-6 text-center text-xs tracking-wide text-neutral-400">
          UNREGISTERED OPERATOR?{" "}
          <Link
            className="font-semibold text-red-400 underline decoration-red-500/40 underline-offset-4 transition-colors hover:text-red-300 hover:decoration-red-300"
            to="/register"
          >
            INITIALIZE ACCOUNT
          </Link>
        </p>
      </form>
    </main>
  );
};

export default Login;

