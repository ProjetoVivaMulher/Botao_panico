# Fallback Operacional — 190, 180 e 192

## O que já existe (frontend, não mexer aqui)
O `frontend/index.html` já tem uma seção "Canais Diretos de Emergência" com três botões de discagem rápida, usando links `tel:`:

- `tel:190` — Polícia Militar
- `tel:180` — Central de Atendimento à Mulher
- `tel:192` — SAMU

Esses links abrem diretamente o discador do celular quando tocados — funcionam em qualquer navegador, sem depender de internet ou de nenhuma integração externa.

## O que este backend faz (e o que não faz)
`GET /api/notifications/status` apenas informa que **não existe** nenhuma integração automática com esses serviços. Isso é intencional: não há credencial, contrato ou API oficial de nenhum desses órgãos definida pelo grupo, e inventar uma seria apresentar uma funcionalidade que não existe de verdade.

## Fallback real, hoje
Se o botão de pânico (WhatsApp) falhar por qualquer motivo — sem internet, sem WhatsApp instalado, etc. — a usuária ainda tem os três botões de discagem direta na mesma tela, que funcionam mesmo sem conexão de dados (chamada de voz comum).

## Se o projeto evoluir (fora do escopo atual)
Uma integração real com 190/180/192 dependeria de acordo formal com os órgãos públicos responsáveis — isso é uma decisão institucional, não uma tarefa de código, e fica fora do escopo deste semestre.

