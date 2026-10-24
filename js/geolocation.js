/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Geolocalização (Alta Precisão, Resiliente & Zero Travamentos)
 */

const GeolocationModule = {
  currentPosition: null,
  lastKnownGoodPosition: null,
  isFetching: false,
  watchId: null,

  /**
   * Estado da PERMISSÃO DO NAVEGADOR (diferente do consentimento LGPD do app).
   * Retorna 'granted' | 'denied' | 'prompt' | 'unsupported'.
   */
  async getPermissionState() {
    if (!navigator.geolocation) return 'unsupported';
    if (!navigator.permissions || !navigator.permissions.query) {
      // Safari/iOS não implementa a Permissions API para geolocalização.
      // "prompt" mantém o botão "Ativar" funcional: o pedido do sistema só
      // aparece quando a usuária toca (dentro do gesto).
      return 'prompt';
    }
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state; // 'granted' | 'denied' | 'prompt'
    } catch (e) {
      return 'prompt';
    }
  },

  /**
   * Observa a posição continuamente durante o socorro (pega a leitura mais precisa / em movimento).
   */
  startWatching() {
    if (!navigator.geolocation || this.watchId != null) return;
    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          const result = {
            success: true,
            lat: lat,
            lng: lng,
            accuracy: Math.round(position.coords.accuracy),
            mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
            timestamp: new Date().toISOString()
          };
          this.currentPosition = result;
          this.lastKnownGoodPosition = result;
        },
        () => { /* silencioso: o fallback já é tratado em getCurrentLocation */ },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      );
    } catch (e) {
      this.watchId = null;
    }
  },

  stopWatching() {
    if (this.watchId != null && navigator.geolocation) {
      try { navigator.geolocation.clearWatch(this.watchId); } catch (e) { /* ignore */ }
    }
    this.watchId = null;
  },

  /**
   * Captura a posição atual com timeout de segurança para nunca travar o socorro.
   * Importante no iOS: o pedido de permissão só aparece se esta chamada partir
   * de um toque da usuária — por isso ela precisa ser feita direto no clique,
   * sem awaits antes.
   * @param {number} maxWaitMs Tempo máximo de espera antes do fallback (padrão 12000ms)
   * @returns {Promise<Object>}
   */
  async getCurrentLocation(maxWaitMs = 12000) {
    if (!navigator.geolocation) {
      return this.getFallbackData('Geolocalização não suportada pelo navegador.');
    }

    if (this.isFetching && this.currentPosition) {
      return this.currentPosition;
    }

    this.isFetching = true;

    return new Promise((resolve) => {
      let settled = false;
      let timer = null;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        this.isFetching = false;
        if (timer) clearTimeout(timer);
        resolve(value);
      };

      // Rede de segurança: o socorro nunca fica esperando o GPS.
      timer = setTimeout(() => {
        if (this.lastKnownGoodPosition) {
          console.warn("[GeolocationModule] GPS timeout. Usando última posição conhecida.");
          finish(this.lastKnownGoodPosition);
        } else {
          finish(this.getFallbackData("Tempo limite para obter localização excedido."));
        }
      }, Math.max(maxWaitMs, 1000));

      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);
            const accuracy = Math.round(position.coords.accuracy);

            const result = {
              success: true,
              lat: lat,
              lng: lng,
              accuracy: accuracy,
              mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
              timestamp: new Date().toISOString()
            };

            this.currentPosition = result;
            this.lastKnownGoodPosition = result;
            finish(result);
          },
          (error) => {
            let errorMessage = "Erro ao obter localização.";
            const code = error && error.code;
            let denied = false;

            if (code === 1) {
              errorMessage = "Permissão de localização negada pela usuária.";
              denied = true;
            } else if (code === 2) {
              errorMessage = "Sinal de GPS indisponível no momento.";
            } else if (code === 3) {
              errorMessage = "Tempo limite para obter localização excedido.";
            }

            // Permissão negada agora: devolver a última posição conhecida esconderia
            // o bloqueio e a usuária nunca saberia que precisa liberar o acesso.
            if (denied) {
              this.currentPosition = null;
              finish(Object.assign(this.getFallbackData(errorMessage), { permissionDenied: true }));
              return;
            }

            finish(this.lastKnownGoodPosition || this.getFallbackData(errorMessage));
          },
          {
            enableHighAccuracy: true,
            // O timeout do sistema é maior que a nossa rede de segurança: assim
            // o iOS tem tempo de mostrar o pedido de permissão e responder.
            timeout: Math.max(maxWaitMs + 5000, 15000),
            // Sem cache na primeira leitura: no iPhone o cache costuma vir vazio
            // ou muito antigo, o que atrapalha a permissão.
            maximumAge: 0
          }
        );
      } catch (e) {
        finish(this.getFallbackData("Não foi possível iniciar a localização."));
      }
    });
  },

  /**
   * Estrutura padrão para quando o GPS falhar
   */
  getFallbackData(reason) {
    return {
      success: false,
      lat: null,
      lng: null,
      accuracy: null,
      mapsUrl: "Localização não disponível (" + reason + ")",
      reason: reason,
      timestamp: new Date().toISOString()
    };
  }
};

window.GeolocationModule = GeolocationModule;
