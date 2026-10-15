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
    if (!navigator.permissions || !navigator.permissions.query) return 'unknown';
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state; // 'granted' | 'denied' | 'prompt'
    } catch (e) {
      return 'unknown';
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
   * Captura a posição atual com timeout de segurança rígido para nunca travar o fluxo de socorro
   * @param {number} maxWaitMs Tempo máximo de espera antes do fallback (padrão 6000ms = 6s)
   * @returns {Promise<Object>}
   */
  async getCurrentLocation(maxWaitMs = 6000) {
    if (this.isFetching && this.currentPosition) {
      return this.currentPosition;
    }

    this.isFetching = true;

    // Timeout de segurança com fallback garantido
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        if (this.lastKnownGoodPosition) {
          console.warn("[GeolocationModule] GPS timeout. Usando última posição conhecida.");
          resolve(this.lastKnownGoodPosition);
        } else {
          resolve(this.getFallbackData("Tempo limite para obter localização excedido."));
        }
      }, maxWaitMs);
    });

    const gpsPromise = new Promise((resolve) => {
      if (!navigator.geolocation) {
        this.isFetching = false;
        resolve(this.getFallbackData("Geolocalização não suportada pelo navegador."));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: maxWaitMs - 500,
        maximumAge: 30000 // Aceita posição em cache de até 30 segundos
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.isFetching = false;
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
          resolve(result);
        },
        (error) => {
          this.isFetching = false;
          let errorMessage = "Erro ao obter localização.";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Permissão de localização negada pela usuária.";
              break;

            case error.POSITION_UNAVAILABLE:
              errorMessage = "Sinal de GPS indisponível no momento.";
              break;

            case error.TIMEOUT:
              errorMessage = "Tempo limite para obter localização excedido.";
              break;
          }

          if (this.lastKnownGoodPosition) {
            resolve(this.lastKnownGoodPosition);
          } else {
            resolve(this.getFallbackData(errorMessage));
          }
        },
        options
      );
    });

    return Promise.race([gpsPromise, timeoutPromise]).finally(() => {
      this.isFetching = false;
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
