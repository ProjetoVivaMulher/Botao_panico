/**
 * Viva Mulher - Botão de Pânico
 * Documentos e provas (fotos, vídeos e áudios) salvos no próprio aparelho.
 *
 * Nada é enviado para servidor: as provas ficam no IndexedDB local, podem ser
 * abertas, baixadas, compartilhadas ou apagadas pela própria usuária.
 */

const EvidenceModule = {
  MAX_BYTES: 200 * 1024 * 1024,
  _urls: [],
  _lastMessage: '',

  dom: null,

  init() {
    if (this.dom && this.dom.list) return;
    this.dom = {
      list: document.getElementById('evidenceList'),
      count: document.getElementById('evidenceCount'),
      note: document.getElementById('evidenceNote'),
      photoInput: document.getElementById('evidencePhotoInput'),
      videoInput: document.getElementById('evidenceVideoInput'),
      fileInput: document.getElementById('evidenceFileInput'),
      btnPhoto: document.getElementById('btnEvidencePhoto'),
      btnVideo: document.getElementById('btnEvidenceVideo'),
      btnFile: document.getElementById('btnEvidenceFile'),
      viewer: document.getElementById('evidenceViewerModal'),
      viewerBody: document.getElementById('evidenceViewerBody'),
      viewerTitle: document.getElementById('evidenceViewerTitle'),
      viewerEmoji: document.getElementById('evidenceViewerEmoji'),
      btnCloseViewer: document.getElementById('btnCloseEvidenceViewer')
    };

    if (!this.dom.list) return;

    const pick = (input) => {
      if (input) input.click();
    };
    if (this.dom.btnPhoto) this.dom.btnPhoto.addEventListener('click', () => pick(this.dom.photoInput));
    if (this.dom.btnVideo) this.dom.btnVideo.addEventListener('click', () => pick(this.dom.videoInput));
    if (this.dom.btnFile) this.dom.btnFile.addEventListener('click', () => pick(this.dom.fileInput));

    const onFiles = (event) => {
      const input = event.target;
      const files = Array.from(input.files || []);
      input.value = '';
      if (files.length) this.saveFiles(files);
    };
    [this.dom.photoInput, this.dom.videoInput, this.dom.fileInput].forEach((input) => {
      if (input) input.addEventListener('change', onFiles);
    });

    if (this.dom.list) this.dom.list.addEventListener('click', (event) => this.handleListClick(event));
    if (this.dom.btnCloseViewer) {
      this.dom.btnCloseViewer.addEventListener('click', () => this.closeViewer());
    }
    if (this.dom.viewer) {
      this.dom.viewer.addEventListener('click', (event) => {
        if (event.target === this.dom.viewer) this.closeViewer();
      });
    }

    this.render();
  },

  detectKind(mime) {
    const type = String(mime || '').toLowerCase();
    if (type.startsWith('image/')) return 'photo';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    return null;
  },

  async saveFiles(files) {
    for (const file of files) {
      await this.saveFile(file);
    }
  },

  async saveFile(file, kindHint) {
    if (!file) return null;
    if (!window.EvidenceStore) {
      this.showToast('⚠️ Armazenamento de provas indisponível neste navegador.');
      return null;
    }

    const kind = kindHint || this.detectKind(file.type);
    if (!kind) {
      this.showToast('⚠️ Formato não suportado. Use foto, vídeo ou áudio.');
      return null;
    }
    if (file.size > this.MAX_BYTES) {
      this.showToast('⚠️ Arquivo muito grande (limite de 200 MB).');
      return null;
    }

    try {
      const record = await window.EvidenceStore.add({
        kind,
        blob: file,
        name: file.name,
        source: 'manual'
      });
      this.requestPersistence();
      await this.render();
      this.showToast('✅ Prova salva no aparelho.');
      return record;
    } catch (error) {
      console.warn('[EvidenceModule] Falha ao salvar prova:', error);
      const quota = error && (error.name === 'QuotaExceededError' || /quota/i.test(String(error.message)));
      this.showToast(quota
        ? '⚠️ Sem espaço no aparelho. Apague provas antigas e tente de novo.'
        : '⚠️ Não foi possível salvar a prova.');
      return null;
    }
  },

  // Usado pelo fluxo do pânico e pela gravação manual de áudio.
  async saveBlob(blob, options = {}) {
    if (!blob || !window.EvidenceStore) return null;
    try {
      const record = await window.EvidenceStore.add({
        kind: options.kind || 'audio',
        blob,
        name: options.name,
        source: options.source || 'manual',
        eventId: options.eventId || null,
        durationMs: options.durationMs || null
      });
      this.requestPersistence();
      await this.render();
      return record;
    } catch (error) {
      console.warn('[EvidenceModule] Falha ao salvar áudio como prova:', error);
      return null;
    }
  },

  requestPersistence() {
    try {
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        navigator.storage.persist().catch(() => {});
      }
    } catch (error) {
      // Sem suporte: as provas continuam salvas, apenas sem garantia de persistência.
    }
  },

  kindLabel(kind) {
    if (kind === 'photo') return '📷 Foto';
    if (kind === 'video') return '🎬 Vídeo';
    return '🎙️ Áudio';
  },

  formatSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
  },

  formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
      ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  revokeUrls() {
    this._urls.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch (error) { /* ignore */ }
    });
    this._urls = [];
  },

  async render() {
    if (!this.dom || !this.dom.list) return;

    this.revokeUrls();
    this.dom.list.innerHTML = '';

    if (!window.EvidenceStore) {
      this.dom.list.innerHTML = '<div class="evidence-empty">Armazenamento de provas indisponível neste navegador.</div>';
      return;
    }

    let items = [];
    try {
      items = await window.EvidenceStore.list();
    } catch (error) {
      this.dom.list.innerHTML = '<div class="evidence-empty">Não foi possível ler as provas salvas.</div>';
      return;
    }

    if (this.dom.count) {
      this.dom.count.textContent = items.length === 1
        ? '1 prova salva'
        : items.length + ' provas salvas';
    }
    if (window.AppController && typeof window.AppController.updateEvidenceBadge === 'function') {
      window.AppController.updateEvidenceBadge(items.length);
    }
    if (this.dom.note) {
      this.dom.note.textContent = items.length
        ? 'Tudo fica somente neste aparelho. Toque em uma prova para abrir.'
        : 'Nenhuma prova ainda. Grave um vídeo, tire uma foto ou registre um áudio.';
    }

    if (items.length === 0) {
      this.dom.list.innerHTML = '<div class="evidence-empty">📂 Suas fotos, vídeos e áudios de prova aparecerão aqui.</div>';
      return;
    }

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'evidence-item';

      const sourceTag = item.source === 'panic'
        ? '<span class="evidence-tag panic">SOS</span>'
        : '<span class="evidence-tag">Manual</span>';

      card.innerHTML = `
        <div class="evidence-head">
          <span class="evidence-kind">${this.kindLabel(item.kind)}</span>
          <span class="evidence-date">${this.formatDate(item.createdAt)}</span>
        </div>
        <div class="evidence-preview" data-preview></div>
        <div class="evidence-meta">
          <span title="${this.escape(item.name)}">${this.escape(item.name)}</span>
          <span>${this.formatSize(item.size)}</span>
        </div>
        <div class="evidence-foot">
          ${sourceTag}
          ${item.eventId ? `<span class="evidence-event">${this.escape(item.eventId)}</span>` : ''}
        </div>
        <div class="evidence-actions">
          <button class="evidence-act" type="button" data-act="open" data-id="${this.escape(item.id)}">Abrir</button>
          <button class="evidence-act" type="button" data-act="share" data-id="${this.escape(item.id)}">Compartilhar</button>
          <button class="evidence-act" type="button" data-act="download" data-id="${this.escape(item.id)}">Baixar</button>
          <button class="evidence-act danger" type="button" data-act="delete" data-id="${this.escape(item.id)}">Excluir</button>
        </div>
      `;

      this.dom.list.appendChild(card);
      this.renderPreview(card.querySelector('[data-preview]'), item);
    }
  },

  async renderPreview(slot, item) {
    if (!slot) return;
    let record = null;
    try {
      record = await window.EvidenceStore.get(item.id);
    } catch (error) {
      record = null;
    }
    if (!record || !record.blob) {
      slot.innerHTML = '<div class="evidence-empty small">Prévia indisponível.</div>';
      return;
    }

    const url = URL.createObjectURL(record.blob);
    this._urls.push(url);

    let media;
    if (item.kind === 'photo') {
      media = document.createElement('img');
      media.alt = 'Foto de prova';
      media.loading = 'lazy';
    } else if (item.kind === 'video') {
      media = document.createElement('video');
      media.controls = true;
      media.playsInline = true;
      media.preload = 'metadata';
    } else {
      media = document.createElement('audio');
      media.controls = true;
      media.preload = 'metadata';
    }

    media.src = url;
    slot.innerHTML = '';
    slot.appendChild(media);
  },

  handleListClick(event) {
    const button = event.target.closest('button[data-act]');
    if (!button) return;
    const id = button.getAttribute('data-id');
    const act = button.getAttribute('data-act');
    if (!id) return;
    if (act === 'open') this.openItem(id);
    else if (act === 'share') this.shareItem(id);
    else if (act === 'download') this.downloadItem(id);
    else if (act === 'delete') this.deleteItem(id);
  },

  async openItem(id) {
    let record = null;
    try { record = await window.EvidenceStore.get(id); } catch (error) { record = null; }
    if (!record || !record.blob) {
      this.showToast('⚠️ Prova indisponível.');
      return;
    }

    if (!this.dom.viewer || !this.dom.viewerBody) {
      this.downloadItem(id);
      return;
    }

    const url = URL.createObjectURL(record.blob);
    this._urls.push(url);
    this.dom.viewerBody.innerHTML = '';

    let media;
    if (record.kind === 'photo') {
      media = document.createElement('img');
      media.alt = 'Foto de prova';
    } else if (record.kind === 'video') {
      media = document.createElement('video');
      media.controls = true;
      media.playsInline = true;
      media.autoplay = true;
    } else {
      media = document.createElement('audio');
      media.controls = true;
      media.autoplay = true;
    }
    media.src = url;
    this.dom.viewerBody.appendChild(media);

    if (this.dom.viewerTitle) this.dom.viewerTitle.textContent = this.kindLabel(record.kind).replace(/^[^ ]+ /, '');
    if (this.dom.viewerEmoji) this.dom.viewerEmoji.textContent = record.kind === 'photo' ? '📷' : record.kind === 'video' ? '🎬' : '🎙️';
    this.dom.viewer.classList.add('active');
  },

  closeViewer() {
    if (!this.dom || !this.dom.viewer) return;
    if (this.dom.viewerBody) {
      const media = this.dom.viewerBody.querySelector('audio, video');
      if (media) {
        try { media.pause(); } catch (error) { /* ignore */ }
        media.removeAttribute('src');
      }
      this.dom.viewerBody.innerHTML = '';
    }
    this.dom.viewer.classList.remove('active');
    this.revokeUrls();
    this.render();
  },

  async downloadItem(id) {
    let record = null;
    try { record = await window.EvidenceStore.get(id); } catch (error) { record = null; }
    if (!record || !record.blob) {
      this.showToast('⚠️ Prova indisponível.');
      return;
    }

    const url = URL.createObjectURL(record.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.name || 'prova-viva-mulher';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    this.showToast('⬇️ Download iniciado.');
  },

  async shareItem(id) {
    let record = null;
    try { record = await window.EvidenceStore.get(id); } catch (error) { record = null; }
    if (!record || !record.blob) {
      this.showToast('⚠️ Prova indisponível.');
      return;
    }

    try {
      const file = new File([record.blob], record.name || 'prova', { type: record.mime || 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Prova - Viva Mulher',
          text: 'Documento de prova salvo no app Botão de Pânico Viva Mulher.'
        });
        return;
      }
    } catch (error) {
      if (error && error.name === 'AbortError') return;
    }

    this.showToast('⚠️ Compartilhar arquivo não é suportado aqui. Use Baixar.');
  },

  async deleteItem(id) {
    if (!confirm('Apagar esta prova do aparelho? Esta ação não pode ser desfeita.')) return;
    try {
      await window.EvidenceStore.remove(id);
      if (window.AppController && typeof window.AppController.forgetEvidence === 'function') {
        window.AppController.forgetEvidence(id);
      }
      await this.render();
      this.showToast('🗑️ Prova apagada.');
    } catch (error) {
      this.showToast('⚠️ Não foi possível apagar a prova.');
    }
  },

  escape(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  showToast(message) {
    if (window.AppController && window.AppController.showToast) {
      window.AppController.showToast(message);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EvidenceModule;
}
if (typeof window !== 'undefined') {
  window.EvidenceModule = EvidenceModule;
}
