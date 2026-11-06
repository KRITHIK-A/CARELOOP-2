import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Bot,
  ChevronDown,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Settings,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { useApp } from "@/app/AppStore";
import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["supervisor"] },
  { to: "/doctor", label: "My dashboard", icon: Stethoscope, roles: ["doctor"] },
  { to: "/nurse", label: "My dashboard", icon: Activity, roles: ["nurse"] },
  {
    to: "/tasks",
    label: "Task management",
    icon: ClipboardCheck,
    roles: ["supervisor", "doctor", "nurse"],
  },
  {
    to: "/calling",
    label: "AI Calling Center",
    icon: Bot,
    roles: ["supervisor", "doctor", "nurse"],
    featured: true,
  },
  { to: "/patients", label: "Patients", icon: Users, roles: ["supervisor", "doctor", "nurse"] },
  {
    to: "/handover",
    label: "Shift handover",
    icon: ArrowLeftRight,
    roles: ["supervisor", "doctor", "nurse"],
  },
  {
    to: "/calls",
    label: "Call history",
    icon: FileClock,
    roles: ["supervisor", "doctor", "nurse"],
  },
  { to: "/reports", label: "Reports & analytics", icon: BarChart3, roles: ["supervisor"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["supervisor"] },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-900/20">
        <Activity size={20} strokeWidth={2.5} />
      </div>
      {!compact && (
        <div>
          <div className="text-[17px] font-bold tracking-tight text-white">
            CareLoop <span className="text-cyan-300">AI</span>
          </div>
          <div className="text-[9px] font-medium uppercase tracking-[.15em] text-slate-400">
            Clinical intelligence
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const { currentUser, setRole, notifications, markNotificationsRead, signOut } = useApp();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState(false);
  const [notifs, setNotifs] = useState(false);
  const [now, setNow] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const roleNav = nav.filter((x) => x.roles.includes(currentUser.role));
  const switchRole = (role: UserRole) => {
    setRole(role);
    navigate(role === "supervisor" ? "/dashboard" : `/${role}`);
    setProfile(false);
  };
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      {mobile && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#071a33] transition-all duration-200",
          collapsed ? "w-[76px]" : "w-[248px]",
          mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-white/8 px-5">
          <Logo compact={collapsed} />
          {!collapsed && (
            <button className="text-slate-400 lg:hidden" onClick={() => setMobile(false)}>
              <X size={20} />
            </button>
          )}
        </div>
        <div className="mx-3 mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/8 p-3">
          {collapsed ? (
            <span className="mx-auto block size-2 animate-pulse rounded-full bg-emerald-400" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                AI Voice Agent online
              </div>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">
                Sarvam-ready demo environment
              </p>
            </>
          )}
        </div>
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">
              Workspace
            </div>
          )}
          {roleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-950/20"
                    : "text-slate-400 hover:bg-white/6 hover:text-white",
                  item.featured && !location.pathname.startsWith("/calling") && "text-cyan-300",
                )
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {item.featured && !collapsed && (
                <span className="ml-auto rounded bg-cyan-300/15 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
                  CORE
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="m-3 hidden h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-400 hover:bg-white/5 hover:text-white lg:flex"
        >
          <PanelLeftClose size={18} className={cn(collapsed && "rotate-180")} />
          {!collapsed && "Collapse sidebar"}
        </button>
      </aside>
      <div
        className={cn("transition-all duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]")}
      >
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <button
              className="grid size-9 place-items-center rounded-lg border border-slate-200 lg:hidden"
              onClick={() => setMobile(true)}
            >
              <Menu size={19} />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {now.toLocaleDateString("en-IN", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Operations
                live
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="relative grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setNotifs((v) => !v);
                  markNotificationsRead();
                }}
              >
                <Bell size={19} />
                {notifications.some((n) => !n.read) && (
                  <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-red-500" />
                )}
              </button>
              {notifs && (
                <div className="absolute right-0 top-12 w-[330px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="flex items-center justify-between px-3 py-2">
                    <b className="text-sm">Notifications</b>
                    <span className="text-xs text-slate-400">{notifications.length} recent</span>
                  </div>
                  {notifications.slice(0, 4).map((n) => (
                    <div key={n.id} className="rounded-lg p-3 hover:bg-slate-50">
                      <p className="text-xs font-medium leading-5 text-slate-700">{n.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mx-1 h-7 w-px bg-slate-200" />
            <div className="relative">
              <button
                onClick={() => setProfile((v) => !v)}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50"
              >
                <div className="grid size-8 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                  {currentUser.initials ||
                    currentUser.name
                      .replace(/^(dr\.?|nurse)\s+/i, "")
                      .trim()
                      .split(/\s+/)
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() ||
                    "CS"}
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-semibold">
                    {currentUser.name || currentUser.full_name || "CareLoop Staff"}
                  </p>
                  <p className="text-[10px] font-medium capitalize text-slate-500">
                    {currentUser.role
                      ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
                      : "Supervisor"}
                  </p>
                </div>
                <ChevronDown size={14} className="hidden text-slate-400 md:block" />
              </button>
              {profile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfile(false)} />
                  <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <p className="text-xs font-bold text-slate-900">
                        {currentUser.name || "CareLoop Staff"}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {currentUser.email || "staff@careloop.org"}
                      </p>
                      <span className="mt-1.5 inline-block rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-700">
                        {currentUser.role
                          ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
                          : "Supervisor"}
                      </span>
                    </div>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch role view
                    </p>
                    {(["supervisor", "doctor", "nurse"] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => switchRole(role)}
                        className={cn(
                          "w-full rounded-lg px-3 py-1.5 text-left text-xs capitalize transition hover:bg-slate-50",
                          currentUser.role === role && "bg-blue-50 font-semibold text-blue-700",
                        )}
                      >
                        {role}
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (signOut) {
                            await signOut();
                          } else {
                            await supabase.auth.signOut();
                          }
                        } catch (err) {
                          console.warn("Sign out error:", err);
                        }
                        setProfile(false);
                        navigate("/login");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1500px] p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
