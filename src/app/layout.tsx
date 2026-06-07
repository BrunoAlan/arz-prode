import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignInButton";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Arz Prode · Mundial 2026",
  description: "El prode interno de Arzion para el Mundial 2026",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background font-sans text-foreground antialiased"
      >
        {session?.user && (
          <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
            <nav className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
              <Link
                href="/predicciones"
                className="font-display text-lg font-semibold tracking-tight"
              >
                Arz Prode<span className="text-primary">.</span>
              </Link>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link href="/predicciones" className="transition-colors hover:text-foreground">
                  Predicciones
                </Link>
                <Link href="/llaves" className="transition-colors hover:text-foreground">
                  Llaves
                </Link>
                <Link href="/posiciones" className="transition-colors hover:text-foreground">
                  Posiciones
                </Link>
                <Link href="/ranking" className="transition-colors hover:text-foreground">
                  Ranking
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="transition-colors hover:text-foreground">
                    Admin
                  </Link>
                )}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {session.user.name}
                </span>
                <SignOutButton />
              </div>
            </nav>
          </header>
        )}
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
