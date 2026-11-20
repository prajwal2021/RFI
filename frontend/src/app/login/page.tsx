"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Headset, LineChart, Sparkles } from "lucide-react";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  };

  const input =
    "w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-volt-500/20 focus:border-volt-500";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-forest-800 via-forest-900 to-forest-950 text-white p-12 flex-col justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-volt-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-sand-300/15 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-volt-500 to-volt-700 flex items-center justify-center shadow-lg shadow-black/20">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-bold tracking-tight">TTU Online <span className="font-medium text-forest-200">RFI</span></span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Every inquiry, <span className="text-volt-300">one place.</span>
          </h2>
          <p className="mt-4 text-base text-forest-100/80">
            Build request-for-information forms, follow every response, and hand people to the Call Center without losing the thread.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              [ClipboardCheck, "Forms and responses tracked like a spreadsheet"],
              [Headset, "A Call Center with queues, callbacks and handoffs"],
              [LineChart, "Live dashboards for every form and workspace"],
              [Sparkles, "Notifications the moment work is assigned to you"],
            ].map(([Icon, text]: any) => (
              <li key={text} className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-sand-100" />
                </span>
                <span className="text-sand-100">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-forest-200/70">Texas Tech University Online</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 bg-background">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-volt-500 to-volt-700 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">RFI System</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-forest-950">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your email and password to continue.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
                placeholder="you@company.com"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-lg bg-forest-800 text-white text-sm font-semibold shadow-md shadow-forest-900/20 transition hover:bg-forest-900 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
