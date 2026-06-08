import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusScreen } from "@/components/StatusScreen";

export default function NotFound() {
  return (
    <StatusScreen
      eyebrow="Error 404"
      title="Página no encontrada"
      description="La página que buscás no existe o se movió. Volvé al inicio para seguir."
    >
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Volver al inicio
      </Link>
    </StatusScreen>
  );
}
