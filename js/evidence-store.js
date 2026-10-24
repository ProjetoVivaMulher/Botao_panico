/**
 * Viva Mulher - Botão de Pânico
 * Armazenamento local (IndexedDB) dos documentos e provas.
 *
 * Fotos, vídeos e áudios ficam somente no aparelho da usuária (nunca sobem
 * para o servidor). Cada prova guarda os metadados e o Blob; a URL de
 * visualização é criada sob demanda e revogada ao sair da lista.
 */

const EvidenceStore = {
  DB_NAME: 'viva-mulher-evidence',
  STORE: 'items',
  VERSION: 1,
  _db: null,

  _open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB indisponível neste navegador.'));
        return;
      }
      const req = indexedDB.open(this.DB_NAME, this.VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          const store = db.createObjectStore(this.STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };
      req.onsuccess = () => {
        this._db = req.result;
        resolve(this._db);
      };
      req.onerror = () => reject(req.error);
    });
  },

  _defaultName(kind, mime) {
    const extByMime = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg'
    };
    const ext = extByMime[mime] || (kind === 'photo' ? 'jpg' : kind === 'video' ? 'mp4' : 'webm');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return `${kind}-${stamp}.${ext}`;
  },

  /**
   * Salva uma prova e devolve o registro criado (sem expor o Blob).
   * @param {{kind:'photo'|'video'|'audio', blob:Blob, name?:string, source?:string, eventId?:string|null, durationMs?:number|null}} input
   */
  async add(input) {
    const blob = input && input.blob;
    if (!blob || !blob.size) throw new Error('Arquivo vazio.');

    const kind = input.kind || 'photo';
    const mime = input.mime || blob.type || 'application/octet-stream';
    const record = {
      id: 'evp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      kind,
      mime,
      size: blob.size,
      name: input.name || this._defaultName(kind, mime),
      createdAt: new Date().toISOString(),
      source: input.source || 'manual',
      eventId: input.eventId || null,
      durationMs: input.durationMs || null,
      blob
    };

    const db = await this._open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return { ...record, blob: undefined };
  },

  /** Lista apenas os metadados (não carrega todos os Blobs na memória). */
  async list() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const items = [];
      const tx = db.transaction(this.STORE, 'readonly');
      const req = tx.objectStore(this.STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const value = cursor.value || {};
        items.push({
          id: value.id,
          kind: value.kind,
          mime: value.mime,
          size: value.size,
          name: value.name,
          createdAt: value.createdAt,
          source: value.source,
          eventId: value.eventId || null,
          durationMs: value.durationMs || null
        });
        cursor.continue();
      };
      tx.oncomplete = () => {
        items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        resolve(items);
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async get(id) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readonly');
      const req = tx.objectStore(this.STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getBlob(id) {
    const record = await this.get(id);
    return record && record.blob ? record.blob : null;
  },

  async remove(id) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },

  async clear() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },

  async count() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readonly');
      const req = tx.objectStore(this.STORE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EvidenceStore;
}
if (typeof window !== 'undefined') {
  window.EvidenceStore = EvidenceStore;
}
