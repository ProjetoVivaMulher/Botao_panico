/**
 * Viva Mulher - Botão de Pânico
 * Controlador Principal do Aplicativo (AppController)
 */

const STORAGE_KEY_LOGS = 'viva_mulher_emergency_logs';

const AppController = {
  countdownInterval: null,
  countdownSeconds: 3,
  isPanicArmed: false,
  isRecordingManualAudio: false,

  init() {
    this.cacheDom();
    this.bindEvents();
    this.renderContacts();
    this.renderLogs();
    this.updateGpsStatus();
  },

  cacheDom() {
    this.dom = {
      btnPanic: document.getElementById('btnPanic'),
      countdownOverlay: document.getElementById('countdownOverlay'),
      countdownNumber: document.getElementById('countdownNumber'),
      btnCancelPanic: document.getElementById('btnCancelPanic'),
      toastNotification: document.getElementById('toastNotification'),
      toastText: document.getElementById('toastText'),
      locationStatusDot: document.getElementById('locationStatusDot'),
      locationStatusText: document.getElementById('locationStatusText'),
      locationStatusSub: document.getElementById('locationStatusSub'),
      btnRefreshLoc: document.getElementById('btnRefreshLoc'),
      contactsList: document.getElementById('contactsList'),
      addContactForm: document.getElementById('addContactForm'),
      contactNameInput: document.getElementById('contactNameInput'),
      contactPhoneInput: document.getElementById('contactPhoneInput'),
      btnManualAudioRecord: document.getElementById('btnManualAudioRecord'),
      manualAudioIcon: document.getElementById('manualAudioIcon'),
      manualAudioText: document.getElementById('manualAudioText'),
      logsList: document.getElementById('logsList')
    };
  },

  bindEvents() {
    if (this.dom.btnPanic) {
      this.dom.btnPanic.addEventListener('click', () => this.startPanicCountdown());
    }

    if (this.dom.btnCancelPanic) {
      this.dom.btnCancelPanic.addEventListener('click', () => this.cancelPanic());
    }

    if (this.dom.btnRefreshLoc) {
      this.dom.btnRefreshLoc.addEventListener('click', () => this.updateGpsStatus(true));
    }

    if (this.dom.addContactForm) {
      this.dom.addContactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddContact();
      });
    }

    if (this.dom.btnManualAudioRecord) {
      this.dom.btnManualAudioRecord.addEventListener('click', () => this.handleManualAudioRecord());
    }
  },

  // ==========================================
  // GEOLOCALIZAÇÃO & STATUS
  // ==========================================
  async updateGpsStatus(userInitiated = false) {
    if (!this.dom.locationStatusDot || !window.GeolocationModule) return;

    this.dom.locationStatusDot.className = 'status-dot';
    this.dom.locationStatusText.textContent = 'Verificando GPS...';
    this.dom.locationStatusSub.textContent = 'Buscando coordenadas de alta precisão';

    const loc = await window.GeolocationModule.getCurrentLocation();

    if (loc && loc.success) {
      this.dom.locationStatusDot.className = 'status-dot active';
      this.dom.locationStatusText.textContent = `GPS Ativo (${loc.accuracy}m precisão)`;
      this.dom.locationStatusSub.textContent = `Lat: ${loc.lat}, Lng: ${loc.lng}`;
      if (userInitiated) {
        this.showToast('✅ Localização atualizada com sucesso!');
      }
    } else {
      this.dom.locationStatusDot.className = 'status-dot';
      this.dom.locationStatusText.textContent = 'GPS Indisponível';
      this.dom.locationStatusSub.textContent = loc.reason || 'Usando modo de contingência';
      if (userInitiated) {
        this.showToast('⚠️ Não foi possível obter o GPS.');
      }
    }
  },

  // ==========================================
  // BOTÃO DE PÂNICO & FLUXO DE EMERGÊNCIA
  // ==========================================
  startPanicCountdown() {
    if (this.isPanicArmed) return;

    this.isPanicArmed = true;
    this.countdownSeconds = 3;

    if (this.dom.countdownNumber) {
      this.dom.countdownNumber.textContent = this.countdownSeconds;
    }
    if (this.dom.countdownOverlay) {
      this.dom.countdownOverlay.classList.add('active');
    }

    // Pré-carrega o GPS em background para o disparo imediato
    if (window.GeolocationModule) {
      window.GeolocationModule.getCurrentLocation();
    }

    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;

      if (this.countdownSeconds <= 0) {
        clearInterval(this.countdownInterval);
        if (this.dom.countdownOverlay) {
          this.dom.countdownOverlay.classList.remove('active');
        }
        this.isPanicArmed = false;
        this.triggerEmergencyAlert();
      } else {
        if (this.dom.countdownNumber) {
          this.dom.countdownNumber.textContent = this.countdownSeconds;
        }
      }
    }, 1000);
  },

  cancelPanic() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.isPanicArmed = false;
    if (this.dom.countdownOverlay) {
      this.dom.countdownOverlay.classList.remove('active');
    }
    this.showToast('✖ Disparo de emergência cancelado.');
  },

  async triggerEmergencyAlert() {
    this.showToast('🚨 Disparando alerta de socorro...');

    // 1. Obter Localização Atual
    let loc = window.GeolocationModule ? window.GeolocationModule.currentPosition : null;
    if (!loc) {
      loc = window.GeolocationModule ? await window.GeolocationModule.getCurrentLocation() : { success: false };
    }

    // 2. Gerar ID Único do Evento e Horário
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const eventId = 'EVT-' + now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '-' +
      Math.floor(1000 + Math.random() * 9000);

    // 3. Montar Mensagem de Socorro Padronizada
    let message = `🚨 ALERTA DE EMERGÊNCIA - VIVA MULHER 🚨\n\nPreciso de ajuda!\n📅 Data: ${dateFormatted}\n🕐 Horário: ${timeFormatted}\n🆔 Evento: ${eventId}\n\n`;
    if (loc && loc.success) {
      message += `📍 Localização: ${loc.mapsUrl}\n`;
    } else {
      message += `📍 Localização não disponível\n`;
    }
    message += `\nEsta mensagem foi gerada pelo Botão de Pânico Viva Mulher.`;

    if (window.EmergencyMessageModule) {
      message = window.EmergencyMessageModule.buildMessage({
        eventId,
        dateFormatted,
        timeFormatted,
        loc
      });
    }

    // 4. Iniciar Gravação de Áudio de Evidência (15 segundos)
    if (window.AudioModule) {
      window.AudioModule.startRecording(15000);
    }

    // 5. Salvar Log no Histórico Local
    this.saveEmergencyLog({
      id: eventId,
      date: dateFormatted,
      time: timeFormatted,
      loc: loc,
      hasAudio: true
    });

    // 6. Enviar via WhatsApp para Contatos Cadastrados
    const contacts = window.ContactsModule ? window.ContactsModule.getContacts() : [];
    const primaryPhone = contacts.length > 0 ? contacts[0].phone : '552139553874';

    let whatsappUrl = `https://wa.me/${primaryPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    if (window.EmergencyMessageModule) {
      whatsappUrl = window.EmergencyMessageModule.buildWhatsAppUrl(primaryPhone, message);
    }

    window.open(whatsappUrl, '_blank');
  },

  // ==========================================
  // GERENCIAMENTO DE CONTATOS
  // ==========================================
  renderContacts() {
    if (!this.dom.contactsList || !window.ContactsModule) return;

    const contacts = window.ContactsModule.getContacts();
    this.dom.contactsList.innerHTML = '';

    if (contacts.length === 0) {
      this.dom.contactsList.innerHTML = '<div style="color:var(--text-muted); font-size:0.82rem;">Nenhum contato cadastrado.</div>';
      return;
    }

    contacts.forEach((contact) => {
      const item = document.createElement('div');
      item.className = 'contact-item';
      item.innerHTML = `
        <div class="contact-info">
          <span class="contact-name">${this.escapeHtml(contact.name)} ${contact.isDefault ? '<small style="color:var(--text-subtle);">(Padrão)</small>' : ''}</span>
          <span class="contact-phone">📱 ${this.escapeHtml(contact.phone)}</span>
        </div>
        <div class="contact-actions">
          <a href="https://wa.me/${contact.phone.replace(/\D/g, '')}" target="_blank" class="btn-sm-action" title="Testar WhatsApp">💬</a>
          ${!contact.isDefault ? `<button class="btn-sm-action delete" data-id="${contact.id}" title="Excluir">🗑️</button>` : ''}
        </div>
      `;

      const deleteBtn = item.querySelector('.delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          window.ContactsModule.removeContact(contact.id);
          this.renderContacts();
          this.showToast('Contato removido.');
        });
      }

      this.dom.contactsList.appendChild(item);
    });
  },

  handleAddContact() {
    const name = this.dom.contactNameInput.value.trim();
    const phone = this.dom.contactPhoneInput.value.trim();

    if (!name || !phone) {
      this.showToast('⚠️ Preencha nome e WhatsApp.');
      return;
    }

    if (window.ContactsModule) {
      window.ContactsModule.addContact(name, phone);
      this.dom.contactNameInput.value = '';
      this.dom.contactPhoneInput.value = '';
      this.renderContacts();
      this.showToast('✅ Contato de emergência salvo!');
    }
  },

  // ==========================================
  // ÁUDIO & GRAVAÇÃO MANUAL
  // ==========================================
  async handleManualAudioRecord() {
    if (!window.AudioModule) return;

    if (this.isRecordingManualAudio) {
      window.AudioModule.stopRecording();
      this.isRecordingManualAudio = false;
      if (this.dom.manualAudioText) this.dom.manualAudioText.textContent = 'Gravar Áudio de Evidência (15s)';
      if (this.dom.manualAudioIcon) this.dom.manualAudioIcon.textContent = '🎙️';
      this.showToast('Gravação de áudio finalizada.');
      return;
    }

    const started = await window.AudioModule.startRecording(15000);
    if (started) {
      this.isRecordingManualAudio = true;
      if (this.dom.manualAudioText) this.dom.manualAudioText.textContent = 'Gravando Evidência... (Clique para parar)';
      if (this.dom.manualAudioIcon) this.dom.manualAudioIcon.textContent = '🔴';
      this.showToast('🎙️ Gravando áudio ambiental de segurança...');
    } else {
      this.showToast('⚠️ Permissão de microfone não concedida.');
    }
  },

  onAudioRecorded(audioUrl) {
    this.isRecordingManualAudio = false;
    if (this.dom.manualAudioText) this.dom.manualAudioText.textContent = 'Gravar Áudio de Evidência (15s)';
    if (this.dom.manualAudioIcon) this.dom.manualAudioIcon.textContent = '🎙️';

    // Anexa áudio ao último registro ou cria novo
    this.attachAudioToLatestLog(audioUrl);
    this.showToast('✅ Áudio de evidência salvo com segurança!');
  },

  // ==========================================
  // HISTÓRICO DE LOGS
  // ==========================================
  saveEmergencyLog(logData) {
    try {
      const logs = this.getLogs();
      logs.unshift(logData);
      if (logs.length > 10) logs.pop();
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
      this.renderLogs();
    } catch (e) {
      console.error('[AppController] Erro ao salvar logs:', e);
    }
  },

  getLogs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  attachAudioToLatestLog(audioUrl) {
    const logs = this.getLogs();
    if (logs.length > 0) {
      logs[0].audioUrl = audioUrl;
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
      this.renderLogs();
    }
  },

  renderLogs() {
    if (!this.dom.logsList) return;

    const logs = this.getLogs();
    this.dom.logsList.innerHTML = '';

    if (logs.length === 0) {
      this.dom.logsList.innerHTML = '<div style="color:var(--text-muted); font-size:0.82rem;">Nenhum disparo registrado ainda.</div>';
      return;
    }

    logs.forEach((log) => {
      const item = document.createElement('div');
      item.className = 'log-item';
      item.innerHTML = `
        <div class="log-header">
          <span class="log-id">${this.escapeHtml(log.id)}</span>
          <span>${this.escapeHtml(log.date)} às ${this.escapeHtml(log.time)}</span>
        </div>
        <div class="log-details">
          ${log.loc && log.loc.success ? `📍 <a href="${log.loc.mapsUrl}" target="_blank">Ver mapa de localização</a>` : '📍 Localização indisponível'}
        </div>
        ${log.audioUrl ? `
          <div style="margin-top:6px;">
            <audio controls src="${log.audioUrl}" style="width:100%; height:32px; border-radius:4px;"></audio>
          </div>
        ` : ''}
      `;
      this.dom.logsList.appendChild(item);
    });
  },

  // ==========================================
  // UTILITÁRIOS
  // ==========================================
  showToast(message) {
    if (!this.dom.toastNotification || !this.dom.toastText) return;
    this.dom.toastText.textContent = message;
    this.dom.toastNotification.classList.add('show');

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.dom.toastNotification.classList.remove('show');
    }, 3500);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AppController.init();
});

window.AppController = AppController;