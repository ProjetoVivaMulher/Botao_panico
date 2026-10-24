/**
 * Viva Mulher - Botão de Pânico
 * Controlador Principal do Aplicativo (AppController)
 *
 * Regra de ouro: o cadastro/reconfirmação são opcionais e NUNCA bloqueiam
 * o acionamento do botão de pânico.
 */

const STORAGE_KEY_LOGS = 'viva_mulher_emergency_logs';
const STORAGE_KEY_SKIP_ONBOARDING = 'viva_mulher_skip_onboarding';
const STORAGE_KEY_LOCATION_ASKED = 'viva_mulher_location_asked';

const AppController = {
  currentView: 'home',
  isFiring: false,
  isRecordingManualAudio: false,
  audioCapture: null,
  lastSosMessage: '',

  init() {
    this.cacheDom();
    this.bindEvents();
    this.switchView('home');
    this.renderContacts();
    this.renderLogs();
    this.syncAccessibilityUI();
    this.initProfile();
    if (window.EvidenceModule) window.EvidenceModule.init();
  },

  // ==========================================
  // PERFIL / CADASTRO / LGPD
  // ==========================================
  initProfile() {
    if (!window.UserModule) {
      this.initLocation();
      return;
    }

    // Migra PIN em texto puro (versões antigas) para hash local
    if (typeof UserModule.migratePin === 'function') {
      UserModule.migratePin().catch(() => {});
    }

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
    } else {
      this.initLocation();
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
    const selfDeclaredWoman = this.dom.regSelfDeclared ? this.dom.regSelfDeclared.checked : false;

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
    if (!selfDeclaredWoman) {
      return this.showFormError('regError', 'Este é um espaço de apoio a mulheres. Marque a declaração para continuar.');
    }
    if (!consentLocation) {
      return this.showFormError('regError', 'É necessário autorizar o compartilhamento da localização no socorro.');
    }

    this.setSubmitting('regSubmit', true, 'Salvando...');
    const res = await UserModule.register({ fullName, phone, birthDate, pin, consentLgpd, consentLocation, selfDeclaredWoman });
    this.setSubmitting('regSubmit', false, 'Salvar cadastro');

    if (!res.ok) {
      return this.showFormError('regError', res.error || 'Não foi possível salvar o cadastro.');
    }

    localStorage.setItem(STORAGE_KEY_SKIP_ONBOARDING, 'true');
    this.closeModal('onboardingModal');

    // Consentimentos locais (data/hora + versão do termo) e pedido de GPS com toque
    if (window.UserModule && UserModule.recordConsent) {
      UserModule.recordConsent('lgpd', true);
      UserModule.recordConsent('location', consentLocation);
      UserModule.recordConsent('selfDeclared', selfDeclaredWoman);
    }
    this.ensureLocationPermission();

    this.updateProfileBanner();
    this.showToast(res.offline
      ? '✅ Cadastro salvo no celular. Vamos sincronizar quando houver internet.'
      : '✅ Cadastro concluído. Obrigada!');
  },

  // Máscara DD/MM/AAAA: insere as barras automaticamente e mantém o cursor no lugar
  applyDateMask(input) {
    const el = input;
    if (!el) return;
    const digitsBeforeCaret = el.value.slice(0, el.selectionStart || 0).replace(/\D/g, '').length;
    const digits = el.value.replace(/\D/g, '').slice(0, 8);

    let out = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 4) out += '/';
      out += digits[i];
    }
    el.value = out;

    let caret;
    if (digitsBeforeCaret <= 0) {
      caret = 0;
    } else if (digitsBeforeCaret >= digits.length) {
      caret = out.length;
    } else {
      let seen = 0;
      caret = out.length;
      for (let i = 0; i < out.length; i++) {
        if (/\d/.test(out[i])) {
          seen++;
          if (seen === digitsBeforeCaret) { caret = i + 1; break; }
        }
      }
    }
    try { el.setSelectionRange(caret, caret); } catch (_) { /* ignore */ }
  },

  // Exige os três consentimentos: Termo/LGPD, autodeclaração e compartilhamento de localização
  allConsentsChecked() {
    return !!(
      this.dom.regConsentLgpd && this.dom.regConsentLgpd.checked &&
      this.dom.regSelfDeclared && this.dom.regSelfDeclared.checked &&
      this.dom.regConsentLocation && this.dom.regConsentLocation.checked
    );
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

  async handleDeleteData() {
    if (!window.UserModule) return;
    const profile = UserModule.getProfile();
    if (!confirm('Apagar seus dados de cadastro, pessoas de confiança, histórico, áudios e provas deste celular? Esta ação não pode ser desfeita.')) {
      return;
    }

    // Direito ao esquecimento (LGPD): apaga no servidor (com token) e local
    await UserModule.remove();
    try {
      localStorage.removeItem(STORAGE_KEY_LOGS);
      localStorage.removeItem('viva_mulher_emergency_contacts');
      localStorage.removeItem(STORAGE_KEY_SKIP_ONBOARDING);
      localStorage.removeItem(STORAGE_KEY_LOCATION_ASKED);
    } catch (e) { /* ignore */ }
    if (window.AudioStore) {
      try { await window.AudioStore.clear(); } catch (e) { /* ignore */ }
    }
    if (window.EvidenceStore) {
      try { await window.EvidenceStore.clear(); } catch (e) { /* ignore */ }
    }

    if (window.EvidenceModule) window.EvidenceModule.render();
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
      appContent: document.getElementById('appContent'),
      btnPanic: document.getElementById('btnPanic'),
      btnPanicFloat: document.getElementById('btnPanicFloat'),
      tabEvidenceBadge: document.getElementById('tabEvidenceBadge'),
      toastNotification: document.getElementById('toastNotification'),
      toastText: document.getElementById('toastText'),
      locationStatusDot: document.getElementById('locationStatusDot'),
      locationStatusText: document.getElementById('locationStatusText'),
      locationStatusSub: document.getElementById('locationStatusSub'),
      btnRequestLocation: document.getElementById('btnRequestLocation'),
      locationModal: document.getElementById('locationModal'),
      locationModalBody: document.getElementById('locationModalBody'),
      btnEnableLocation: document.getElementById('btnEnableLocation'),
      btnLocationLater: document.getElementById('btnLocationLater'),
      contactsList: document.getElementById('contactsList'),
      addContactForm: document.getElementById('addContactForm'),
      contactNameInput: document.getElementById('contactNameInput'),
      contactRelationInput: document.getElementById('contactRelationInput'),
      contactPhoneInput: document.getElementById('contactPhoneInput'),
      sosShareModal: document.getElementById('sosShareModal'),
      sosContactsList: document.getElementById('sosContactsList'),
      sosOfflineNote: document.getElementById('sosOfflineNote'),
      btnCopySosMessage: document.getElementById('btnCopySosMessage'),
      btnCloseSosShare: document.getElementById('btnCloseSosShare'),
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
      regSelfDeclared: document.getElementById('regSelfDeclared'),
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
      btnDeleteData: document.getElementById('btnDeleteData')
    };
  },

  bindEvents() {
    const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };

    on(this.dom.btnPanic, 'click', () => this.handlePanicButtonClick());
    on(this.dom.btnPanicFloat, 'click', () => this.handlePanicButtonClick());

    // Navegação por abas (Início / Provas / Pessoas)
    const tabs = Array.from(document.querySelectorAll('.tab-btn'));
    tabs.forEach((tab) => {
      on(tab, 'click', () => this.switchView(tab.dataset.view));
      on(tab, 'keydown', (event) => this.handleTabKeydown(event));
    });

    on(this.dom.btnEnableLocation, 'click', () => this.requestLocationFromGesture());
    on(this.dom.btnLocationLater, 'click', () => this.dismissLocationPrompt());
    on(this.dom.btnRequestLocation, 'click', () => this.handleRequestLocationClick());
    on(this.dom.btnToggleSilentMode, 'click', () => this.handleToggleSilentMode());
    on(this.dom.btnToggleHaptic, 'click', () => this.handleToggleHaptic());

    on(this.dom.addContactForm, 'submit', (e) => { e.preventDefault(); this.handleAddContact(); });
    on(this.dom.btnManualAudioRecord, 'click', () => this.handleManualAudioRecord());
    on(this.dom.btnCloseSosShare, 'click', () => this.closeSosShare());
    on(this.dom.btnCopySosMessage, 'click', () => this.copySosMessage());

    // Perfil / cadastro
    on(this.dom.profileBannerBtn, 'click', () => this.handleProfileBannerClick());
    on(this.dom.registerForm, 'submit', (e) => this.handleRegister(e));
    on(this.dom.regBirthDate, 'input', (e) => this.applyDateMask(e.target));
    on(this.dom.btnSkipOnboarding, 'click', () => {
      if (!this.allConsentsChecked()) {
        return this.showFormError('regError', 'Para continuar, marque as três opções: aceitar o Termo/LGPD, a declaração e o compartilhamento da localização.');
      }
      localStorage.setItem(STORAGE_KEY_SKIP_ONBOARDING, 'true');
      if (window.UserModule && UserModule.recordConsent) {
        UserModule.recordConsent('lgpd', true);
        UserModule.recordConsent('location', true);
        UserModule.recordConsent('selfDeclared', true);
      }
      this.closeModal('onboardingModal');
      this.showToast('Você pode se cadastrar quando quiser.');
      this.ensureLocationPermission();
    });
    on(this.dom.linkLgpdInline, 'click', () => this.openLgpd());

    // Reconfirmação
    on(this.dom.btnReconfirm, 'click', () => this.handleReconfirm());
    on(this.dom.btnReconfirmLater, 'click', () => this.closeModal('reconfirmModal'));

    // LGPD / privacidade
    on(this.dom.btnOpenLgpd, 'click', () => this.openLgpd());
    on(this.dom.btnCloseLgpd, 'click', () => this.closeModal('lgpdModal'));
    on(this.dom.btnDeleteData, 'click', () => this.handleDeleteData());

    on(this.dom.btnClearLocalData, 'click', () => this.handleClearLocalData());
  },

  // ==========================================
  // NAVEGAÇÃO POR ABAS
  // ==========================================
  switchView(view) {
    const views = ['home', 'evidence', 'contacts'];
    const next = views.indexOf(view) >= 0 ? view : 'home';
    this.currentView = next;

    document.querySelectorAll('.app-view').forEach((section) => {
      section.hidden = section.dataset.view !== next;
    });

    document.querySelectorAll('.tab-btn').forEach((tab) => {
      const active = tab.dataset.view === next;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });

    // O SOS fica sempre disponível: botão grande na Início e flutuante nas demais abas.
    if (this.dom.btnPanicFloat) this.dom.btnPanicFloat.hidden = next === 'home';
    if (this.dom.appContent) this.dom.appContent.scrollTop = 0;

    if (next === 'evidence' && window.EvidenceModule) window.EvidenceModule.render();
    if (next === 'contacts') this.renderContacts();
  },

  handleTabKeydown(event) {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (keys.indexOf(event.key) < 0) return;
    event.preventDefault();

    const tabs = Array.from(document.querySelectorAll('.tab-btn'));
    const index = tabs.indexOf(event.currentTarget);
    if (index < 0) return;

    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;

    if (tabs[next]) {
      this.switchView(tabs[next].dataset.view);
      tabs[next].focus();
    }
  },

  updateEvidenceBadge(count) {
    const badge = this.dom.tabEvidenceBadge;
    if (!badge) return;
    const total = Number(count) || 0;
    badge.textContent = String(total);
    badge.hidden = total === 0;
  },

  // ==========================================
  // GEOLOCALIZAÇÃO & STATUS
  // ==========================================
  initLocation() {
    if (!window.GeolocationModule) return;
    window.GeolocationModule.getPermissionState().then((state) => {
      if (state === 'granted') {
        this.markLocationAsked();
        this.updateGpsStatus();
        return;
      }
      if (state === 'denied') {
        this.showLocationNeedsActivation('denied');
        return;
      }
      // iOS/Safari não expõe a Permissions API: o estado chega como 'prompt'
      // e o pedido do sistema só pode ser feito no toque da usuária.
      const consented = window.UserModule && UserModule.hasLocationConsent();
      if (consented && !this.locationWasAsked()) {
        this.openLocationModal(state);
      } else {
        this.showLocationNeedsActivation(state);
      }
    }).catch(() => {
      this.showLocationNeedsActivation('prompt');
    });
  },

  locationWasAsked() {
    try { return localStorage.getItem(STORAGE_KEY_LOCATION_ASKED) === 'true'; } catch (e) { return false; }
  },

  markLocationAsked() {
    try { localStorage.setItem(STORAGE_KEY_LOCATION_ASKED, 'true'); } catch (e) { /* ignore */ }
  },

  // Mensagens de "como liberar" adaptadas ao aparelho (não existe Permissions API no iOS).
  isIOSDevice() {
    const ua = navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return iOS;
  },

  isStandaloneApp() {
    return window.navigator.standalone === true ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
  },

  locationHelpText() {
    if (this.isIOSDevice()) {
      return this.isStandaloneApp()
        ? 'No iPhone, com o app instalado: Ajustes › Privacidade e Segurança › Localização › Viva Mulher › marque "Ao Usar o App".'
        : 'No iPhone (Safari): toque em "Aa" na barra de endereço › Configurações do Site › Localização › Permitir. Ou em Ajustes › Privacidade e Segurança › Localização › Safari › "Ao Usar o App".';
    }
    return 'No Android (Chrome): toque no cadeado ao lado do endereço › Permissões › Localização › Permitir.';
  },

  setGpsChecking() {
    if (this.dom.locationStatusDot) this.dom.locationStatusDot.className = 'status-dot';
    if (this.dom.locationStatusText) this.dom.locationStatusText.textContent = 'Verificando localização…';
    if (this.dom.locationStatusSub) this.dom.locationStatusSub.textContent = 'Buscando sinal de GPS';
    const action = this.dom.btnRequestLocation;
    if (action) {
      action.hidden = true;
      action.dataset.state = 'checking';
      action.textContent = 'Ativar';
    }
  },

  applyLocationResult(loc, userInitiated = false) {
    const result = loc || {};
    if (!this.dom.locationStatusDot) return;

    if (result.success) {
      this.dom.locationStatusDot.className = 'status-dot active';
      if (this.dom.locationStatusText) this.dom.locationStatusText.textContent = 'Localização ativa';
      if (this.dom.locationStatusSub) {
        this.dom.locationStatusSub.textContent = `Precisão de aproximadamente ${result.accuracy} m`;
      }
      if (this.dom.btnRequestLocation) {
        this.dom.btnRequestLocation.hidden = true;
        this.dom.btnRequestLocation.dataset.state = 'granted';
      }
      if (userInitiated) this.showToast('📍 Localização ativada. Você está mais protegida.');
      return;
    }

    if (result.permissionDenied) {
      this.showLocationNeedsActivation('denied');
      if (userInitiated) this.showToast('🔒 A localização está bloqueada neste navegador.');
      return;
    }

    this.dom.locationStatusDot.className = 'status-dot';
    if (this.dom.locationStatusText) this.dom.locationStatusText.textContent = 'Localização indisponível';
    if (this.dom.locationStatusSub) {
      this.dom.locationStatusSub.textContent = 'O socorro continua funcionando. Se puder, ligue o GPS do celular e toque em "Tentar".';
    }
    const action = this.dom.btnRequestLocation;
    if (action) {
      action.hidden = false;
      action.dataset.state = 'prompt';
      action.textContent = 'Tentar';
    }
    if (userInitiated) this.showToast('⚠️ Não foi possível obter o GPS agora.');
  },

  async updateGpsStatus(userInitiated = false) {
    if (!this.dom.locationStatusDot || !window.GeolocationModule) return;

    const state = await window.GeolocationModule.getPermissionState();

    if (state === 'unsupported') {
      this.showLocationNeedsActivation('unsupported');
      return;
    }
    if (state === 'denied') {
      this.showLocationNeedsActivation('denied');
      return;
    }

    // 'prompt' (caso do iPhone, que não tem Permissions API) não é bloqueio:
    // tentamos a leitura e o próprio sistema mostra o pedido de permissão.
    this.setGpsChecking();
    const loc = await window.GeolocationModule.getCurrentLocation(15000);
    this.applyLocationResult(loc, userInitiated);
  },

  showLocationNeedsActivation(state) {
    if (this.dom.locationStatusDot) this.dom.locationStatusDot.className = 'status-dot';
    if (this.dom.locationStatusText) {
      this.dom.locationStatusText.textContent = state === 'unsupported'
        ? 'Localização não suportada'
        : 'Localização desativada';
    }
    if (this.dom.locationStatusSub) {
      this.dom.locationStatusSub.textContent = state === 'denied'
        ? 'Permissão bloqueada no navegador. Toque em "Como liberar" para ver o caminho no seu aparelho.'
        : 'Ative a localização para um socorro mais preciso.';
    }
    const action = this.dom.btnRequestLocation;
    if (action) {
      action.dataset.state = state || 'prompt';
      action.hidden = state === 'unsupported';
      action.textContent = state === 'denied' ? 'Como liberar' : 'Ativar';
    }
  },

  handleRequestLocationClick() {
    const action = this.dom.btnRequestLocation;
    const state = action ? action.dataset.state : '';
    if (state === 'unsupported') return;
    if (state === 'denied') {
      this.openLocationModal('denied');
      return;
    }
    this.requestLocationFromGesture();
  },

  // Convite único: depois do aceite, o app não volta a pedir permissão/consentimento.
  async ensureLocationPermission() {
    if (!window.GeolocationModule) return;
    const state = await window.GeolocationModule.getPermissionState();
    if (state === 'granted') {
      this.markLocationAsked();
      this.updateGpsStatus(true);
      return;
    }
    this.openLocationModal(state);
  },

  openLocationModal(state) {
    if (!this.dom.locationModal) return;
    const denied = state === 'denied';
    if (this.dom.locationModalBody) {
      this.dom.locationModalBody.innerHTML = denied
        ? '<p class="sheet-sub">A localização está <strong>bloqueada</strong> neste navegador. Libere o acesso nas configurações e volte aqui.</p>' +
          `<p class="sheet-sub">${this.escapeHtml(this.locationHelpText())}</p>`
        : '<p class="sheet-sub">Sua localização ajuda o socorro a chegar até você. Ela é usada <strong>apenas quando você aciona o botão de pânico</strong> — não há rastreamento contínuo.</p>' +
          '<p class="sheet-sub">Ao tocar abaixo, o celular vai pedir a confirmação de acesso à localização. Toque em <strong>Permitir</strong>.</p>';
    }
    if (this.dom.btnEnableLocation) {
      this.dom.btnEnableLocation.textContent = denied ? 'Já liberei, tentar de novo' : 'Permitir localização';
    }
    this.openModal('locationModal');
  },

  // Chamado num toque real da usuária. No iOS o pedido de permissão só aparece se
  // `getCurrentPosition` for chamado ainda dentro do gesto — por isso não existe
  // nenhum `await` antes da chamada do GPS aqui.
  requestLocationFromGesture() {
    this.markLocationAsked();
    this.closeModal('locationModal');

    const geo = window.GeolocationModule;
    if (!geo) return;

    if (window.UserModule && UserModule.recordConsent && !UserModule.hasLocationConsent()) {
      UserModule.recordConsent('location', true);
    }
    if (window.UserModule && typeof UserModule.updateConsent === 'function') {
      UserModule.updateConsent({ consentLocation: true }).catch(() => {});
    }

    this.setGpsChecking();

    geo.getCurrentLocation(15000)
      .then((loc) => this.applyLocationResult(loc, true))
      .catch(() => this.applyLocationResult({ success: false }, true));
  },

  dismissLocationPrompt() {
    this.markLocationAsked();
    this.closeModal('locationModal');
    if (window.GeolocationModule) {
      window.GeolocationModule.getPermissionState().then((state) => {
        if (state === 'granted') {
          this.updateGpsStatus();
          return;
        }
        this.showLocationNeedsActivation(state);
      }).catch(() => {
        this.showLocationNeedsActivation('prompt');
      });
    }
  },

  // ==========================================
  // BOTÃO DE PÂNICO & FLUXO DE EMERGÊNCIA
  // ==========================================
  // Regra de ouro: um toque dispara o socorro. Sem cadastro, sem consentimento
  // e sem confirmação — o WhatsApp abre automaticamente com a mensagem pronta.
  handlePanicButtonClick() {
    if (this.isFiring) return;
    this.isFiring = true;
    setTimeout(() => { this.isFiring = false; }, 4000);

    if (window.AccessibilityModule) {
      window.AccessibilityModule.vibrate('PANIC_START');
      window.AccessibilityModule.announce('Pedido de socorro enviado. Abrindo o WhatsApp.');
      window.AccessibilityModule.triggerVisualFlash();
    }

    const geo = window.GeolocationModule;
    const cached = geo ? (geo.currentPosition || geo.lastKnownGoodPosition) : null;

    if (geo) {
      // Toque = gesto válido para o navegador pedir a permissão de GPS.
      geo.startWatching();
      geo.getCurrentLocation(4000).catch(() => {});
    }

    const now = new Date();
    const eventId = this.buildEventId(now);

    // O áudio de 15 s começa imediatamente, antes de qualquer espera.
    this.startPanicAudio(eventId);
    this.triggerEmergencyAlert({ cachedLoc: cached, eventId, now });
  },

  buildEventId(now) {
    return 'EVT-' + now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + '-' +
      Math.floor(1000 + Math.random() * 9000);
  },

  startPanicAudio(eventId) {
    if (!window.AudioModule || window.AudioModule.isRecording) return;
    this.audioCapture = { source: 'panic', eventId };
    window.AudioModule.startRecording(15000).then((started) => {
      if (!started && this.audioCapture && this.audioCapture.eventId === eventId) {
        this.audioCapture = null;
      }
    });
  },

  handleClearLocalData() {
    if (confirm('Apagar pessoas de confiança, áudios, provas e histórico salvos neste celular?')) {
      try {
        localStorage.removeItem(STORAGE_KEY_LOGS);
        localStorage.removeItem('viva_mulher_emergency_contacts');
      } catch (e) {
        console.error('[AppController] Erro ao limpar dados:', e);
      }
      if (window.AudioStore) {
        window.AudioStore.clear().catch(() => {});
      }
      if (window.EvidenceStore) {
        window.EvidenceStore.clear().catch(() => {});
      }
      if (window.EvidenceModule) window.EvidenceModule.render();
      this.renderContacts();
      this.renderLogs();
      this.showToast('🗑️ Histórico, provas e registros locais apagados.');
    }
  },

  // Espera curta por uma leitura de GPS melhor; o socorro NUNCA fica preso nisso.
  waitForLocation(maxWaitMs) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const tick = () => {
        const geo = window.GeolocationModule;
        const current = geo ? (geo.currentPosition || geo.lastKnownGoodPosition) : null;
        if (current && current.success) return resolve(current);
        if (Date.now() - startedAt >= maxWaitMs) return resolve(current || null);
        setTimeout(tick, 150);
      };
      tick();
    });
  },

  // Monta a mensagem de socorro (usada no pânico e no envio manual para uma pessoa).
  composeAlert({ eventId, now, loc }) {
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const isSilent = window.AccessibilityModule ? window.AccessibilityModule.isSilentMode() : false;
    const profile = window.UserModule ? UserModule.getProfile() : null;
    const userName = profile ? profile.fullName : null;

    const message = window.EmergencyMessageModule
      ? window.EmergencyMessageModule.buildMessage({
          eventId, dateFormatted, timeFormatted, loc: loc || { success: false }, isSilent, name: userName
        })
      : `🚨 ALERTA DE EMERGÊNCIA - VIVA MULHER 🚨\n\nPreciso de ajuda!\n📅 ${dateFormatted} 🕐 ${timeFormatted}\n🆔 ${eventId}`;

    return { message, dateFormatted, timeFormatted, profile };
  },

  async triggerEmergencyAlert({ cachedLoc, eventId, now }) {
    let loc = cachedLoc && cachedLoc.success ? cachedLoc : null;

    if (!loc && window.GeolocationModule) {
      loc = await this.waitForLocation(2000);
    }

    const { message, dateFormatted, timeFormatted, profile } = this.composeAlert({ eventId, now, loc });

    // 1. Registro local (nunca depende de internet)
    this.saveEmergencyLog({
      id: eventId,
      date: dateFormatted,
      time: timeFormatted,
      loc: loc || { success: false },
      hasAudio: false,
      evidenceId: null
    });

    // 3. Central Viva Mulher: registra o alerta no painel de atendimento.
    //    Best-effort: se estiver offline, o registro local continua valendo.
    this.notifyCentral({ eventId, loc, message, profile });

    // 4. Folha de SOS com todas as pessoas (e a Central por último)
    this.showSosShare(message);

    // 5. WhatsApp automático: telefone cadastrado + Central (best-effort)
    this.openWhatsAppForTargets(message);

    if (window.AccessibilityModule) {
      window.AccessibilityModule.vibrate('ALERT_SENT');
      window.AccessibilityModule.announce('Alerta de socorro disparado!');
    }

    this.showToast(navigator.onLine
      ? '🚨 Socorro disparado! Confirme o envio no WhatsApp.'
      : '📴 Sem internet: socorro salvo no aparelho. Ligue 190.');

    if (window.GeolocationModule) window.GeolocationModule.stopWatching();
  },

  // Envia o alerta para o painel da Central (e guarda o ID do evento).
  notifyCentral({ eventId, loc, message, profile }) {
    if (!window.Api || !navigator.onLine) return;
    const user = profile && profile.id ? profile.id : 'anonymous';
    window.Api.post('/api/alerts', {
      eventId,
      user_id: user,
      location: loc && loc.success
        ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, mapsUrl: loc.mapsUrl }
        : { lat: null, lng: null },
      message,
      battery_level: null
    }).catch(() => {});
  },

  // Abre o WhatsApp automaticamente para o telefone cadastrado e, em seguida,
  // para a Central. Cada link do WhatsApp atende UM número; quando o navegador
  // bloqueia a segunda janela, a folha de SOS deixa a Central a um toque.
  openWhatsAppForTargets(message) {
    if (!navigator.onLine) return;

    const targets = this.getSosTargets();
    if (!targets.length) return;

    const primary = targets[0];
    const central = targets.find((t) => t.isDefault) ||
      { name: (window.APP_CONFIG && window.APP_CONFIG.SOCORRO_NAME) || 'Central Viva Mulher', phone: (window.APP_CONFIG && window.APP_CONFIG.SOCORRO_PHONE) || '552139553874' };

    const primaryOpened = this.openWhatsAppWindow(primary.phone, message);
    if (!primaryOpened) {
      // Sem gesto do usuário (ou pop-up bloqueado): navega na mesma aba.
      this.navigateToWhatsApp(primary.phone, message);
      return;
    }

    if (String(central.phone).replace(/\D/g, '') !== String(primary.phone).replace(/\D/g, '')) {
      this.openWhatsAppWindow(central.phone, message);
    }
  },

  openWhatsAppWindow(phone, message) {
    const number = String(phone || '').replace(/\D/g, '');
    if (!number) return false;
    const url = window.EmergencyMessageModule
      ? window.EmergencyMessageModule.buildWhatsAppUrl(number, message)
      : `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    try {
      const win = window.open(url, '_blank');
      if (win) {
        try { win.opener = null; } catch (e) { /* ignore */ }
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  },

  navigateToWhatsApp(phone, message) {
    const number = String(phone || '').replace(/\D/g, '');
    if (!number) return;
    const url = window.EmergencyMessageModule
      ? window.EmergencyMessageModule.buildWhatsAppUrl(number, message)
      : `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    try { window.location.href = url; } catch (e) { /* ignore */ }
  },

  // ==========================================
  // SOS PARA AS PESSOAS DE CONFIANÇA
  // ==========================================
  getSosTargets() {
    if (window.ContactsModule) {
      if (typeof window.ContactsModule.getAlertTargets === 'function') {
        return window.ContactsModule.getAlertTargets();
      }
      return window.ContactsModule.getContacts();
    }
    const socorroPhone = (window.APP_CONFIG && window.APP_CONFIG.SOCORRO_PHONE) || '552139553874';
    const socorroName = (window.APP_CONFIG && window.APP_CONFIG.SOCORRO_NAME) || 'Central Viva Mulher (Socorro)';
    return [{ id: 'default-1', name: socorroName, phone: socorroPhone, isDefault: true }];
  },

  showSosShare(message) {
    this.lastSosMessage = message || '';
    const list = this.dom.sosContactsList;
    if (!list) return;

    if (this.dom.sosOfflineNote) this.dom.sosOfflineNote.hidden = navigator.onLine;

    const targets = this.getSosTargets();
    list.innerHTML = '';

    if (targets.length === 0) {
      list.innerHTML = '<div class="sos-empty">Nenhuma pessoa cadastrada. Ligue 190 ou cadastre alguém em "Pessoas".</div>';
    }

    targets.forEach((contact) => {
      const phone = String(contact.phone || '').replace(/\D/g, '');
      const url = window.EmergencyMessageModule
        ? window.EmergencyMessageModule.buildWhatsAppUrl(phone, this.lastSosMessage)
        : `https://wa.me/${phone}?text=${encodeURIComponent(this.lastSosMessage)}`;

      const link = document.createElement('a');
      link.className = contact.isDefault ? 'sos-person central' : 'sos-person';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const relation = contact.relation ? ` • ${this.escapeHtml(contact.relation)}` : '';
      const role = contact.isDefault ? 'Central Viva Mulher' : 'Pessoa de confiança';
      link.innerHTML = `
        <span class="sos-person-avatar" aria-hidden="true">${contact.isDefault ? '🛡️' : '💬'}</span>
        <span class="sos-person-body">
          <strong>${this.escapeHtml(contact.name)}${relation}</strong>
          <small>${role} · ${this.escapeHtml(this.formatPhone(phone))}</small>
        </span>
        <span class="sos-person-go">${contact.isDefault ? 'Enviar' : 'Abrir'}</span>
      `;
      link.addEventListener('click', () => link.classList.add('sent'));
      list.appendChild(link);
    });

    this.openModal('sosShareModal');
  },

  closeSosShare() {
    this.closeModal('sosShareModal');
  },

  async copySosMessage() {
    if (!this.lastSosMessage) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(this.lastSosMessage);
      } else {
        const area = document.createElement('textarea');
        area.value = this.lastSosMessage;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      this.showToast('📋 Mensagem copiada. Cole no WhatsApp de quem quiser.');
    } catch (e) {
      this.showToast('⚠️ Não foi possível copiar a mensagem.');
    }
  },

  formatPhone(phone) {
    if (window.UserModule && typeof UserModule.formatPhone === 'function') {
      return UserModule.formatPhone(phone);
    }
    return String(phone || '').replace(/\D/g, '');
  },

  // ==========================================
  // GERENCIAMENTO DE CONTATOS
  // ==========================================
  renderContacts() {
    if (!this.dom.contactsList || !window.ContactsModule) return;

    const contacts = window.ContactsModule.getContacts();
    this.dom.contactsList.innerHTML = '';

    if (contacts.length === 0) {
      this.dom.contactsList.innerHTML = '<div class="empty-state small">Nenhuma pessoa cadastrada. O SOS vai para a Central Viva Mulher.</div>';
      return;
    }

    contacts.forEach((contact) => {
      const item = document.createElement('div');
      item.className = 'contact-item';
      const relation = contact.relation ? ` · ${this.escapeHtml(contact.relation)}` : '';
      item.innerHTML = `
        <div class="contact-main">
          <div class="contact-info">
            <span class="contact-name">${this.escapeHtml(contact.name)} ${contact.isDefault ? '<small class="contact-badge">Central</small>' : ''}</span>
            <span class="contact-phone">📱 ${this.escapeHtml(this.formatPhone(contact.phone))}${relation}</span>
          </div>
          <div class="contact-actions">
            <a href="https://wa.me/${String(contact.phone).replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" class="btn-sm-action" title="Testar WhatsApp" aria-label="Testar WhatsApp de ${this.escapeHtml(contact.name)}">💬</a>
            ${!contact.isDefault ? `<button class="btn-sm-action delete" data-id="${this.escapeHtml(contact.id)}" title="Excluir" aria-label="Excluir ${this.escapeHtml(contact.name)}">🗑️</button>` : ''}
          </div>
        </div>
        <button type="button" class="btn-send-alert" data-id="${this.escapeHtml(contact.id)}">
          🚨 Avisar agora
        </button>
      `;

      const sendBtn = item.querySelector('.btn-send-alert');
      if (sendBtn) {
        sendBtn.addEventListener('click', () => this.sendAlertToContact(contact.id, sendBtn));
      }

      const deleteBtn = item.querySelector('.delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          window.ContactsModule.removeContact(contact.id);
          this.renderContacts();
          this.showToast('Pessoa de confiança removida.');
        });
      }

      this.dom.contactsList.appendChild(item);
    });
  },

  // Envio manual do alerta real (com localização) para uma pessoa específica.
  // Serve para avisar depois, ou quando o envio automático do pânico não abriu.
  async sendAlertToContact(contactId, button) {
    if (this.sendingAlertTo) return;

    const contact = window.ContactsModule
      ? window.ContactsModule.getContacts().find((c) => c.id === contactId)
      : null;

    if (!contact) {
      this.showToast('⚠️ Pessoa não encontrada. Atualize a lista.');
      return;
    }

    this.sendingAlertTo = contactId;
    const originalLabel = button ? button.innerHTML : '';
    if (button) {
      button.disabled = true;
      button.innerHTML = '📡 Preparando alerta...';
    }

    try {
      if (window.AccessibilityModule) {
        window.AccessibilityModule.vibrate('PANIC_START');
        window.AccessibilityModule.announce('Preparando alerta para ' + contact.name);
      }

      let loc = window.GeolocationModule
        ? (window.GeolocationModule.currentPosition || window.GeolocationModule.lastKnownGoodPosition)
        : null;

      if (!loc || !loc.success) {
        if (window.GeolocationModule) window.GeolocationModule.getCurrentLocation(4000).catch(() => {});
        loc = await this.waitForLocation(2000);
      }

      const now = new Date();
      const eventId = this.buildEventId(now);
      const { message, dateFormatted, timeFormatted, profile } = this.composeAlert({ eventId, now, loc });

      // Histórico local: o envio manual também é um pedido de socorro registrado.
      this.saveEmergencyLog({
        id: eventId,
        date: dateFormatted,
        time: timeFormatted,
        loc: loc || { success: false },
        hasAudio: false,
        evidenceId: null,
        targetName: contact.name
      });

      // O painel da Central também fica sabendo do alerta.
      this.notifyCentral({ eventId, loc, message, profile });

      const opened = this.openWhatsAppWindow(contact.phone, message);
      if (!opened) this.navigateToWhatsApp(contact.phone, message);

      if (window.AccessibilityModule) {
        window.AccessibilityModule.vibrate('ALERT_SENT');
        window.AccessibilityModule.announce('Alerta preparado para ' + contact.name);
      }

      this.showToast(navigator.onLine
        ? '🚨 Alerta preparado para ' + contact.name + '. Toque em enviar no WhatsApp.'
        : '📴 Sem internet: alerta salvo no aparelho. Ligue 190.');
    } catch (error) {
      console.error('[AppController] Erro ao enviar alerta manual:', error);
      this.showToast('⚠️ Não foi possível preparar o alerta. Tente novamente.');
    } finally {
      this.sendingAlertTo = null;
      if (button) {
        button.disabled = false;
        button.innerHTML = originalLabel;
      }
    }
  },

  handleAddContact() {
    const name = this.dom.contactNameInput.value.trim();
    const relation = this.dom.contactRelationInput ? this.dom.contactRelationInput.value.trim() : '';
    const phone = this.dom.contactPhoneInput.value.trim();

    if (!name || !phone) {
      this.showToast('⚠️ Preencha o nome e o WhatsApp.');
      return;
    }

    if (window.ContactsModule) {
      try {
        window.ContactsModule.addContact(name, phone, relation);
        this.dom.contactNameInput.value = '';
        if (this.dom.contactRelationInput) this.dom.contactRelationInput.value = '';
        this.dom.contactPhoneInput.value = '';
        this.renderContacts();
        this.showToast('✅ Pessoa de confiança salva! Ela receberá seu SOS.');
      } catch (error) {
        this.showToast('⚠️ ' + (error && error.message ? error.message : 'Não foi possível salvar.'));
      }
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
      this.resetManualAudioButton();
      this.showToast('Gravação de áudio finalizada.');
      return;
    }

    if (window.AudioModule.isRecording) return;

    this.audioCapture = { source: 'manual', eventId: null };
    const started = await window.AudioModule.startRecording(15000);
    if (started) {
      this.isRecordingManualAudio = true;
      if (this.dom.manualAudioText) this.dom.manualAudioText.textContent = 'Gravando… toque para parar';
      if (this.dom.manualAudioIcon) this.dom.manualAudioIcon.textContent = '🔴';
      if (this.dom.btnManualAudioRecord) this.dom.btnManualAudioRecord.classList.add('recording');
      this.showToast('🎙️ Gravando áudio de prova (15 segundos)...');
    } else {
      if (this.audioCapture && this.audioCapture.source === 'manual') this.audioCapture = null;
      this.showToast('⚠️ Permissão de microfone não concedida.');
    }
  },

  resetManualAudioButton() {
    if (this.dom.manualAudioText) this.dom.manualAudioText.textContent = 'Gravar áudio como prova (15s)';
    if (this.dom.manualAudioIcon) this.dom.manualAudioIcon.textContent = '🎙️';
    if (this.dom.btnManualAudioRecord) this.dom.btnManualAudioRecord.classList.remove('recording');
  },

  async onAudioRecorded(audioUrl, audioBlob) {
    this.isRecordingManualAudio = false;
    this.resetManualAudioButton();

    const ctx = this.audioCapture || { source: 'manual', eventId: null };
    this.audioCapture = null;

    const record = await this.saveAudioEvidence(audioBlob, ctx);

    if (ctx.source === 'panic') {
      if (record) {
        this.attachEvidenceToLog(ctx.eventId, record.id);
        this.showToast('✅ Áudio de 15s salvo em Documentos e provas.');
      } else {
        this.attachAudioToLatestLog(audioBlob, ctx.eventId);
        this.showToast('✅ Áudio de evidência salvo no aparelho.');
      }
    } else if (record) {
      this.showToast('✅ Áudio salvo em Documentos e provas.');
    } else {
      this.showToast('⚠️ Não foi possível salvar o áudio como prova.');
    }

    if (audioUrl) {
      // A URL em memória não sobrevive ao recarregamento; a prova é recriada do Blob salvo.
      setTimeout(() => {
        try { URL.revokeObjectURL(audioUrl); } catch (e) { /* ignore */ }
      }, 1000);
    }
  },

  async saveAudioEvidence(blob, ctx) {
    if (!blob || !window.EvidenceModule) return null;
    return window.EvidenceModule.saveBlob(blob, {
      kind: 'audio',
      source: ctx.source || 'manual',
      eventId: ctx.eventId || null,
      durationMs: 15000
    });
  },

  attachEvidenceToLog(eventId, evidenceId) {
    const logs = this.getLogs();
    const target = eventId ? logs.find((log) => log.id === eventId) : logs[0];
    if (!target) return;

    delete target.audioUrl;
    target.evidenceId = evidenceId;
    target.hasAudio = true;
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
      this.renderLogs();
    } catch (e) {
      console.error('[AppController] Erro ao vincular o áudio ao registro:', e);
    }
  },

  // Remove a referência de uma prova apagada, para o histórico não apontar para o vazio.
  forgetEvidence(evidenceId) {
    const logs = this.getLogs();
    let changed = false;
    logs.forEach((log) => {
      if (log.evidenceId === evidenceId) {
        delete log.evidenceId;
        log.hasAudio = false;
        changed = true;
      }
    });
    if (!changed) return;
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
      this.renderLogs();
    } catch (e) {
      console.error('[AppController] Erro ao atualizar o histórico:', e);
    }
  },

  // ==========================================
  // HISTÓRICO DE LOGS
  // ==========================================
  saveEmergencyLog(logData) {
    try {
      const logs = this.getLogs();
      logs.unshift(logData);
      while (logs.length > 10) {
        const removed = logs.pop();
        if (removed && removed.audioId && window.AudioStore) {
          window.AudioStore.remove(removed.audioId).catch(() => {});
        }
      }
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

  async attachAudioToLatestLog(audioBlob, eventId) {
    const logs = this.getLogs();
    const target = eventId ? logs.find((log) => log.id === eventId) : logs[0];
    if (!target) return;

    let audioId = null;
    if (audioBlob && window.AudioStore) {
      audioId = 'audio_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      try {
        await window.AudioStore.save(audioId, audioBlob);
      } catch (e) {
        console.error('[AppController] Falha ao salvar o áudio no aparelho:', e);
        audioId = null;
      }
    }

    delete target.audioUrl;
    target.audioId = audioId;
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
      this.renderLogs();
    } catch (e) {
      console.error('[AppController] Erro ao salvar o áudio no registro:', e);
    }
  },

  renderLogs() {
    if (!this.dom.logsList) return;

    const logs = this.getLogs();
    this.dom.logsList.innerHTML = '';

    if (logs.length === 0) {
      this.dom.logsList.innerHTML = '<div class="empty-state small">Nenhum disparo registrado ainda.</div>';
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
          ${log.loc && log.loc.success ? `📍 <a href="${this.escapeHtml(log.loc.mapsUrl)}" target="_blank" rel="noopener noreferrer">Ver mapa de localização</a>` : '📍 Localização indisponível'}
        </div>
        ${(log.evidenceId || log.audioId) ? '<div class="log-audio"></div>' : ''}
      `;
      if (log.evidenceId || log.audioId) {
        this.hydrateLogAudio(item.querySelector('.log-audio'), log);
      }
      this.dom.logsList.appendChild(item);
    });
  },

  async hydrateLogAudio(slot, log) {
    if (!slot) return;

    let blob = null;
    try {
      if (log.evidenceId && window.EvidenceStore) {
        blob = await window.EvidenceStore.getBlob(log.evidenceId);
      } else if (log.audioId && window.AudioStore) {
        blob = await window.AudioStore.get(log.audioId);
      }
    } catch (e) {
      blob = null;
    }

    if (!blob) {
      slot.innerHTML = '<span class="log-audio-empty">🎙️ Áudio indisponível</span>';
      return;
    }

    const url = URL.createObjectURL(blob);
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;
    audio.className = 'log-audio-player';
    audio.addEventListener('emptied', () => URL.revokeObjectURL(url), { once: true });
    slot.innerHTML = '';
    slot.appendChild(audio);
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
