/**
 * Viva Mulher - Botão de Pânico
 * Módulo de Gerenciamento das Pessoas de Confiança
 *
 * Cada pessoa cadastrada recebe o mesmo pedido de socorro, com a localização
 * da usuária. O cadastro é opcional: sem ninguém cadastrado, o pedido vai para
 * a Central Viva Mulher.
 */

const STORAGE_KEY_CONTACTS = 'viva_mulher_emergency_contacts';

const ContactsModule = {
  MAX_CONTACTS: 10,

  /**
   * Obtém a lista de pessoas de confiança salvas no localStorage.
   * @returns {Array} Lista de objetos de contato
   */
  getContacts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONTACTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("[ContactsModule] Erro ao ler contatos:", e);
    }
    // Retorna a Central como contato padrão se não houver ninguém cadastrado
    const socorro = (window.APP_CONFIG && window.APP_CONFIG.SOCORRO_PHONE) || '552139553874';
    const socorroName = (window.APP_CONFIG && window.APP_CONFIG.SOCORRO_NAME) || 'Central Viva Mulher (Socorro)';
    return [
      { id: 'default-1', name: socorroName, phone: socorro, relation: 'Central', isDefault: true }
    ];
  },

  normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
  },

  /**
   * Salva uma nova pessoa de confiança.
   * @param {string} name Nome da pessoa
   * @param {string} phone WhatsApp com DDD
   * @param {string} [relation] Relação (mãe, amiga, vizinha...)
   * @returns {Array} Lista atualizada
   */
  addContact(name, phone, relation = '') {
    const contacts = this.getContacts();

    const cleanName = (typeof name === 'string' ? name.trim() : '').slice(0, 80);
    const cleanRelation = (typeof relation === 'string' ? relation.trim() : '').slice(0, 40);
    const cleanPhone = this.normalizePhone(phone);

    if (!cleanName) {
      throw new Error('Informe o nome da pessoa de confiança.');
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      throw new Error('Informe o WhatsApp com DDD (10 ou 11 números).');
    }

    const userContacts = contacts.filter((c) => !c.isDefault);
    if (userContacts.length >= this.MAX_CONTACTS) {
      throw new Error('Limite de ' + this.MAX_CONTACTS + ' pessoas de confiança atingido.');
    }

    const suffix = cleanPhone.slice(-11);
    const duplicated = contacts.some((c) => this.normalizePhone(c.phone).slice(-11) === suffix);
    if (duplicated) {
      throw new Error('Essa pessoa já está cadastrada.');
    }

    const newContact = {
      id: 'contact-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: cleanName,
      phone: cleanPhone,
      relation: cleanRelation,
      isDefault: false
    };

    contacts.push(newContact);
    this._save(contacts);
    return contacts;
  },

  /**
   * Remove uma pessoa de confiança pelo ID (a Central padrão é protegida).
   * @param {string} id ID do contato a remover
   * @returns {Array} Lista atualizada
   */
  removeContact(id) {
    let contacts = this.getContacts();
    contacts = contacts.filter((c) => c.id !== id || c.isDefault);
    this._save(contacts);
    return contacts;
  },

  /**
   * Telefones que devem receber o SOS (Central sempre por último).
   * @returns {Array}
   */
  getAlertTargets() {
    const contacts = this.getContacts();
    const people = contacts.filter((c) => !c.isDefault);
    const defaults = contacts.filter((c) => c.isDefault);
    return [...people, ...defaults];
  },

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
