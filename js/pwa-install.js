/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Instalação do Aplicativo (PWA)
 */

const PwaInstallModule = {
  deferredPrompt: null,

  init() {
    this.registerServiceWorker();
    this.bindInstallEvents();
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado com sucesso:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err);
        });
    }
  },

  bindInstallEvents() {
    const installBtn = document.getElementById('btnInstallPwa');
    const headerInstallBtn = document.getElementById('btnHeaderInstall');
    const modal = document.getElementById('pwaInstallModal');
    const closeModalBtn = document.getElementById('btnCloseInstallModal');

    // Capturar o evento nativo do navegador para instalação PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      // Exibir botões de instalação
      if (installBtn) installBtn.style.display = 'flex';
      if (headerInstallBtn) headerInstallBtn.style.display = 'flex';
    });

    // Clique nos botões de instalação
    const handleInstallClick = () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        this.deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] Usuária aceitou a instalação do aplicativo.');
            if (installBtn) installBtn.style.display = 'none';
            if (headerInstallBtn) headerInstallBtn.style.display = 'none';
          }
          this.deferredPrompt = null;
        });
      } else {
        // Exibir modal explicativo caso seja iOS ou navegador sem suporte direto
        if (modal) modal.classList.add('active');
      }
    };

    if (installBtn) installBtn.addEventListener('click', handleInstallClick);
    if (headerInstallBtn) headerInstallBtn.addEventListener('click', handleInstallClick);
    if (closeModalBtn && modal) {
      closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    // Se o app já estiver rodando instalado (standalone)
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Aplicativo instalado na tela inicial com sucesso!');
      if (installBtn) installBtn.style.display = 'none';
      if (headerInstallBtn) headerInstallBtn.style.display = 'none';
      if (window.AppController) window.AppController.showToast('✅ Viva Mulher instalado no celular!');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  PwaInstallModule.init();
});

window.PwaInstallModule = PwaInstallModule;
