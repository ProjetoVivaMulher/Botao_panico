/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Gerenciamento de Contatos de Emergência
 */

const STORAGE_KEY_CONTACTS = 'viva_mulher_emergency_contacts';

const ContactsModule = {
  /**
   * Obtém a lista de contatos salvos no localStorage
   * @returns {Array} Lista de objetos de contato
   */
  getContacts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONTACTS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("[ContactsModule] Erro ao ler contatos:", e);
    }
    // Retorna contatos padrão se não houver cadastrados
    return [
      { id: 'default-1', name: 'Central Viva Mulher (Socorro)', phone: '552139553874', isDefault: true }
    ];
  },

  /**
   * Salva um novo contato na lista
   * @param {string} name Nome do contato
   * @param {string} phone Telefone com DDD e código do país
   * @returns {Array} Lista atualizada de contatos
   */
  addContact(name, phone) {
    const contacts = this.getContacts();

    const cleanName = (typeof name === 'string' ? name.trim() : '').slice(0, 80);
    const cleanPhone = (typeof phone === 'string' ? phone.replace(/\D/g, '') : '');

    if (!cleanName || cleanPhone.length < 8) {
      throw new Error('Nome e telefone válidos são obrigatórios.');
    }

    const newContact = {
      id: 'contact-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: cleanName,
      phone: cleanPhone,
      isDefault: false
    };

    contacts.push(newContact);
    this._save(contacts);
    return contacts;
  },

  /**
   * Remove um contato pelo ID
   * @param {string} id ID do contato a remover
   * @returns {Array} Lista atualizada
   */
  removeContact(id) {
    let contacts = this.getContacts();
    contacts = contacts.filter(c => c.id !== id);
    this._save(contacts);
    return contacts;
  },

  /**
   * Salva no localStorage
   */
  _save(contacts) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
      }
    } catch (e) {
      console.error("[ContactsModule] Erro ao salvar contatos:", e);
    }
  }
};

// Exportação compatível com Node.js e Navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContactsModule;
}
if (typeof window !== 'undefined') {
  window.ContactsModule = ContactsModule;
}
