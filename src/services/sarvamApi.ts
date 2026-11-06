/**
 * Sarvam AI Outbound Call API Service
 * Targets: https://apps.sarvam.ai/api/outbounds/v1/orgs/{org}/workspaces/{ws}/outbounds
 */

const SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY as string;
const SARVAM_ORG_ID = import.meta.env.VITE_SARVAM_ORG_ID as string;
const SARVAM_WORKSPACE_ID = import.meta.env.VITE_SARVAM_WORKSPACE_ID as string;
const SARVAM_APP_ID = import.meta.env.VITE_SARVAM_APP_ID as string;

const OUTBOUND_URL = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${SARVAM_ORG_ID}/workspaces/${SARVAM_WORKSPACE_ID}/outbounds`;

export interface SarvamCallParams {
  /** E.164 phone number, e.g. +919876543210 */
  phoneNumber: string;
  taskId: string;
  taskDescription: string;
  staffName: string;
  patientId: string;
  callType: "reminder" | "verification";
}

export interface SarvamCallResult {
  success: boolean;
  callId?: string;
  /** Set when no PSTN/Exotel telephony connection is available; triggers demo fallback */
  noTelephony?: boolean;
  error?: string;
}

/**
 * Trigger a real outbound voice call via Sarvam AI.
 * Falls back gracefully when PSTN / Exotel is not configured.
 */
export async function triggerSarvamCall(params: SarvamCallParams): Promise<SarvamCallResult> {
  if (!SARVAM_API_KEY || !SARVAM_ORG_ID || !SARVAM_WORKSPACE_ID || !SARVAM_APP_ID) {
    console.warn("[Sarvam] Missing env vars — switching to demo mode.");
    return { success: false, noTelephony: true, error: "Missing Sarvam environment variables" };
  }

  try {
    const body = {
      app_id: SARVAM_APP_ID,
      phone_number: params.phoneNumber,
      variables: {
        task_id: params.taskId,
        task_description: params.taskDescription,
        staff_name: params.staffName,
        patient_id: params.patientId,
        call_type: params.callType,
      },
    };

    const response = await fetch(OUTBOUND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": SARVAM_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 404 || response.status === 503) {
      // No telephony / PSTN not configured — expected in hackathon environment
      console.warn(`[Sarvam] HTTP ${response.status} — no telephony configured, using demo mode.`);
      return { success: false, noTelephony: true, error: `HTTP ${response.status}` };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`[Sarvam] API error ${response.status}: ${text}`);
      return {
        success: false,
        noTelephony: false,
        error: `Sarvam API error ${response.status}: ${text}`,
      };
    }

    const data = (await response.json()) as { call_id?: string; id?: string };
    const callId = data.call_id ?? data.id ?? crypto.randomUUID();
    console.info(`[Sarvam] Call initiated — ID: ${callId}`);
    return { success: true, callId };
  } catch (err) {
    // Network error (CORS, offline, etc.) — treat as no-telephony to show demo modal
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Sarvam] Network/CORS error (expected in hackathon):", msg);
    return { success: false, noTelephony: true, error: msg };
  }
}
