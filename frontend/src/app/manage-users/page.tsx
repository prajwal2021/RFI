"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft, Building2, KeyRound, Plus, Shield, ShieldAlert, Trash2, UserPlus, Users,
} from "lucide-react";
import AppHeader from "@/components/app-header";
import {
  Organisation, addOrgUser, createOrg, deleteOrg, fetchOrgs, isAdmin, removeOrgUser, renameOrg,
  resetOrgUserPassword,
} from "@/lib/auth";

const input =
  "w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

export default function ManageUsersPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showNewOrg, setShowNewOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState("");

  useEffect(() => {
    setAllowed(isAdmin());
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchOrgs();
      setOrgs(data);
      setSelectedId((cur) => (cur && data.some((o) => o.id === cur) ? cur : data[0]?.id ?? null));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organisations");
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const run = async (fn: () => Promise<void>, success?: string) => {
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (success) setNotice(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  if (allowed === null) return null;
  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white border border-slate-200 rounded-xl shadow-sm p-10 max-w-sm">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Admin access required</h1>
          <p className="text-sm text-slate-500 mb-5">Only administrators can manage organisations and users.</p>
          <button onClick={() => router.push("/")} className="text-sm font-medium text-primary hover:underline">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const org = orgs.find((o) => o.id === selectedId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader
        left={
          <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        }
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Manage users</h1>
          <p className="text-sm text-slate-500">Create organisations and add the people who belong to them.</p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
          {/* Organisations */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Organisations</h2>
              <button
                onClick={() => setShowNewOrg(!showNewOrg)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            </div>
            {showNewOrg && (
              <div className="p-3 border-b border-slate-100 bg-slate-50/60">
                <input
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Organisation name"
                  className={input}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newOrgName.trim()) {
                      run(async () => {
                        const created = await createOrg(newOrgName.trim());
                        setNewOrgName("");
                        setShowNewOrg(false);
                        await load();
                        setSelectedId(created.id);
                      });
                    }
                  }}
                />
                <button
                  disabled={!newOrgName.trim()}
                  onClick={() =>
                    run(async () => {
                      const created = await createOrg(newOrgName.trim());
                      setNewOrgName("");
                      setShowNewOrg(false);
                      await load();
                      setSelectedId(created.id);
                    })
                  }
                  className="mt-2 w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  Create organisation
                </button>
              </div>
            )}
            {orgs.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                No organisations yet.
              </div>
            ) : (
              <ul className="p-2">
                {orgs.map((o) => (
                  <li key={o.id}>
                    <button
                      onClick={() => {
                        setSelectedId(o.id);
                        setRenaming(false);
                        setResetFor(null);
                      }}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left ${selectedId === o.id ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      <span className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-indigo-500" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{o.name}</span>
                        <span className="block text-xs text-slate-400">
                          {o.users.length} user{o.users.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Members */}
          {org ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  {renaming ? (
                    <div className="flex items-center gap-2">
                      <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className={`${input} w-64`} autoFocus />
                      <button
                        onClick={() =>
                          run(async () => {
                            await renameOrg(org.id, renameValue.trim());
                            setRenaming(false);
                            await load();
                          })
                        }
                        className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                      >
                        Save
                      </button>
                      <button onClick={() => setRenaming(false)} className="h-9 px-3 rounded-lg border border-slate-300 text-sm text-slate-600">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{org.name}</h2>
                      <p className="text-xs text-slate-500">
                        Created {format(new Date(org.created_at), "MMM d, yyyy")} by {org.created_by}
                      </p>
                    </div>
                  )}
                  {!renaming && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRenameValue(org.name);
                          setRenaming(true);
                        }}
                        className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete organisation "${org.name}"?`)) run(async () => { await deleteOrg(org.id); await load(); });
                        }}
                        className="h-8 w-8 rounded-lg border border-slate-300 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center"
                        title="Delete organisation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {org.users.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No users in this organisation yet.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                        <th className="px-5 py-2.5 font-medium">User</th>
                        <th className="px-5 py-2.5 font-medium">Role</th>
                        <th className="px-5 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {org.users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 last:border-0 align-middle">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center">
                                {u.email[0]?.toUpperCase()}
                              </span>
                              <span className="font-medium text-slate-900">{u.email}</span>
                            </div>
                            {resetFor === u.id && (
                              <div className="mt-2 flex items-center gap-2 pl-11">
                                <input
                                  type="password"
                                  value={resetValue}
                                  onChange={(e) => setResetValue(e.target.value)}
                                  placeholder="New password (min 8 characters)"
                                  className={`${input} max-w-xs`}
                                  autoComplete="new-password"
                                />
                                <button
                                  disabled={resetValue.length < 8}
                                  onClick={() =>
                                    run(async () => {
                                      await resetOrgUserPassword(org.id, u.id, resetValue);
                                      setResetFor(null);
                                      setResetValue("");
                                    }, `Password updated for ${u.email}`)
                                  }
                                  className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                                >
                                  Set
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {u.is_admin ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-medium">
                                <Shield className="h-3 w-3" /> Admin
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-xs font-medium">Member</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setResetFor(resetFor === u.id ? null : u.id);
                                  setResetValue("");
                                }}
                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                                title="Reset password"
                              >
                                <KeyRound className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${u.email}?`)) run(async () => { await removeOrgUser(org.id, u.id); await load(); });
                                }}
                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                                title="Remove user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await addOrgUser(org.id, email.trim(), password, makeAdmin);
                    setEmail("");
                    setPassword("");
                    setMakeAdmin(false);
                    await load();
                  }, `User added to ${org.name}`);
                }}
                className="rounded-xl border border-slate-200 bg-white shadow-sm p-5"
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-4">
                  <UserPlus className="h-4 w-4 text-indigo-500" /> Add a user to {org.name}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="name@company.com" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Temporary password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={input}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={makeAdmin} onChange={(e) => setMakeAdmin(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                    Make this user an admin
                  </label>
                  <button type="submit" className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:opacity-90">
                    Add user
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center text-sm text-slate-400">
              Create an organisation to start adding users.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
