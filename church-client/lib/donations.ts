// Client-side helpers for the public Paystack donation flow.

import { tenantApiBase } from "@/lib/tenant/api-base";

export type DonationFrequency = "unique" | "mensuel";

export type DonationInitInput = {
  donor_name: string;
  donor_email: string;
  donor_phone?: string;
  purpose_key: string;
  amount: number;
  frequency: DonationFrequency;
};

export type DonationInit = {
  reference: string;
  public_key: string | null;
  email: string;
  amount: number;
  currency: string;
  purpose_key: string;
};

export type DonationStatusValue = "pending" | "success" | "failed";

export type DonationStatusResult = {
  reference: string;
  status: DonationStatusValue;
  amount: number;
  currency: string;
  purpose_key: string;
};

/** Open a transaction server-side; returns the keys for the Paystack popup. */
export async function initializeDonation(input: DonationInitInput): Promise<DonationInit> {
  const res = await fetch(`${await tenantApiBase()}/public/donations/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Initialisation du don impossible.");
  }
  return ((await res.json()) as { data: DonationInit }).data;
}

/** Poll the accounting status (the webhook flips it to `success`). */
export async function getDonationStatus(reference: string): Promise<DonationStatusResult> {
  const res = await fetch(`${await tenantApiBase()}/public/donations/${reference}/status`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Statut indisponible.");
  return ((await res.json()) as { data: DonationStatusResult }).data;
}
