import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loginErrorMessage } from "@/lib/access";
import { SignInButton } from "@/components/SignInButton";
import { LoginError } from "@/components/LoginError";

export default async function Home(props: PageProps<"/">) {
  const session = await auth();
  if (session?.user) redirect("/predicciones");
  const { error } = await props.searchParams;
  const errorMessage = loginErrorMessage(
    typeof error === "string" ? error : undefined,
  );
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
      <span className="animate-rise mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary" /> Mundial 2026
      </span>
      <h1
        className="animate-rise font-display text-6xl font-semibold tracking-tight"
        style={{ animationDelay: "60ms" }}
      >
        Arz Prode<span className="text-primary">.</span>
      </h1>
      <p
        className="animate-rise mt-4 text-lg text-muted-foreground"
        style={{ animationDelay: "120ms" }}
      >
        El prode interno de Arzion. Pronosticá cada partido, sumá puntos y peleá la punta del ranking.
      </p>
      {errorMessage && (
        <div
          className="animate-rise mt-8 w-full max-w-sm"
          style={{ animationDelay: "160ms" }}
        >
          <LoginError message={errorMessage} />
        </div>
      )}
      <div className="animate-rise mt-8" style={{ animationDelay: "180ms" }}>
        <SignInButton />
      </div>
      <p
        className="animate-rise mt-4 text-xs text-muted-foreground"
        style={{ animationDelay: "220ms" }}
      >
        Acceso exclusivo con cuenta <span className="font-medium text-foreground">@arzion.com</span> o <span className="font-medium text-foreground">@restosimple.com</span>
      </p>
    </div>
  );
}
