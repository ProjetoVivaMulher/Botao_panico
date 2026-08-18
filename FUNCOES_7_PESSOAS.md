# Plano de Execucao por Pessoa (7 pessoas) - Projeto Botao de Panico

## Objetivo

Organizar a execucao real do projeto para subir no Git com tarefas claras por pessoa, entregas separadas e fluxo de PR sem conflito.

## Divisao do Time

- Backend: B1, B2, B3, B4
- Frontend: F1, F2, F3

## Regra de trabalho no Git

- Cada pessoa trabalha em branch propria.
- Cada tarefa principal gera 1 PR.
- Ninguem faz push direto na main.
- Merge sempre com review de pelo menos 1 pessoa de outra frente.

Padrao de branch sugerido:
- feat/backend-b1-api-base
- feat/backend-b2-db-model
- feat/backend-b3-emergency-flow
- feat/backend-b4-monitoring-integration
- feat/frontend-f1-panic-button
- feat/frontend-f2-geolocation-message
- feat/frontend-f3-pwa-audio-support

---

## FRONTEND (3 pessoas)

## F1 - Botao de Panico e dinamica de disparo

Escopo:
- Criar/ajustar botao principal de emergencia.
- Implementar dinamica de clique com confirmacao (contagem regressiva).
- Acionar envio para WhatsApp com mensagem pronta (wa.me).
- Exibir estado visual: pronto, enviando, enviado, erro.

Tarefas:
1. Criar funcao de disparo central no frontend.
2. Garantir que o clique gere ID de evento unico.
3. Integrar botao com URL de envio do WhatsApp com encode da mensagem.
4. Implementar cancelamento durante a contagem.
5. Adicionar feedback visual/toast para cada estado.

Entregaveis:
- Fluxo completo do botao funcionando em mobile.
- PR com video curto mostrando: clicar, cancelar e disparar.

Criterio de aceite:
- Clique no botao abre WhatsApp com mensagem preenchida.
- Fluxo de disparo acontece em ate 3 segundos apos confirmacao.

## F2 - Geolocalizacao e composicao da mensagem de socorro

Escopo:
- Capturar localizacao em tempo real.
- Tratar permissao negada e timeout.
- Montar mensagem final com localizacao, horario e ID.

Tarefas:
1. Implementar modulo de geolocalizacao com alta precisao.
2. Gerar link de mapa com latitude/longitude.
3. Injetar localizacao na mensagem de socorro.
4. Implementar fallback: localizacao indisponivel.
5. Atualizar indicador visual de status do GPS.

Entregaveis:
- Mensagem de socorro completa com ou sem GPS.
- PR com teste em 2 cenarios: permissao aceita e negada.

Criterio de aceite:
- Com permissao, mensagem inclui link de mapa.
- Sem permissao, mensagem continua sendo enviada com fallback.

## F3 - PWA, audio de evidencia, contatos e historico local

Escopo:
- Instalar app como PWA.
- Gravar audio automatico e manual de emergencia.
- Gerenciar contatos e historico local de alertas.

Tarefas:
1. Configurar manifest e service worker para uso offline.
2. Implementar fluxo de instalacao do app.
3. Implementar gravacao de audio de 15s no disparo.
4. Permitir gravacao manual adicional.
5. Criar lista de contatos de confianca.
6. Salvar historico de eventos no localStorage.

Entregaveis:
- PWA instalavel.
- Historico com ultimo audio e localizacao.
- PR com prova de funcionamento offline basico.

Criterio de aceite:
- App instala na tela inicial.
- Historico salva e renderiza os 10 ultimos eventos.

---

## BACKEND (4 pessoas)

## B1 - Estrutura da API e autenticacao

Escopo:
- Criar base do backend.
- Definir autenticacao da equipe de atendimento.
- Padronizar validacao e erros.

Tarefas:
1. Criar projeto backend com estrutura inicial.
2. Configurar rota de health check.
3. Criar autenticacao basica para painel interno.
4. Criar middleware de validacao de entrada.
5. Criar middleware de erro padrao.

Entregaveis:
- API inicial rodando localmente.
- Documento curto com padrao de resposta da API.

Criterio de aceite:
- Health check responde 200.
- Rotas protegidas exigem autenticacao.

## B2 - Banco de dados e modelo de emergencia

Escopo:
- Criar estrutura de dados do chamado de emergencia.
- Preparar persistencia para eventos e atualizacoes.

Tarefas:
1. Definir esquema de tabela/colecao de emergencia.
2. Implementar migracoes ou script de criacao.
3. Criar repositorio de acesso a dados.
4. Registrar timestamps de disparo, contato e encerramento.
5. Registrar dados minimos da vitima (alias, telefone mascarado, localizacao).

Entregaveis:
- Banco preparado para receber chamados.
- Script versionado para subir estrutura em ambiente novo.

Criterio de aceite:
- Inserir, listar e atualizar um chamado via camada de dados.

## B3 - Endpoints de chamado e status operacional

Escopo:
- Implementar motor de chamados no servidor.
- Permitir criar e atualizar status de emergencia.
- Expor listagem para painel.

Tarefas:
1. Criar endpoint POST de emergencia.
2. Criar endpoint PATCH de status.
3. Criar endpoint GET de chamados abertos.
4. Implementar validacao de transicao de status.
5. Implementar calculo de T1, T2 e T3.

Entregaveis:
- Fluxo backend completo de chamado.
- Colecao de testes de API (ex.: Postman).

Criterio de aceite:
- Chamado criado no banco e visivel na listagem.
- Status atualiza somente em transicoes validas.

## B4 - Integracao de envio, logs e observabilidade

Escopo:
- Integrar backend com mecanismo de envio (fase atual: WhatsApp link via frontend e webhook futuro).
- Criar trilha de logs e monitoramento.

Tarefas:
1. Criar servico de composicao padrao da mensagem de socorro.
2. Criar log de tentativa de envio (sucesso/falha).
3. Implementar endpoint de metricas basicas (volume, tempo medio).
4. Criar estrutura de auditoria de alteracoes de status.
5. Documentar fallback operacional: 190, 180, 192.

Entregaveis:
- Camada de logs operacionais.
- Endpoint de metricas para acompanhamento.

Criterio de aceite:
- Toda mudanca de status gera log.
- Dashboard simples (ou JSON) mostra metricas de chamados.

---

## Ordem de Execucao Recomendada

1. B1 e B2 iniciam primeiro (base da API e dados).
2. F1 e F2 evoluem frontend em paralelo (botao + geolocalizacao + WhatsApp).
3. B3 conecta frontend ao backend de chamados.
4. F3 fecha PWA, audio e historico.
5. B4 fecha logs, metricas e observabilidade.

## Definicao de pronto por pessoa

- Codigo em branch propria.
- PR aberto com descricao do que foi feito.
- Evidencia de teste (print, video curto ou curl).
- Sem erro de execucao no fluxo principal.