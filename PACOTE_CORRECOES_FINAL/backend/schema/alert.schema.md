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
| `status` | string | Um de: `disparado`, `em_atendimento`, `encerrado`, `cancelado`. |
| `created_at` | string (ISO 8601) | Quando o chamado foi criado. |
| `updated_at` | string (ISO 8601) | Última atualização. |
| `status_history` | array de `{status, at}` | Histórico de mudanças de status, usado para calcular T1/T2/T3. |

## Máquina de estados

```
disparado ──▶ em_atendimento ──▶ encerrado
    │                │
    └──▶ cancelado ◀─┘
```

Transições válidas: `disparado → em_atendimento`, `em_atendimento → encerrado`, `disparado → cancelado`, `em_atendimento → cancelado`. Qualquer outra transição é rejeitada pela API (ver `backend/services/statusTransitions.js`, de responsabilidade do Gabriel).

## Métricas de tempo (T1, T2, T3)

Calculadas a partir de `status_history` (responsabilidade do Gabriel/Everaldo):
- **T1** = tempo entre `disparado` e `em_atendimento`.
- **T2** = tempo entre `em_atendimento` e `encerrado`.
- **T3** = tempo total, entre `disparado` e `encerrado`.

Esses três nomes vieram do PDF de regras do grupo, mas o significado exato de cada um não estava detalhado ali — esta é uma interpretação razoável. **Confirmem com a orientadora se é isso mesmo que o relatório espera antes de considerar fechado.**

## Dados pessoais

Este esquema não guarda nome, telefone pessoal ou endereço da vítima — isso fica no cadastro simples (fora do escopo deste backend, ver documento do botão de ajuda anterior). Se o grupo decidir vincular esse cadastro ao chamado, isso é uma extensão nova de escopo, não implementada aqui.
