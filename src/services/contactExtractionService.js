/**
 * Service pour l'extraction et l'analyse des contacts à partir de texte
 * Ce service complémentaire est utilisé par rssFeedService.js
 */

// Expressions régulières pour identifier les noms et titres
const PATTERNS = {
  // Modèle : [Prénom Nom], [Titre/Fonction]
  PERSON_WITH_TITLE:
    /([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)+)\s*,\s*((?:[^,.]|[dD]'|[dD]e\s)+(?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice-président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)\s+(?:[^,.])+)/gi,

  // Pour les cas comme "M. Dupont, Directeur..."
  PERSON_WITH_TITLE_MR_MRS:
    /(?:M\.|Mme|Mlle|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)*)\s*,\s*((?:[^,.]|[dD]'|[dD]e\s)+(?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice-président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)\s+(?:[^,.])+)/gi,

  // Motifs comme "Directeur X, Jean Dupont"
  TITLE_THEN_PERSON:
    /((?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice-président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)\s+(?:[^,.])+),\s+([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)+)/gi,
};

/**
 * Classe pour l'extraction de contacts à partir de texte
 */
class ContactExtractionService {
  /**
   * Extrait les contacts potentiels d'un texte
   * @param {string} text - Le texte à analyser
   * @returns {Array} - Les contacts extraits
   */
  extractContacts(text) {
    if (!text) return [];

    const contacts = [];
    const processedNames = new Set();

    // Nettoyer le texte (supprimer les tags HTML, etc.)
    const cleanText = text.replace(/<[^>]*>?/gm, "");

    // Appliquer les différents patterns
    this._applyPattern(
      PATTERNS.PERSON_WITH_TITLE,
      cleanText,
      contacts,
      processedNames,
      0.8
    );
    this._applyPattern(
      PATTERNS.PERSON_WITH_TITLE_MR_MRS,
      cleanText,
      contacts,
      processedNames,
      0.7,
      1
    );
    this._applyPattern(
      PATTERNS.TITLE_THEN_PERSON,
      cleanText,
      contacts,
      processedNames,
      0.7,
      2,
      1
    );

    return contacts;
  }

  /**
   * Méthode privée pour appliquer un pattern et extraire les contacts
   */
  _applyPattern(
    pattern,
    text,
    contacts,
    processedNames,
    confidenceScore,
    nameIndex = 1,
    roleIndex = 2
  ) {
    pattern.lastIndex = 0; // Réinitialiser l'index du regex
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[nameIndex].trim();
      const role = match[roleIndex].trim();

      // Éviter les doublons
      if (!processedNames.has(name.toLowerCase())) {
        processedNames.add(name.toLowerCase());

        contacts.push({
          name,
          role,
          confidenceScore,
          context: text.substring(
            Math.max(0, match.index - 30),
            Math.min(text.length, match.index + match[0].length + 30)
          ),
        });
      }
    }
  }

  /**
   * Extrait les contacts à partir d'actualités
   * @param {Array} news - Les actualités à analyser
   * @returns {Array} - Les contacts extraits
   */
  extractContactsFromNews(news) {
    const allContacts = [];

    news.forEach((item) => {
      const text = `${item.title || ""} ${item.description || ""}`;
      const contacts = this.extractContacts(text);

      // Ajouter la source aux contacts
      contacts.forEach((contact) => {
        contact.source = {
          title: item.title || "",
          date: item.date || "",
          url: item.link || "",
        };

        allContacts.push(contact);
      });
    });

    return this._deduplicateContacts(allContacts);
  }

  /**
   * Déduplique les contacts extraits
   * @param {Array} contacts - Les contacts à dédupliquer
   * @returns {Array} - Les contacts dédupliqués
   */
  _deduplicateContacts(contacts) {
    const contactMap = new Map();

    contacts.forEach((contact) => {
      const key = contact.name.toLowerCase();

      if (contactMap.has(key)) {
        const existing = contactMap.get(key);

        // Garder le score de confiance le plus élevé
        if (contact.confidenceScore > existing.confidenceScore) {
          existing.confidenceScore = contact.confidenceScore;
          existing.role = contact.role;
        }

        // Ajouter la source
        if (!existing.sources) existing.sources = [];
        existing.sources.push(contact.source);
      } else {
        contactMap.set(key, {
          ...contact,
          sources: [contact.source],
        });
        delete contactMap.get(key).source;
      }
    });

    return Array.from(contactMap.values());
  }
}

export const contactExtractionService = new ContactExtractionService();
