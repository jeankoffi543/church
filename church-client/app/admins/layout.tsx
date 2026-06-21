import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration · MFM Ficgayo",
  // Keep the backoffice out of search engines.
  robots: { index: false, follow: false },
};

/**
 * Top-level shell for the entire `/admins` zone. Authenticated panel pages add
 * their own sidebar via the `(panel)` route group; the login screen renders
 * directly inside this neutral backoffice background.
 */
export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-[#f4f3f8] text-indigo">{children}</div>;
}
