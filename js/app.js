/**
 * Viva Mulher - Botão de Pânico
 * Controlador Principal do Aplicativo (AppController)
 *
 * Regra de ouro: o cadastro/reconfirmação são opcionais e NUNCA bloqueiam
 * o acionamento do botão de pânico.
 */

const STORAGE_KEY_LOGS = 'viva_mulher_emergency_logs';
const STORAGE_KEY_SKIP_ONBOARDING = 'viva_mulher_skip_onboarding';

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
    this.syncAccessibilityUI();
    this.initProfile();
  },

  // ==========================================
  // PERFIL / CADASTRO / LGPD
  // ==========================================
  initProfile() {
    if (!window.UserModule) return;

    // Tenta reenviar cadastro que ficou pendente (offline)
    if (typeof UserModule.syncPending === 'function') {
      UserModule.syncPending().then((synced) => {
        if (synced) this.showToast('✅ Cadastro sincronizado com o servidor.');
        this.updateProfileBanner();
      }).catch(() => {});
    }

    const profile = UserModule.getProfile();
    const skipped = localStorage.getItem(STORAGE_KEY_SKIP_ONBOARDING) === 'true';

    this.updateProfileBanner();

    if (!profile && !skipped) {
      setTimeout(() => this.openModal('onboardingModal'), 700);
    }
  },

  updateProfileBanner() {
    const banner = this.dom.profileBanner;
    if (!banner || !window.UserModule) return;

    const profile = UserModule.getProfile();
    let title = '';
    let sub = '';
    let btn = '';
    let show = true;

    if (!profile) {
      title = 'Complete seu cadastro';
      sub = 'Leva menos de 1 minuto e garante um socorro mais rápido.';
      btn = 'Cadastrar';
    } else if (profile.unsynced) {
      title = 'Cadastro pendente de sincronização';
      sub = 'Sem internet agora — enviaremos seus dados assim que conectar. O pânico funciona normalmente.';
      btn = 'Tentar de novo';
    } else if (UserModule.needsReconfirmation()) {
      title = 'Confirme seus dados';
      sub = 'Para manter seu cadastro ativo (reconfirmação a cada 45 dias).';
      btn = 'Confirmar';
    } else {
      show = false;
    }

    if (!show) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'flex';
    if (this.dom.profileBannerIcon) this.dom.profileBannerIcon.textContent = profile ? '🔄' : '👤';
    if (this.dom.profileBannerTitle) this.dom.profileBannerTitle.textContent = title;
    if (this.dom.profileBannerSub) this.dom.profileBannerSub.textContent = sub;
    if (this.dom.profileBannerBtn) this.dom.profileBannerBtn.textContent = btn;

    this.updateLocationConsentUI();
  },

  handleProfileBannerClick() {
    const profile = window.UserModule ? UserModule.getProfile() : null;
    if (profile && profile.unsynced) {
      UserModule.syncPending().then((synced) => {
        this.showToast(synced ? '✅ Cadastro sincronizado!' : '⚠️ Ainda sem conexão. Tente mais tarde.');
        this.updateProfileBanner();
      });
      return;
    }
    if (profile && UserModule.needsReconfirmation()) {
      this.showReconfirm();
      return;
    }
    this.openModal('onboardingModal');
  },

  async handleRegister(e) {
    e.preventDefault();
    if (!this.dom.registerForm) return;

    const fullName = this.dom.regFullName.value.trim();
    const phone = this.dom.regPhone.value.trim();
    const birthDate = this.dom.regBirthDate.value.trim();
    const pin = this.dom.regPin.value.trim();
    const consentLgpd = this.dom.regConsentLgpd.checked;
    const consentLocation = this.dom.regConsentLocation.checked;

    this.showFormError('regError', '');

    if (!fullName || fullName.split(/\s+/).filter((p) => p.length >= 2).length < 2) {
      return this.showFormError('regError', 'Informe o nome completo (nome e sobrenome).');
    }
    if (!phone) {
      return this.showFormError('regError', 'Informe o telefone com DDD.');
    }
    if (!birthDate) {
      return this.showFormError('regError', 'Informe a data de nascimento (DD/MM/AAAA).');
    }
    if (pin && !/^\d{4,6}$/.test(pin)) {
      return this.showFormError('regError', 'O PIN deve ter de 4 a 6 dígitos.');
    }
    if (!consentLgpd) {
      return this.showFormError('regError', 'É necessário aceitar o Termo de Uso e LGPD.');
    }

    this.setSubmitting('regSubmit', true, 'Salvando...');
    const res = await UserModule.register({ fullName, phone, birthDate, pin, consentLgpd, consentLocation });
    this.setSubmitting('regSubmit', false, 'Salvar cadastro');

    if (!res.ok) {
      return this.showFormError('regError', res.error || 'Não foi possível salvar o cadastro.');
    }

    localStorage.setItem(STORAGE_KEY_SKIP_ONBOARDING, 'true');
    this.closeModal('onboardingModal');
    this.updateProfileBanner();
    this.showToast(res.offline
      ? '✅ Cadastro salvo no celular. Vamos sincronizar quando houver internet.'
      : '✅ Cadastro concluído. Obrigada!');
  },

  showReconfirm() {
    const profile = window.UserModule ? UserModule.getProfile() : null;
    if (!profile) {
      this.openModal('onboardingModal');
      return;
    }

    if (this.dom.reconfirmSummary) {
      this.dom.reconfirmSummary.innerHTML = `
        <div><strong>Nome:</strong> ${this.escapeHtml(profile.fullName)}</div>
        <div><strong>Telefone:</strong> ${this.escapeHtml(UserModule.formatPhone(profile.phone))}</div>
      `;
    }
    if (this.dom.reconfirmPin) {
      this.dom.reconfirmPin.style.display = profile.hasPin ? 'block' : 'none';
      this.dom.reconfirmPin.value = '';
    }
    this.showFormError('reconfirmError', '');
    this.openModal('reconfirmModal');
  },

  async handleReconfirm() {
    const pin = this.dom.reconfirmPin ? this.dom.reconfirmPin.value.trim() : '';
    this.showFormError('reconfirmError', '');
    this.setSubmitting('btnReconfirm', true, 'Confirmando...');
    const res = await UserModule.confirm(pin);
    this.setSubmitting('btnReconfirm', false, 'Confirmar agora');

    if (!res.ok) {
      return this.showFormError('reconfirmError', res.error || 'Não foi possível confirmar.');
    }
    this.closeModal('reconfirmModal');
    this.updateProfileBanner();
    this.showToast('✅ Dados confirmados. Cadastro ativo!');
  },

  openLgpd() {
    if (this.dom.lgpdModal) this.dom.lgpdModal.classList.add('active');
  },

  async toggleLocationConsent() {
    if (!window.UserModule || !UserModule.isRegistered()) {
      this.showToast('ℹ️ Faça o cadastro para registrar seu consentimento de localização.');
      this.openModal('onboardingModal');
      return;
    }
    const next = !UserModule.hasLocationConsent();
    await UserModule.updateConsent({ consentLocation: next });
    this.updateLocationConsentUI();
    this.showToast(next
      ? '📍 Sua localização será compartilhada no socorro.'
      : '📍 Localização desativada. O socorro pode ficar menos preciso.');
  },

  updateLocationConsentUI() {
    const btn = this.dom.btnToggleLocationConsent;
    if (!btn || !window.UserModule) return;
    const on = UserModule.hasLocationConsent();
    btn.textContent = on ? '📍 Compartilhar localização: Sim' : '📍 Compartilhar localização: Não';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('active', on);
  },

  async handleDeleteData() {
    if (!window.UserModule) return;
    const profile = UserModule.getProfile();
    if (!confirm('Apagar seus dados de cadastro, contatos, histórico e áudios deste celular? Esta ação não pode ser desfeita.')) {
      return;
    }

    // Direito ao esquecimento (LGPD): apaga no servidor (com token) e local
    await UserModule.remove();
    try {
      localStorage.removeItem(STORAGE_KEY_LOGS);
      localStorage.removeItem('viva_mulher_emergency_contacts');
    } catch (e) { /* ignore */ }

    this.renderContacts();
    this.renderLogs();
    this.updateProfileBanner();
    this.showToast('🗑️ Seus dados foram apagados.');
  },

  // ==========================================
  // MODAIS / UTILITÁRIOS DE FORMULÁRIO
  // ==========================================
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  },

  showFormError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!message) {
      el.style.display = 'none';
      el.textContent = '';
      return;
    }
    el.style.display = 'block';
    el.textContent = message;
  },

  setSubmitting(id, busy, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = busy;
    el.textContent = label;
  },

  syncAccessibilityUI() {
    if (window.AccessibilityModule) {
      if (this.dom.btnToggleSilentMode) {
        const isSilent = window.AccessibilityModule.isSilentMode();
        this.dom.btnToggleSilentMode.classList.toggle('active', isSilent);
        this.dom.btnToggleSilentMode.setAttribute('aria-pressed', isSilent ? 'true' : 'false');
      }
      if (this.dom.btnToggleHaptic) {
        const isHaptic = window.AccessibilityModule.isVibrationEnabled();
        this.dom.btnToggleHaptic.classList.toggle('active', isHaptic);
        this.dom.btnToggleHaptic.setAttribute('aria-pressed', isHaptic ? 'true' : 'false');
      }
    }
  },

  handleToggleSilentMode() {
    if (!window.AccessibilityModule) return;
    const current = window.AccessibilityModule.isSilentMode();
    const next = !current;
    window.AccessibilityModule.setSilentMode(next);
    this.syncAccessibilityUI();
    this.showToast(next ? '🔇 Modo Não-Falo / Silencioso ativado.' : '🔊 Modo de emergência padrão ativado.');
  },

  handleToggleHaptic() {
    if (!window.AccessibilityModule) return;
    const current = window.AccessibilityModule.isVibrationEnabled();
    const next = !current;
    window.AccessibilityModule.setVibrationEnabled(next);
    this.syncAccessibilityUI();
    this.showToast(next ? '📳 Vibração tátil ativada.' : '📴 Vibração tátil desativada.');
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
      logsList: document.getElementById('logsList'),
      btnClearLocalData: document.getElementById('btnClearLocalData'),
      btnToggleSilentMode: document.getElementById('btnToggleSilentMode'),
      btnToggleHaptic: document.getElementById('btnToggleHaptic'),
      // Perfil / cadastro
      profileBanner: document.getElementById('profileBanner'),
      profileBannerIcon: document.getElementById('profileBannerIcon'),
      profileBannerTitle: document.getElementById('profileBannerTitle'),
      profileBannerSub: document.getElementById('profileBannerSub'),
      profileBannerBtn: document.getElementById('profileBannerBtn'),
      registerForm: document.getElementById('registerForm'),
      regFullName: document.getElementById('regFullName'),
      regPhone: document.getElementById('regPhone'),
      regBirthDate: document.getElementById('regBirthDate'),
      regPin: document.getElementById('regPin'),
      regConsentLgpd: document.getElementById('regConsentLgpd'),
      regConsentLocation: document.getElementById('regConsentLocation'),
      btnSkipOnboarding: document.getElementById('btnSkipOnboarding'),
      linkLgpdInline: document.getElementById('linkLgpdInline'),
      // Reconfirmação
      reconfirmSummary: document.getElementById('reconfirmSummary'),
      reconfirmPin: document.getElementById('reconfirmPin'),
      btnReconfirm: document.getElementById('btnReconfirm'),
      btnReconfirmLater: document.getElementById('btnReconfirmLater'),
      // LGPD / privacidade
      btnOpenLgpd: document.getElementById('btnOpenLgpd'),
      btnCloseLgpd: document.getElementById('btnCloseLgpd'),
      lgpdModal: document.getElementById('lgpdModal'),
      btnToggleLocationConsent: document.getElementById('btnToggleLocationConsent'),
      btnDeleteData: document.getElementById('btnDeleteData')
    };
  },

  bindEvents() {
    const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };

    on(this.dom.btnPanic, 'click', () => this.handlePanicButtonClick());
    on(this.dom.btnCancelPanic, 'click', () => this.cancelPanic());
    on(this.dom.btnRefreshLoc, 'click', () => this.updateGpsStatus(true));
    on(this.dom.btnToggleSilentMode, 'click', () => this.handleToggleSilentMode());
    on(this.dom.btnToggleHaptic, 'click', () => this.handleToggleHaptic());

    on(this.dom.addContactForm, 'submit', (e) => { e.preventDefault(); this.handleAddContact(); });
    on(this.dom.btnManualAudioRecord, 'click', () => this.handleManualAudioRecord());

    // Perfil / cadastro
    on(this.dom.profileBannerBtn, 'click', () => this.handleProfileBannerClick());
    on(this.dom.registerForm, 'submit', (e) => this.handleRegister(e));
    on(this.dom.btnSkipOnboarding, 'click', () => {
      localStorage.setItem(STORAGE_KEY_SKIP_ONBOARDING, 'true');
      this.closeModal('onboardingModal');
      this.showToast('Você pode se cadastrar quando quiser.');
    });
    on(this.dom.linkLgpdInline, 'click', () => this.openLgpd());

    // Reconfirmação
    on(this.dom.btnReconfirm, 'click', () => this.handleReconfirm());
    on(this.dom.btnReconfirmLater, 'click', () => this.closeModal('reconfirmModal'));

    // LGPD / privacidade
    on(this.dom.btnOpenLgpd, 'click', () => this.openLgpd());
    on(this.dom.btnCloseLgpd, 'click', () => this.closeModal('lgpdModal'));
    on(this.dom.btnToggleLocationConsent, 'click', () => this.toggleLocationConsent());
    on(this.dom.btnDeleteData, 'click', () => this.handleDeleteData());

    on(this.dom.btnClearLocalData, 'click', () => this.handleClearLocalData());
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
      if (userInitiated) this.showToast('✅ Localização atualizada com sucesso!');
    } else {
      this.dom.locationStatusDot.className = 'status-dot';
      this.dom.locationStatusText.textContent = 'GPS Indisponível';
      this.dom.locationStatusSub.textContent = (loc && loc.reason) || 'Usando modo de contingência';
      if (userInitiated) this.showToast('⚠️ Não foi possível obter o GPS.');
    }
  },

  // ==========================================
  // BOTÃO DE PÂNICO & FLUXO DE EMERGÊNCIA
  // ==========================================
  handlePanicButtonClick() {
    // O pânico NUNCA depende de cadastro ou consentimento.
    this.startPanicCountdown();
  },

  handleClearLocalData() {
    if (confirm('Apagar contatos, áudios e histórico salvos neste celular?')) {
      try {
        localStorage.removeItem(STORAGE_KEY_LOGS);
        localStorage.removeItem('viva_mulher_emergency_contacts');
      } catch (e) {
        console.error('[AppController] Erro ao limpar dados:', e);
      }
      this.renderContacts();
      this.renderLogs();
      this.showToast('🗑️ Histórico e registros locais apagados.');
    }
  },

  startPanicCountdown() {
    if (this.isPanicArmed) return;

    this.isPanicArmed = true;
    this.countdownSeconds = 3;

    if (window.AccessibilityModule) {
      window.AccessibilityModule.vibrate('PANIC_START');
      window.AccessibilityModule.announce('Iniciando contagem de socorro. Três segundos.');
      window.AccessibilityModule.triggerVisualFlash();
    }

    if (this.dom.countdownNumber) this.dom.countdownNumber.textContent = this.countdownSeconds;
    if (this.dom.countdownOverlay) this.dom.countdownOverlay.classList.add('active');

    // Pré-carrega o GPS em background para o disparo imediato
    if (window.GeolocationModule) window.GeolocationModule.getCurrentLocation();

    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;

      if (this.countdownSeconds <= 0) {
        clearInterval(this.countdownInterval);
        if (this.dom.countdownOverlay) this.dom.countdownOverlay.classList.remove('active');
        this.isPanicArmed = false;
        this.triggerEmergencyAlert();
      } else {
        if (window.AccessibilityModule) {
          window.AccessibilityModule.vibrate('COUNTDOWN_TICK');
          window.AccessibilityModule.announce(this.countdownSeconds + ' segundos');
          window.AccessibilityModule.triggerVisualFlash();
        }
        if (this.dom.countdownNumber) this.dom.countdownNumber.textContent = this.countdownSeconds;
      }
    }, 1000);
  },

  cancelPanic() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.isPanicArmed = false;
    if (this.dom.countdownOverlay) this.dom.countdownOverlay.classList.remove('active');
    if (window.AccessibilityModule) {
      window.AccessibilityModule.vibrate('CANCELLED');
      window.AccessibilityModule.announce('Disparo cancelado');
    }
    this.showToast('✖ Disparo de emergência cancelado.');
  },

  async triggerEmergencyAlert() {
    if (window.AccessibilityModule) {
      window.AccessibilityModule.vibrate('ALERT_SENT');
      window.AccessibilityModule.announce('Alerta de socorro disparado!');
    }
    this.showToast('🚨 Disparando alerta de socorro...');

    // 1. Localização atual
    let loc = window.GeolocationModule ? window.GeolocationModule.currentPosition : null;
    if (!loc) {
      loc = window.GeolocationModule ? await window.GeolocationModule.getCurrentLocation() : { success: false };
    }

    // 2. ID único e horário
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const eventId = 'EVT-' + now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '-' +
      Math.floor(1000 + Math.random() * 9000);

    const isSilent = window.AccessibilityModule ? window.AccessibilityModule.isSilentMode() : false;
    const profile = window.UserModule ? UserModule.getProfile() : null;
    const userName = profile ? profile.fullName : null;

    // 3. Mensagem de socorro
    let message;
    if (window.EmergencyMessageModule) {
      message = window.EmergencyMessageModule.buildMessage({
        eventId, dateFormatted, timeFormatted, loc, isSilent, name: userName
      });
    } else {
      message = `🚨 ALERTA DE EMERGÊNCIA - VIVA MULHER 🚨\n\nPreciso de ajuda!\n📅 ${dateFormatted} 🕐 ${timeFormatted}\n🆔 ${eventId}`;
    }

    // 4. Gravação de áudio de evidência (15s), se disponível
    if (window.AudioModule) window.AudioModule.startRecording(15000);

    // 5. Registro local
    this.saveEmergencyLog({ id: eventId, date: dateFormatted, time: timeFormatted, loc, hasAudio: true });

    // 6. Envia para o backend (best-effort, nunca bloqueia o WhatsApp)
    if (window.Api && profile && profile.id && !String(profile.id).startsWith('local-')) {
      Api.post('/api/alerts', {
        user_id: profile.id,
        location: loc && loc.success
          ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, mapsUrl: loc.mapsUrl }
          : { lat: null, lng: null },
        message,
        battery_level: null
      }).catch(() => {});
    }

    // 7. Envia via WhatsApp para o contato principal
    const contacts = window.ContactsModule ? window.ContactsModule.getContacts() : [];
    const socorroPhone = (window.APP_CONFIG && window.APP_CONFIG.SOCORRO_PHONE) || '552139553874';
    const primaryPhone = contacts.length > 0 ? contacts[0].phone : socorroPhone;

    let whatsappUrl = `https://wa.me/${primaryPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    if (window.EmergencyMessageModule) {
      whatsappUrl = window.EmergencyMessageModule.buildWhatsAppUrl(primaryPhone, message);
    }

    try {
      const win = window.open(whatsappUrl, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = whatsappUrl;
      }
    } catch (e) {
      window.location.href = whatsappUrl;
    }
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
          <a href="https://wa.me/${contact.phone.replace(/\D/g, '')}" target="_blank" rel="noopener" class="btn-sm-action" title="Testar WhatsApp">💬</a>
          ${!contact.isDefault ? `<button class="btn-sm-action delete" data-id="${this.escapeHtml(contact.id)}" title="Excluir">🗑️</button>` : ''}
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
    if (!window.AudioModule) {
      this.showToast('⚠️ Gravação de áudio indisponível neste navegador.');
      return;
    }

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
          ${log.loc && log.loc.success ? `📍 <a href="${this.escapeHtml(log.loc.mapsUrl)}" target="_blank" rel="noopener">Ver mapa de localização</a>` : '📍 Localização indisponível'}
        </div>
        ${log.audioUrl ? `
          <div style="margin-top:6px;">
            <audio controls src="${this.escapeHtml(log.audioUrl)}" style="width:100%; height:32px; border-radius:4px;"></audio>
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
