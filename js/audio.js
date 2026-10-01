/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Gravação de Áudio de Emergência (Evidência Ambiental & Compatibilidade Multiplataforma)
 */

const AudioModule = {
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  stream: null,
  stopTimeout: null,

  /**
   * Identifica o formato de áudio suportado pelo navegador (iOS Safari, Android Chrome, Firefox)
   */
  getSupportedMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus'
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  },

  /**
   * Inicia a gravação de áudio ambiente
   * @param {number} durationMs Duração da gravação em ms (padrão 15000ms = 15s)
   * @returns {Promise<boolean>}
   */
  async startRecording(durationMs = 15000) {
    if (this.isRecording) return false;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("[AudioModule] Gravação de áudio não suportada pelo navegador.");
        return false;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioChunks = [];
      const mimeType = this.getSupportedMimeType();

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        clearTimeout(this.stopTimeout);

        const type = (this.mediaRecorder && this.mediaRecorder.mimeType) || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Notifica o AppController
        if (window.AppController && window.AppController.onAudioRecorded) {
          window.AppController.onAudioRecorded(audioUrl, audioBlob);
        }

        // Libera as faixas do microfone imediatamente
        this.cleanupStream();
      };

      this.mediaRecorder.onerror = (e) => {
        console.error("[AudioModule] Erro durante a gravação:", e);
        this.stopRecording();
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;

      // Timer automático para encerrar a gravação
      this.stopTimeout = setTimeout(() => {
        this.stopRecording();
      }, durationMs);

      return true;
    } catch (error) {
      console.warn("[AudioModule] Microfone não autorizado ou erro de captura:", error.message);
      this.cleanupStream();
      this.isRecording = false;
      return false;
    }
  },

  /**
   * Interrompe a gravação atual
   */
  stopRecording() {
    clearTimeout(this.stopTimeout);
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn("[AudioModule] Erro ao parar gravador:", e);
      }
    }
    this.isRecording = false;
  },

  /**
   * Libera os recursos de microfone do dispositivo
   */
  cleanupStream() {
    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // Ignora
      }
      this.stream = null;
    }
  }
// Exportação compatível com Node.js e Navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioModule;
}
if (typeof window !== 'undefined') {
  window.AudioModule = AudioModule;
}
