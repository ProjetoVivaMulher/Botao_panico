/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Geolocalização
 */

const GeolocationModule = {
  currentPosition: null,
  isFetching: false,

  /**
   * Captura a posição atual do dispositivo com alta precisão
   * @returns {Promise<Object>} Dados contendo lat, lng, mapsUrl, accuracy, timestamp
   */
  async getCurrentLocation() {
    this.isFetching = true;

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        this.isFetching = false;
        const fallback = this.getFallbackData("Geolocalização não suportada pelo navegador.");
        resolve(fallback);
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
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

          console.warn("[GeolocationModule]", errorMessage);
          resolve(this.getFallbackData(errorMessage));
        },
        options
      );
    });
  },

  /**
   * Retorna estrutura padrão para quando o GPS falhar ou não estiver disponível
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