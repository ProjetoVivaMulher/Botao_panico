/**
 * Botão de Pânico - Viva Mulher
 * Módulo de Acessibilidade Inclusiva (Cegas, Surdas, Mudas e Baixa Visão)
 */

const AccessibilityModule = (function () {
  'use strict';

  const STORAGE_KEYS = {
    SILENT_MODE: 'viva_mulher_silent_mode',
    VIBRATION_ENABLED: 'viva_mulher_vibration_enabled',
    VOICE_FEEDBACK: 'viva_mulher_voice_feedback'
  };

  // Padrões de Vibração Háptica (em milissegundos)
  const VIBRATION_PATTERNS = {
    CLICK: [50],
    PANIC_START: [150, 50, 150],
    COUNTDOWN_TICK: [100],
    ALERT_SENT: [300, 100, 300, 100, 500],
    CANCELLED: [200, 100, 200]
  };

  /**
   * Dispara feedback tátil por vibração se suportado no dispositivo
   * @param {string|Array<number>} patternType Nome do padrão ou array numérico
   */
  function vibrate(patternType) {
    if (!isVibrationEnabled()) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        const pattern = Array.isArray(patternType)
          ? patternType
          : (VIBRATION_PATTERNS[patternType] || [100]);
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn('Vibration API error:', e);
      }
    }
  }

  /**
   * Anuncia mensagem de texto para leitores de tela (TalkBack, VoiceOver, NVDA)
   * @param {string} text Mensagem para ser falada pelo leitor de tela
   */
  function announce(text) {
    if (typeof document === 'undefined') return;
    let liveRegion = document.getElementById('ariaLiveRegion');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'ariaLiveRegion';
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }
    // Limpa e atualiza para forçar o leitor de tela a vocalizar
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion.textContent = text;
    }, 50);
  }

  /**
   * Feedback sonoro por síntese de voz (se habilitado e seguro)
   * @param {string} text 
   */
  function speak(text) {
    if (!isVoiceFeedbackEnabled()) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Cancela falas anteriores
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('SpeechSynthesis error:', e);
      }
    }
  }

  /**
   * Dispara efeito visual pulsante de flash para usuárias surdas
   */
  function triggerVisualFlash() {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('countdownOverlay');
    if (overlay) {
      overlay.classList.add('screen-flash');
      setTimeout(() => {
        overlay.classList.remove('screen-flash');
      }, 300);
    }
  }

  // --- Gerenciamento de Configurações de Acessibilidade ---

  function isSilentMode() {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.SILENT_MODE) === 'true';
  }

  function setSilentMode(enabled) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SILENT_MODE, enabled ? 'true' : 'false');
    announce(enabled ? 'Modo silencioso não-verbal ativado' : 'Modo padrão ativado');
  }

  function isVibrationEnabled() {
    if (typeof localStorage === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED);
    return stored === null ? true : stored === 'true';
  }

  function setVibrationEnabled(enabled) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.VIBRATION_ENABLED, enabled ? 'true' : 'false');
    if (enabled) vibrate('CLICK');
  }

  function isVoiceFeedbackEnabled() {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.VOICE_FEEDBACK) === 'true';
  }

  function setVoiceFeedbackEnabled(enabled) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.VOICE_FEEDBACK, enabled ? 'true' : 'false');
  }

  return {
    vibrate,
    announce,
    speak,
    triggerVisualFlash,
    isSilentMode,
    setSilentMode,
    isVibrationEnabled,
    setVibrationEnabled,
    isVoiceFeedbackEnabled,
    setVoiceFeedbackEnabled,
    VIBRATION_PATTERNS
  };
})();

// Exportação compatível com Node.js e Navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityModule;
} else if (typeof window !== 'undefined') {
  window.AccessibilityModule = AccessibilityModule;
}
