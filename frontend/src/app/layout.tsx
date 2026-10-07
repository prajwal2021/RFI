import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthGate } from "@/providers/auth-gate";

export const metadata: Metadata = {
  title: "RFI System",
  description: "Request for Information Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthGate>{children}</AuthGate>
        </QueryProvider>
      </body>
    </html>
  );
}
