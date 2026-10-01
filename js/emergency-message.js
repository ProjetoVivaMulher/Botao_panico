/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Mensagem de Emergência
 */

const EmergencyMessageModule = {

  // Monta a mensagem que será enviada no pedido de ajuda
  buildMessage({ eventId, dateFormatted, timeFormatted, loc, isSilent }) {

    // Verifica se a localização foi encontrada
    const locationText = loc && loc.success
      ? `📍 Localização: ${loc.mapsUrl}`
      : '📍 Localização não disponível';

    const silentWarning = isSilent
      ? `\n⚠️ ATENÇÃO: A VÍTIMA NÃO PODE FALAR / COMUNICAR-SE VERBALMENTE. NÃO LIGUE, ENVIE SOCORRO IMEDIATO OU RESPONDA POR MENSAGEM!\n`
      : '';

    // Cria a mensagem de emergência
    return `🚨 ALERTA DE EMERGÊNCIA - VIVA MULHER 🚨
${silentWarning}
Preciso de ajuda!

📅 Data: ${dateFormatted}
🕐 Horário: ${timeFormatted}
🆔 Evento: ${eventId}

${locationText}

Esta mensagem foi gerada pelo Botão de Pânico Viva Mulher.`;
  },

  // Cria o link que abre o WhatsApp com a mensagem pronta
  buildWhatsAppUrl(phone, message) {

    // Remove caracteres que não sejam números do telefone
    const cleanPhone = String(phone).replace(/\D/g, '');

    // Codifica a mensagem para funcionar corretamente no link
    const encodedMessage = encodeURIComponent(message);

    // Retorna o endereço do WhatsApp
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }
};

// Exportação compatível com Node.js e Navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmergencyMessageModule;
}
if (typeof window !== 'undefined') {
  window.EmergencyMessageModule = EmergencyMessageModule;
}
