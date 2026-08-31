import { Suspense } from "react";
import { TreinoDetailView } from "@/features/frequencia/components/treino-detail-view";

/**
 * /treinos/[id] — Server Component que resolve `params` (Promise no
 * Next 15) e envolve `TreinoDetailView` (client) num Suspense boundary,
 * exigido pelo Next 15 quando o componente usa `useSearchParams()`
 * (mesmo padrão de app/(auth)/login/page.tsx). O `turma_id` é lido da
 * query string dentro de `TreinoDetailView` — obrigatório pois não existe
 * `GET /treinos/{id}` no backend.
 */
export default async function TreinoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<TreinoDetailSkeleton />}>
      <TreinoDetailView treinoId={id} />
    </Suspense>
  );
}

function TreinoDetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 rounded bg-muted" />
      <div className="h-32 rounded bg-muted" />
    </div>
  );
}
