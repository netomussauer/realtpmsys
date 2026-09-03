import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// `test.globals` fica desligado (imports explicitos de vitest em cada
// arquivo de teste) — por isso o auto-cleanup embutido do Testing Library
// (que depende de `afterEach` estar em `globalThis`) nao dispara sozinho.
// Registrando aqui explicitamente evitamos DOM vazando de um teste pro outro
// dentro do mesmo arquivo.
afterEach(() => {
  cleanup();
});
