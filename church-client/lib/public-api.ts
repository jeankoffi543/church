// Client-side calls to the public Laravel API (no auth, no next/headers), used
// by interactive public forms such as the ministry recruitment dialog.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type MinistryApplicationPayload = {
  name: string;
  email: string;
  phone: string;
  ministry_id: number;
  motivation: string;
};

/** Outcome of a submission: a brand-new application, or an existing one. */
export type SubmitResult = {
  created: boolean;
  status: ApplicationStatus;
  message: string;
};

/** One row returned by the status lookup. */
export type ApplicationStatusItem = {
  ministry: string | null;
  status: ApplicationStatus;
  /** Motif shared by the validator — only present when made public. */
  decision_note: string | null;
  created_at: string | null;
};

/** Laravel validation error shape: { field: [messages] }. */
export type ValidationErrors = Record<string, string[]>;

export class ApiValidationError extends Error {
  constructor(public errors: ValidationErrors) {
    super("VALIDATION_ERROR");
    this.name = "ApiValidationError";
  }
}

async function readError(res: Response): Promise<never> {
  if (res.status === 422) {
    const body = (await res.json()) as { errors?: ValidationErrors };
    throw new ApiValidationError(body.errors ?? {});
  }
  let message = `La demande a échoué (code ${res.status}).`;
  try {
    const body = (await res.json()) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    // keep default message
  }
  throw new Error(message);
}

/**
 * Submit a ministry recruitment application. Returns the outcome — note that an
 * already-existing application resolves successfully with `created: false` and
 * the current status. Throws `ApiValidationError` on a 422.
 */
export async function submitMinistryApplication(
  payload: MinistryApplicationPayload
): Promise<SubmitResult> {
  const res = await fetch(`${API_URL}/public/ministries/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return readError(res);

  const body = (await res.json()) as SubmitResult;
  return body;
}

/**
 * Look up the status of a candidate's applications by their email or phone.
 */
export async function checkMinistryApplicationStatus(
  contact: string
): Promise<ApplicationStatusItem[]> {
  const res = await fetch(`${API_URL}/public/ministries/applications/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ contact }),
  });

  if (!res.ok) return readError(res);

  const body = (await res.json()) as { data: ApplicationStatusItem[] };
  return body.data;
}

export type ContactMessagePayload = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export async function submitContactMessage(
  payload: ContactMessagePayload
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/public/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return readError(res);

  const body = (await res.json()) as { message: string };
  return body;
}
