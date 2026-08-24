/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Gravação de Áudio de Emergência (Evidência Ambiental)
 */

const AudioModule = {
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  stream: null,

  /**
   * Inicia a gravação de áudio ambiente
   * @param {number} durationMs Duração padrão da gravação em ms (padrão 15000ms = 15s)
   * @returns {Promise<boolean>} Sucesso na inicialização
   */
  async startRecording(durationMs = 15000) {
    if (this.isRecording) return false;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("[AudioModule] Negação ou falta de suporte para gravação de áudio.");
        return false;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 
                       MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';

      this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Notificar o AppController sobre a gravação concluída
        if (window.AppController && window.AppController.onAudioRecorded) {
          window.AppController.onAudioRecorded(audioUrl, audioBlob);
        }

        // Parar todas as faixas do microfone
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;

      // Parar automaticamente após a duração especificada
      setTimeout(() => {
        this.stopRecording();
      }, durationMs);

      return true;
    } catch (error) {
      console.error("[AudioModule] Erro ao iniciar gravação de áudio:", error);
      return false;
    }
  },

  /**
   * Interrompe a gravação atual
   */
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
  }
};

window.AudioModule = AudioModule;
