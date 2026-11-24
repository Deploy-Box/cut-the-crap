import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cut The Crap",
  description: "Paste a recipe URL and get just the recipe.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="site">
            <SiteHeader />
            {children}
            <footer className="site-footer">
              <span>Less scrolling. More cooking.</span>
              <nav aria-label="Footer navigation">
                <Link href="/feedback">Feedback</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
              </nav>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
