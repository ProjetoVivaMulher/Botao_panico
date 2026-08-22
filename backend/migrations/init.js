/**
 * Viva Mulher - Botão de Pânico
 * "Migração" reproduzível: prepara o armazenamento de chamados num ambiente novo.
 *
 * Como rodar (a partir da pasta backend/):
 *   node migrations/init.js
 *
 * Isso cria backend/data/alerts.json (vazio, [] ) se ainda não existir.
 * Rodar de novo em um ambiente que já tem dados NÃO apaga nada.
 */

const { createJsonStore } = require('../db/jsonStore');

const store = createJsonStore('alerts.json');
store.ensureStoreExists();

console.log(`[migrations/init] Armazenamento de chamados pronto em: ${store.filePath}`);
