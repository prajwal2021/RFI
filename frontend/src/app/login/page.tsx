"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, ClipboardCheck, FolderTree, ShieldCheck } from "lucide-react";
import { login } from "@/lib/auth";

const FEATURES = [
  { icon: <FolderTree className="h-4 w-4" />, text: "Organise forms in private or organisation workspaces" },
  { icon: <BarChart3 className="h-4 w-4" />, text: "Track responses with live activity charts" },
  { icon: <ShieldCheck className="h-4 w-4" />, text: "Role-based access for your whole team" },
];

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
    "w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-12 text-white">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">RFI System</span>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Collect, track and act on
            <br />
            every request for information.
          </h2>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-3 text-indigo-50">
                <span className="mt-0.5 h-7 w-7 rounded-md bg-white/15 flex items-center justify-center shrink-0">{f.icon}</span>
                <span className="text-sm leading-6">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-indigo-200">© {new Date().getFullYear()} RFI System</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">RFI System</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
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
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
