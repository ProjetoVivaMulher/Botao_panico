# Esquema do chamado de emergência ("Alert")

Armazenamento atual: arquivo `backend/data/alerts.json` (lista de objetos), via `backend/db/jsonStore.js`. **Isso é temporário — DECISÃO NECESSÁRIA do grupo sobre o motor de banco definitivo** (ver `00_CONTRATOS_E_ALINHAMENTO.md`).

## Campos

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Identificador único, formato `EVT-AAAAMMDD-NNNN`. Gerado pelo backend, nunca pelo cliente. |
| `latitude` | number \| null | Latitude capturada pelo frontend. `null` se GPS indisponível/negado. |
| `longitude` | number \| null | Longitude capturada pelo frontend. |
| `accuracy` | number \| null | Precisão do GPS em metros. |
| `mapsUrl` | string \| null | Link do Google Maps já pronto, gerado pelo frontend. |
| `targetPhone` | string | Número de WhatsApp de destino do disparo (não é dado de identidade da vítima). |
| `mensagem` | string \| null | Texto da mensagem de emergência enviada. |
| `status` | string | Um de: `active`, `assigned`, `en_route`, `arrived`, `resolved`, `cancelled` (ver máquina de estados abaixo). |
| `created_at` | string (ISO 8601) | Quando o chamado foi criado. |
| `updated_at` | string (ISO 8601) | Última atualização. |
| `status_history` | array de `{status, at}` | Histórico de mudanças de status, usado para calcular T1/T2/T3. |

## Máquina de estados

```
active ──▶ assigned ──▶ en_route ──▶ arrived ──▶ resolved
   │           │            │            │
   └──────────-┴────────────┴────────────┴──▶ cancelled
```

Transições válidas (fonte da verdade: `backend/services/statusTransitions.js`):
`active → assigned`, `active → cancelled`, `assigned → en_route`, `assigned → cancelled`,
`en_route → arrived`, `en_route → cancelled`, `arrived → resolved`, `arrived → cancelled`.
Qualquer outra transição é rejeitada pela API com HTTP 422.

## Métricas de tempo (T1, T2, T3)

Calculadas a partir de `alert.timings` (preenchidos por `computeTimings` durante as transições):
- **T1** = `active` → `assigned` (`dispatch_delay_seconds`).
- **T2** = `assigned` → `arrived` (`response_time_seconds`).
- **T3** = `active` → `resolved` (`total_resolution_seconds`).

## Dados pessoais

Este esquema não guarda nome, telefone pessoal ou endereço da vítima — isso fica no cadastro simples (fora do escopo deste backend, ver documento do botão de ajuda anterior). Se o grupo decidir vincular esse cadastro ao chamado, isso é uma extensão nova de escopo, não implementada aqui.
