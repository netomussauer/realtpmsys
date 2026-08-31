"use client";

import { useTurmas } from "@/features/turmas/hooks/use-turmas";

interface TurmaPickerProps {
  value: string | undefined;
  onChange: (turmaId: string) => void;
}

/**
 * Seletor de turma da página /treinos — reaproveita `useTurmas` (mesmo
 * hook da listagem de turmas, feature Turmas). `per_page` alto cobre o
 * volume esperado sem paginar um `<select>` (mesmo padrão pragmático de
 * features/turmas/hooks/use-picker-data.ts).
 *
 * Não filtra por status: uma turma ENCERRADA ainda pode ter histórico de
 * treinos que faz sentido consultar.
 */
export function TurmaPicker({ value, onChange }: TurmaPickerProps) {
  const turmasQuery = useTurmas({ per_page: 100 });

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Turma
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="form-input md:w-72"
        disabled={turmasQuery.isLoading}
      >
        <option value="">Selecione uma turma...</option>
        {(turmasQuery.data?.data ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
