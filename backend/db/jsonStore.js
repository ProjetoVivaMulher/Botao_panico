/**
 * Viva Mulher - Botão de Pânico
 * Camada de persistência mínima baseada em arquivo JSON.
 *
 * DECISÃO NECESSÁRIA (ver 00_CONTRATOS_E_ALINHAMENTO.md, item 5): o grupo ainda
 * não escolheu o motor de banco de dados oficial (MySQL, Postgres, Mongo...).
 * Esta implementação usa um arquivo JSON local como "banco" temporário, porque:
 *   - não exige instalar nem configurar nenhum servidor de banco;
 *   - funciona imediatamente em qualquer computador, o que é essencial pro prazo
 *     de segunda-feira;
 *   - mantém a mesma interface (insert/list/findById/update) que o repositório
 *     usa, então trocar para um banco de verdade depois significa reescrever
 *     só este arquivo, sem mudar quem o consome (Gabriel, Everaldo).
 *
 * NÃO é uma solução de produção real — é uma ponte até a decisão oficial do grupo.
 */

const fs = require('fs');
const path = require('path');

function createJsonStore(fileName) {
  const dataDir = path.join(__dirname, '..', 'data');
  const filePath = path.join(dataDir, fileName);

  function ensureStoreExists() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]', 'utf8');
    }
  }

  function readAll() {
    ensureStoreExists();
    const raw = fs.readFileSync(filePath, 'utf8');
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(`[jsonStore] Arquivo ${fileName} corrompido, reiniciando vazio.`, e.message);
      return [];
    }
  }

  function writeAll(records) {
    ensureStoreExists();
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
  }

  return { ensureStoreExists, readAll, writeAll, filePath };
}

module.exports = { createJsonStore };
