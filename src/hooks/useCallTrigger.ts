import { useState } from "react";
import { initiateCall, type DemoOutcome } from "@/services/callManager";
import type { Task, User } from "@/types";

interface ModalState {
  task: Task;
  staff: User;
  callType: "reminder" | "verification";
  fallbackReason?: string;
}

type SimulateOutcome = "reminder" | "completed" | "pending" | "no-answer" | "assistance";

/**
 * Coordinates the full call flow:
 *   1. Tries Sarvam real call via callManager
 *   2. Falls back to demo modal when no telephony is available
 *   3. Calls simulateCall() on completion so AppStore + Call History update live
 */
export function useCallTrigger(
  users: User[],
  simulateCall: (taskId: string, outcome: SimulateOutcome) => void,
) {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [loading, setLoading] = useState<string | null>(null); // taskId being initiated

  const triggerCall = async (task: Task, callType: "reminder" | "verification") => {
    const staff = users.find((u) => u.id === task.assigneeId);
    if (!staff) return;

    setLoading(task.id);

    const result = await initiateCall({
      taskId: task.id,
      taskDescription: task.description,
      staffName: staff.name,
      staffPhone: staff.phone,
      patientId: task.patientId,
      callType,
    });

    setLoading(null);

    if (result.mode === "real" && result.sarvamCallId) {
      // Real Sarvam call was placed — treat as a successful reminder/acknowledge immediately
      simulateCall(task.id, callType === "reminder" ? "reminder" : "completed");
      return;
    }

    // Demo mode — open interactive modal
    setModalState({
      task,
      staff,
      callType,
      fallbackReason: result.fallbackReason,
    });
  };

  const handleModalComplete = (outcome: DemoOutcome, _staffReply: string) => {
    if (!modalState) return;

    const mapped: SimulateOutcome =
      outcome === "completed"
        ? "completed"
        : outcome === "pending"
          ? "pending"
          : outcome === "no-answer"
            ? "no-answer"
            : outcome === "assistance"
              ? "assistance"
              : "reminder";

    simulateCall(modalState.task.id, mapped);
    setModalState(null);
  };

  return {
    triggerCall,
    loading,
    modalState,
    handleModalComplete,
    closeModal: () => setModalState(null),
  };
}
