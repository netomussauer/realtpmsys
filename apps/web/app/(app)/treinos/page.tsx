import { Suspense } from "react";
import { TreinosView } from "@/features/frequencia/components/treinos-view";

/**
 * /treinos — Server Component que só existe pra envolver `TreinosView`
 * (client) num Suspense boundary, exigido pelo Next 15 quando o
 * componente usa `useSearchParams()` (mesmo padrão de app/(auth)/login/page.tsx).
 */
export default function TreinosPage() {
  return (
    <Suspense fallback={<TreinosSkeleton />}>
      <TreinosView />
    </Suspense>
  );
}

function TreinosSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-10 w-72 rounded bg-muted" />
      <div className="h-64 rounded bg-muted" />
    </div>
  );
}
