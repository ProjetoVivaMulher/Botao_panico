# Viva Mulher - Botao de Panico Comunitario


https://botao-panico-viva-mulher.vercel.app/

Este repositorio descreve o modulo de botao de panico do projeto Viva Mulher.

O foco desta versao e somente o fluxo de emergencia: a usuaria aciona o botao, o sistema prepara uma mensagem de socorro e envia para o canal de atendimento das autoridades/equipe responsavel, incluindo localizacao quando disponivel.

## Objetivo

Disponibilizar um acionamento rapido e seguro para mulheres em situacao de risco, com:
- envio imediato de alerta
- compartilhamento de localizacao
- mensagem curta e objetiva para agilizar resposta

## Escopo do Botao de Panico

1. Acionamento em poucos toques apos login.
2. Confirmacao rapida para evitar disparo acidental.
3. Captura de geolocalizacao (com permissao da usuaria).
4. Geracao de mensagem de socorro padronizada.
5. Envio para canal oficial de atendimento (ex.: WhatsApp da equipe/autoridades).
6. Fallback em caso de falha de envio (ex.: ligacao 190 e contato local).

## Fluxo de Emergencia

1. A usuaria toca em "Preciso de ajuda agora".
2. O sistema coleta identificacao minima, horario e localizacao (se permitida).
3. O sistema monta a mensagem de socorro com ID do evento.
4. O canal de atendimento e aberto com mensagem pronta para envio.
5. O evento e registrado com status inicial "disparado" para acompanhamento.

## Mensagem de Socorro (modelo)

ALERTA VIVA MULHER
ID: EVT-AAAA-MMDD-00001
Nome/Alias: [IDENTIFICACAO]
Horario: [DD/MM/AAAA HH:MM]
Risco: [BAIXO|MEDIO|ALTO]
Localizacao: [LINK MAPS OU COORDENADAS]
Observacao: Preciso de apoio imediato.

## Requisitos Minimos

- Botao sempre visivel e de facil acesso.
- Acionamento com no maximo 2 toques apos login.
- Feedback claro de status: pronto, enviando, enviado, falha.
- Tempo alvo de disparo da mensagem: ate 3 segundos.
- Funcionamento em internet instavel (mensagem curta e resiliente).

## Privacidade e Seguranca (LGPD)

- Coletar apenas dados necessarios para o atendimento emergencial.
- Exibir consentimento e finalidade de uso antes do acionamento.
- Proteger dados e restringir acesso aos registros de emergencia.
- Definir retencao e descarte de dados de eventos.

## Aviso Importante

Este botao de panico e um recurso de apoio e nao substitui os canais oficiais de emergencia.

Em risco iminente, priorize contato direto com a Policia Militar (190) e autoridades locais.

## Documento de Apoio

Para detalhes de implementacao, backlog e operacao, consulte o plano:
- PLANO_BOTAO_PANICO_COMUNITARIO.md

## Desenvolvedores

- Fernando Mello
- Marilia
- Raphael
- Renan
- Matheus
- Gabriel Suede
- Everaldo
