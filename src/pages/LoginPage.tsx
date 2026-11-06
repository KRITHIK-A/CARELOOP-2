import { useState } from "react";
import { Activity, ArrowRight, Bot, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { useApp } from "@/app/AppStore";
import { Button, Input } from "@/components/ui";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

export function LoginPage() {
  const [role, setRole] = useState<UserRole>("supervisor");
  const { setRole: login } = useApp();
  const navigate = useNavigate();
  const submit = () => {
    login(role);
    navigate(role === "supervisor" ? "/dashboard" : `/${role}`);
  };
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#071a33] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-40 top-24 size-[430px] rounded-full border border-cyan-300/10" />
        <div className="absolute -right-24 top-40 size-[280px] rounded-full border border-cyan-300/10" />
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-blue-600">
            <Activity />
          </div>
          <div className="text-xl font-bold">
            CareLoop <span className="text-cyan-300">AI</span>
          </div>
        </div>
        <div className="relative max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
            <Bot size={14} />
            AI-powered clinical follow-through
          </div>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight">
            Every task remembered.
            <br />
            <span className="text-cyan-300">Every responsibility accounted for.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Voice agents call clinical staff before care tasks, follow up after scheduled times,
            understand responses, and keep supervisors informed.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              "Automated reminder calls",
              "Verbal task verification",
              "Live supervisor oversight",
              "Escalation workflows",
            ].map((x) => (
              <div key={x} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 size={16} className="text-cyan-300" />
                {x}
              </div>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} />
          Synthetic data demo · Built for secure healthcare workflows
        </p>
      </section>
      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Activity className="text-blue-600" />
              CareLoop AI
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Welcome back</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Sign in to your workspace</h2>
          <p className="mt-2 text-sm text-slate-500">
            Use the demo role selector to explore each clinical workflow.
          </p>
          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Email address
              </span>
              <Input type="email" defaultValue="maya@careloop.demo" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">Password</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input className="pl-9" type="password" defaultValue="careloopdemo" />
              </div>
            </label>
            <div>
              <span className="mb-2 block text-xs font-semibold text-slate-700">Explore as</span>
              <div className="grid grid-cols-3 gap-2">
                {(["supervisor", "doctor", "nurse"] as UserRole[]).map((x) => (
                  <button
                    key={x}
                    onClick={() => setRole(x)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-xs font-semibold capitalize transition",
                      role === x
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>
            <Button className="mt-2 h-11 w-full" onClick={submit}>
              Enter CareLoop AI <ArrowRight size={16} />
            </Button>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            Demo only. No real patient data or calls are used.
          </p>
        </div>
      </section>
    </div>
  );
}
