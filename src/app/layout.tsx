import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { IMPORTED_ON } from "@/lib/data";
import { CompareTray } from "@/components/compare-tray";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erasmus Mundus Explorer",
  description: "Explore, compare and check eligibility for Erasmus Mundus, MSCA, EIT and other European mobility programmes.",
};

const NAV = [
  { href: "/", label: "Explore" },
  { href: "/compare", label: "Compare" },
  { href: "/deadlines", label: "Deadlines" },
  { href: "/eligibility", label: "Eligibility" },
  { href: "/tracker", label: "Tracker" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <GraduationCap className="size-5 text-primary" />
              Mobility Explorer
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-32 pt-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-28 text-xs text-muted-foreground">
          Catalogue data imported {IMPORTED_ON}. Not an official EU service. Always confirm requirements and deadlines on each programme&apos;s official website.
        </footer>
        <CompareTray />
      </body>
    </html>
  );
}
