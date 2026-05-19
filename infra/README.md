# Deploy — realtpmsys

Manifestos e fluxo de deploy do realtpmsys no cluster K3s do `infra-lab`.

## Topologia

| Componente | Endereço | Notas |
| --- | --- | --- |
| Imagem | `harbor.lab.local/realtpmsys/api:latest` | Build via Tekton + Harbor (futuro) ou manual |
| Service (MetalLB) | `192.168.1.208` | Próximo IP livre após o `amfit` |
| DNS | `api.realtpmsys.local` | Adicionar no Pi-hole (ver passo 4) |
| Database | `postgresql.shared-infra.svc.cluster.local:5432/realtpmsys` | Já provisionado pelo initdb global |
| Node | `k3s-worker-cicd` (`192.168.1.31`) | via `nodeSelector: workload=cicd` |
| ArgoCD | `argocd.lab.local` | ns `cicd` |

## Arquitetura dos manifestos

```text
infra/
├── k8s/                          # aplicado pelo ArgoCD (path da Application)
│   ├── namespace.yaml            # ns realtpmsys com labels do lab
│   ├── deployment.yaml           # 1 réplica, distroless, probes em /health
│   ├── service.yaml              # LoadBalancer MetalLB
│   └── sealedsecret.yaml.example # template — gerar o real com kubeseal
└── argocd/
    └── application.yaml          # Application apontando para o repo
```

O Dockerfile multi-stage fica na raiz do repo (`/Dockerfile`).

## Fluxo de primeiro deploy

### 1) Build da imagem e push para Harbor

```bash
# Local — exige docker daemon
docker build -t harbor.lab.local/realtpmsys/api:latest \
             --build-arg VERSION="$(git describe --tags --always)" \
             --build-arg COMMIT="$(git rev-parse --short HEAD)" .

docker login harbor.lab.local        # robot account com push em realtpmsys/*
docker push harbor.lab.local/realtpmsys/api:latest
```

> Quando o pipeline Tekton estiver pronto: substituir por commit → build
> automático com tag por SHA.

### 2) Selar o Secret (kubeseal)

Seguir as instruções em [`k8s/sealedsecret.yaml.example`](k8s/sealedsecret.yaml.example).
O arquivo final deve ser `k8s/sealedsecret.yaml` — commitar **apenas** depois
de selado.

### 3) Garantir `harbor-pull-secret` no namespace

```bash
kubectl create namespace realtpmsys --dry-run=client -o yaml | kubectl apply -f -
kubectl get secret harbor-creds -n cicd -o yaml \
  | sed 's/namespace: cicd/namespace: realtpmsys/' \
  | sed 's/name: harbor-creds/name: harbor-pull-secret/' \
  | kubectl apply -f -
```

### 4) DNS no Pi-hole

Adicionar a linha em `infra-lab/kubernetes/network-services/pihole/configmap-records.yaml`:

```text
# REALTPMSYS
address=/api.realtpmsys.local/192.168.1.208
```

Aplicar e reiniciar o Pi-hole:

```bash
kubectl apply -f kubernetes/network-services/pihole/configmap-records.yaml
kubectl rollout restart deployment/pihole -n network-services
```

### 5) Registrar a Application no ArgoCD

```bash
kubectl apply -f infra/argocd/application.yaml
# ArgoCD sincroniza automaticamente — acompanhar em http://argocd.lab.local
```

### 6) Validar

```bash
# Pods em Running
kubectl get pods -n realtpmsys

# Service com External IP
kubectl get svc -n realtpmsys

# Health
curl http://api.realtpmsys.local:8000/health

# Login
curl -X POST http://api.realtpmsys.local:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@realtpmsys.local","senha":"admin123"}'
```

## Variáveis de ambiente (Deployment)

| Var | Origem | Notas |
| --- | --- | --- |
| `DB_URL` | composta a partir de `PG_PASSWORD` (Secret) | `postgres://realtpmsys:****@postgresql.shared-infra/realtpmsys` |
| `JWT_SECRET` | `realtpmsys-secrets.jwt-secret` | Gerar com `openssl rand -base64 48` |
| `APP_PORT` | literal | `8000` |
| `APP_RUN_MIGRATIONS` | literal | `true` — aplica migrations no startup |
| `APP_MIGRATIONS_PATH` | literal | `/app/migrations` |
| `JWT_ACCESS_EXPIRES_MINUTES` | literal | `60` |
| `DB_MAX_CONNS` / `DB_MIN_CONNS` | literal | `10` / `2` |

## Troubleshooting

**Pod em `CrashLoopBackOff`** → `kubectl logs -n realtpmsys deploy/realtpmsys-api`.
Causas comuns:

- `DB_URL é obrigatório` — `realtpmsys-secrets` não está aplicado ou nome errado.
- `migrate up: ...` — banco não acessível ou migration corrompida. Conferir
  `kubectl -n shared-infra get pods postgresql-0`.

**Pod sai do Running mas LB sem External IP** → `kubectl get svc -n realtpmsys`.
Se `<pending>`, o `loadBalancerIP=192.168.1.208` já está em uso ou fora do pool
MetalLB. Conferir `kubectl logs -n metallb-system speaker-*`.

**DNS não resolve** → testar direto pelo IP: `curl http://192.168.1.208:8000/health`.
Se OK, o problema está no Pi-hole (passo 4).

<!-- pipeline trigger: 2026-05-19T15:16:48Z -->
