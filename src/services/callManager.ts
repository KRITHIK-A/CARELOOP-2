/**
 * Dual-Mode Call Manager
 *
 * Mode A — Real Sarvam Call: triggers outbound API; works when PSTN/Exotel is wired.
 * Mode B — Hackathon Demo Modal: opens interactive simulation when no telephony is available.
 */

import { triggerSarvamCall, type SarvamCallParams } from "./sarvamApi";

export type CallMode = "real" | "demo";

export interface CallRequest {
  taskId: string;
  taskDescription: string;
  staffName: string;
  staffPhone: string;
  patientId: string;
  callType: "reminder" | "verification";
}

export interface CallManagerResult {
  mode: CallMode;
  /** Present when mode === "real" and call was successfully initiated */
  sarvamCallId?: string;
  /** Human-readable reason we fell back to demo */
  fallbackReason?: string;
}

/**
 * Decide whether to place a real Sarvam call or open the demo modal.
 * Always resolves — never throws.
 */
export async function initiateCall(req: CallRequest): Promise<CallManagerResult> {
  const params: SarvamCallParams = {
    phoneNumber: req.staffPhone,
    taskId: req.taskId,
    taskDescription: req.taskDescription,
    staffName: req.staffName,
    patientId: req.patientId,
    callType: req.callType,
  };

  const result = await triggerSarvamCall(params);

  if (result.success && result.callId) {
    return { mode: "real", sarvamCallId: result.callId };
  }

  // Any failure → hackathon demo modal
  return {
    mode: "demo",
    fallbackReason: result.error ?? "Telephony not configured",
  };
}

/** Pre-canned AI opening lines keyed by call type */
export function getAIOpeningLine(callType: "reminder" | "verification", taskDescription: string): string {
  if (callType === "reminder") {
    return `Hello, this is CareLoop AI. You have a care task scheduled: "${taskDescription}". This call is a reminder — please acknowledge when you are ready to proceed.`;
  }
  return `Hello, this is CareLoop AI following up on "${taskDescription}". Has this task been completed? Please respond with yes or no.`;
}

/** Map demo response choice → simulateCall outcome string */
export type DemoOutcome = "completed" | "pending" | "no-answer" | "assistance" | "reminder";

export const DEMO_RESPONSES: {
  label: string;
  sublabel: string;
  outcome: DemoOutcome;
  staffReply: string;
  tone: "primary" | "secondary" | "danger" | "ghost";
}[] = [
  {
    label: "✅  Task Completed",
    sublabel: "\"Yes, done 5 minutes ago.\"",
    outcome: "completed",
    staffReply: "Yes, completed. Administered about 5 minutes ago.",
    tone: "primary",
  },
  {
    label: "⏳  Not Yet / Delay",
    sublabel: "\"Patient was sleeping.\"",
    outcome: "pending",
    staffReply: "Not yet — patient was sleeping. Will do shortly.",
    tone: "secondary",
  },
  {
    label: "📵  No Answer",
    sublabel: "Simulate missed call",
    outcome: "no-answer",
    staffReply: "",
    tone: "ghost",
  },
  {
    label: "🚨  Request Assistance",
    sublabel: "\"Need help — escalate.\"",
    outcome: "assistance",
    staffReply: "I need assistance. Please escalate to the supervisor.",
    tone: "danger",
  },
];
