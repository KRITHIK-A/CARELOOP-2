import { AlertTriangle, CheckCircle2, Clock3, PhoneCall, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { Priority, TaskStatus } from "@/types";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-blue-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[28px]">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  tone?: "blue" | "teal" | "amber" | "red" | "slate";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {detail && <p className="mt-1 text-[11px] text-slate-400">{detail}</p>}
        </div>
        {icon && (
          <div className={cn("grid size-9 place-items-center rounded-lg", colors[tone])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
export function StatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, string> = {
    pending: "border-slate-200 bg-slate-50 text-slate-600",
    acknowledged: "border-blue-200 bg-blue-50 text-blue-700",
    "self-reported": "border-violet-200 bg-violet-50 text-violet-700",
    verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
    overdue: "border-red-200 bg-red-50 text-red-700",
    issue: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return <Badge className={map[status]}>{status.replace("-", " ")}</Badge>;
}
export function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    low: "border-slate-200 text-slate-500",
    medium: "border-blue-200 bg-blue-50 text-blue-700",
    high: "border-amber-200 bg-amber-50 text-amber-700",
    critical: "border-red-200 bg-red-50 text-red-700",
  };
  return <Badge className={map[priority]}>{priority}</Badge>;
}
export function Empty({ text }: { text: string }) {
  return <div className="grid min-h-40 place-items-center text-sm text-slate-400">{text}</div>;
}
export const icons = {
  check: <CheckCircle2 size={18} />,
  clock: <Clock3 size={18} />,
  phone: <PhoneCall size={18} />,
  alert: <AlertTriangle size={18} />,
  shield: <ShieldCheck size={18} />,
};
