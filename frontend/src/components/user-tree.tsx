"use client";

import { Building2, Crown, Network, Shield, User as UserIcon, Users } from "lucide-react";
import type { Organisation, OrgUser } from "@/lib/auth";

function UserCard({ u, onClick }: { u: OrgUser; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2 text-left shadow-sm hover:shadow-md transition min-w-[220px] ${
        u.is_admin ? "border-amber-300" : "border-slate-200"
      }`}
    >
      <span
        className={`h-8 w-8 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center ${
          u.is_admin ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
        }`}
      >
        {u.email[0]?.toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900 truncate max-w-[190px]">{u.email}</span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${u.is_admin ? "text-amber-700" : "text-slate-500"}`}>
          {u.is_admin ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
          {u.is_admin ? "Admin" : "Member"}
        </span>
      </span>
    </button>
  );
}

function BranchCard({
  icon, title, sub, count, tone, onClick,
}: {
  icon: React.ReactNode; title: string; sub: string; count: number; tone: "org" | "platform"; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 shadow-sm text-left min-w-[240px] ${
        tone === "org" ? "border-indigo-200 hover:border-indigo-400" : "border-amber-200"
      } ${onClick ? "hover:shadow-md cursor-pointer" : "cursor-default"} transition`}
    >
      <span className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone === "org" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 truncate max-w-[170px]">{title}</span>
        <span className="block text-xs text-slate-500">{sub}</span>
      </span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">{count}</span>
    </button>
  );
}

export default function UserTree({
  orgs,
  unassigned,
  onOpenOrg,
}: {
  orgs: Organisation[];
  unassigned: OrgUser[];
  onOpenOrg: (orgId: string) => void;
}) {
  const allUsers = [...unassigned, ...orgs.flatMap((o) => o.users)];
  const admins = allUsers.filter((u) => u.is_admin).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Network className="h-4 w-4 text-indigo-500" /> Organisation tree
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-100 border border-amber-300" /> Admin
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-indigo-100 border border-indigo-300" /> Member
          </span>
          <span>Click an organisation to manage it</span>
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-8">
        <ul className="org-tree min-w-max mx-auto">
          <li>
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white px-6 py-4 shadow-md min-w-[260px] text-center">
              <div className="flex items-center justify-center gap-2 text-base font-semibold">
                <Crown className="h-4 w-4" /> RFI System
              </div>
              <div className="mt-1 text-xs text-indigo-100">
                {orgs.length} organisation{orgs.length === 1 ? "" : "s"} · {allUsers.length} user{allUsers.length === 1 ? "" : "s"} · {admins} admin{admins === 1 ? "" : "s"}
              </div>
            </div>

            {(orgs.length > 0 || unassigned.length > 0) && (
              <ul>
                {unassigned.length > 0 && (
                  <li>
                    <BranchCard
                      tone="platform"
                      icon={<Shield className="h-5 w-5" />}
                      title="Platform"
                      sub="Not in an organisation"
                      count={unassigned.length}
                    />
                    <div className="org-users">
                      {unassigned.map((u) => (
                        <UserCard key={u.id} u={u} />
                      ))}
                    </div>
                  </li>
                )}
                {orgs.map((o) => (
                  <li key={o.id}>
                    <BranchCard
                      tone="org"
                      icon={<Building2 className="h-5 w-5" />}
                      title={o.name}
                      sub={`Created by ${o.created_by}`}
                      count={o.users.length}
                      onClick={() => onOpenOrg(o.id)}
                    />
                    <div className="org-users">
                      {o.users.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400 min-w-[220px]">
                          <Users className="h-3.5 w-3.5" /> No users yet
                        </div>
                      ) : (
                        o.users.map((u) => <UserCard key={u.id} u={u} onClick={() => onOpenOrg(o.id)} />)
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
