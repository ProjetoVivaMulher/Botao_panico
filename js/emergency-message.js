/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Mensagem de Emergência
 */

const EmergencyMessageModule = {

  // Monta a mensagem que será enviada no pedido de ajuda
  buildMessage({ eventId, dateFormatted, timeFormatted, loc }) {

    // Verifica se a localização foi encontrada
    const locationText = loc && loc.success
      ? `📍 Localização: ${loc.mapsUrl}`
      : '📍 Localização não disponível';

    // Cria a mensagem de emergência
    return `🚨 ALERTA DE EMERGÊNCIA - VIVA MULHER 🚨

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

// Deixa o módulo disponível para os outros arquivos do projeto
window.EmergencyMessageModule = EmergencyMessageModule;
