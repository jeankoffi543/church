// Minimal typed surface for the Paystack Inline popup
// (loaded from https://js.paystack.co/v1/inline.js).

export type PaystackSetupOptions = {
  key: string;
  email: string;
  /** Amount in the currency subunit (i.e. real amount × 100). */
  amount: number;
  currency?: string;
  ref?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
  callback?: (response: { reference: string }) => void;
  onClose?: () => void;
};

export type PaystackHandler = { openIframe(): void };

declare global {
  interface Window {
    PaystackPop?: { setup(options: PaystackSetupOptions): PaystackHandler };
  }
}

export {};
