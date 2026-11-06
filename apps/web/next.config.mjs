/** @type {import('next').NextConfig} */
const nextConfig = {
  // output=standalone gera um bundle mínimo para containers (sem node_modules
  // completo) — essencial pra distroless. Vide infra/k8s/web/Dockerfile.
  output: "standalone",

  // O backend roda em http://api.realtpmsys.local:8000 (MetalLB 192.168.1.208).
  // Em dev local apontamos para o mesmo host; em produção (K3s) o proxy reverso
  // de fato é resolvido via DNS interno do cluster.
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://api.realtpmsys.local:8000",
  },

  // Galeria usa Unsplash em placeholders enquanto não há fotos reais.
  // Remover hosts daqui quando passar pra imagens locais em public/.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // Strict mode liga checks adicionais em dev e força double-render para detectar
  // efeitos colaterais não-idempotentes. Sempre on.
  reactStrictMode: true,

  // Em produção, escondemos o header `X-Powered-By: Next.js`.
  poweredByHeader: false,

  // Respostas da API do BFF (sessão, proxy do backend, senha temporária) nunca
  // devem ser guardadas por navegador ou proxy intermediário. O proxy recria
  // as respostas do backend e perderia o `Cache-Control: no-store` dele.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
