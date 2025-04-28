/**
 * Service pour gérer les opportunités de prospection
 * Gestion avancée des opportunités et recommandation de contacts
 */

// Liste des critères de sélection des contacts
const CONTACT_SELECTION_CRITERIA = {
  decisionMakerRoles: [
    "CEO",
    "PDG",
    "President",
    "Directeur Général",
    "CTO",
    "CDO",
    "CIO",
    "CFO",
    "Directeur",
    "Vice-Président",
    "VP",
  ],
  expertiseKeywords: [
    "digital",
    "transformation",
    "innovation",
    "data",
    "cybersécurité",
    "stratégie",
    "analytique",
    "intelligence artificielle",
    "cloud",
    "sécurité",
    "performance",
    "erp",
    "crm",
    "marketing",
    "commercial",
    "supply chain",
    "logistique",
    "ressources humaines",
  ],
  hierarchyBonus: {
    "Directeur Général": 1.5,
    Directeur: 1.3,
    Responsable: 1.1,
    "Vice-Président": 1.4,
    CEO: 1.6,
    CTO: 1.5,
    CDO: 1.4,
    CIO: 1.4,
  },
  companyDomains: ["schneider-electric.", "se.com", "schneider.com"],
};

// Événements personnalisés pour la communication entre composants
const OPPORTUNITY_SELECTED_EVENT = "opportunity-selected";
const OPPORTUNITY_DESELECTED_EVENT = "opportunity-deselected";

/**
 * Service de gestion des opportunités de prospection
 */
class ProspectionService {
  constructor() {
    // Stockage des opportunités sélectionnées
    this.selectedOpportunities = [];

    // Abonnés aux événements
    this.subscribers = {
      onChange: [],
      onRecommendedContacts: [],
    };

    // Initialiser les écouteurs d'événements
    this._initEventListeners();
  }

  /**
   * Initialise les écouteurs d'événements personnalisés
   * @private
   */
  _initEventListeners() {
    // Écouter les événements de sélection d'opportunité
    window.addEventListener(OPPORTUNITY_SELECTED_EVENT, (event) => {
      const { opportunity } = event.detail;
      this.selectOpportunity(opportunity, false);
    });

    // Écouter les événements de désélection d'opportunité
    window.addEventListener(OPPORTUNITY_DESELECTED_EVENT, (event) => {
      const { opportunity } = event.detail;
      this.deselectOpportunity(opportunity, false);
    });
  }

  /**
   * Calcule la pertinence avancée d'un contact
   * @param {Object} contact - Le contact à évaluer
   * @param {Array} opportunities - Les opportunités sélectionnées
   * @returns {number} Score de pertinence entre 0 et 1
   */
  calculateContactRelevance(contact, opportunities) {
    let totalScore = 0;

    // Vérifications de base
    if (!contact || !contact.role) return 0;

    // Conversion des données en minuscules pour comparaison
    const roleLower = (contact.role || "").toLowerCase();
    const departmentLower = (contact.department || "").toLowerCase();
    const emailLower = (contact.email || "").toLowerCase();

    // 1. Analyse du rôle décisionnel
    const isDecisionMaker = CONTACT_SELECTION_CRITERIA.decisionMakerRoles.some(
      (role) => roleLower.includes(role.toLowerCase())
    );
    totalScore += isDecisionMaker ? 0.3 : 0.1;

    // 2. Analyse de l'expertise
    const expertiseMatches =
      CONTACT_SELECTION_CRITERIA.expertiseKeywords.filter(
        (keyword) =>
          roleLower.includes(keyword.toLowerCase()) ||
          departmentLower.includes(keyword.toLowerCase())
      );
    totalScore += expertiseMatches.length * 0.2;

    // 3. Bonus hiérarchique
    for (const [rolePattern, bonus] of Object.entries(
      CONTACT_SELECTION_CRITERIA.hierarchyBonus
    )) {
      if (roleLower.includes(rolePattern.toLowerCase())) {
        totalScore += bonus * 0.1;
        break;
      }
    }

    // 4. Analyse des opportunités
    opportunities.forEach((opportunity) => {
      const offerLower = (opportunity.detail || "").toLowerCase();
      const newsLower = (opportunity.news || "").toLowerCase();

      // Correspondance avec l'offre
      if (
        roleLower.includes(offerLower) ||
        departmentLower.includes(offerLower)
      ) {
        totalScore += 0.3;
      }

      // Correspondance avec l'actualité
      if (
        roleLower.includes(newsLower) ||
        departmentLower.includes(newsLower)
      ) {
        totalScore += 0.2;
      }
    });

    // 5. Vérification de l'email professionnel
    const isValidEmail = CONTACT_SELECTION_CRITERIA.companyDomains.some(
      (domain) => emailLower.includes(domain)
    );
    if (isValidEmail) {
      totalScore += 0.2;
    }

    // 6. Bonus pour les contacts multi-sources
    if (contact.sources && contact.sources.length > 1) {
      totalScore += 0.1 * Math.min(contact.sources.length - 1, 3);
    }

    // 7. Bonus pour contact complet
    const hasCompleteProfile =
      contact.email && contact.phone && contact.department;
    if (hasCompleteProfile) {
      totalScore += 0.1;
    }

    // Normaliser le score
    return Math.min(1, Math.max(0, totalScore));
  }

  /**
   * Identifie les contacts recommandés pour une liste d'opportunités
   * @param {Array} contacts - Liste des contacts disponibles
   * @param {Array} opportunities - Opportunités sélectionnées
   * @returns {Array} Contacts recommandés
   */
  identifyRecommendedContacts(contacts, opportunities) {
    if (!contacts || !opportunities || opportunities.length === 0) return [];

    // Calculer et filtrer les contacts
    const recommendedContacts = contacts
      .map((contact) => ({
        ...contact,
        relevanceScore: this.calculateContactRelevance(contact, opportunities),
      }))
      // Filtrer les contacts vraiment pertinents
      .filter(
        (contact) =>
          contact.relevanceScore > 0.5 &&
          // Filtres supplémentaires
          (contact.email || contact.phone) &&
          contact.role !== "Poste non spécifié"
      )
      // Trier par score de pertinence décroissant
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      // Limiter à 20 contacts maximum
      .slice(0, 20);

    // Notifier les abonnés
    this._notifyRecommendedContactsSubscribers(recommendedContacts);

    return recommendedContacts;
  }

  /**
   * Sélectionne une opportunité de prospection
   * @param {Object} opportunity - L'opportunité à sélectionner
   * @param {boolean} emitEvent - Si un événement doit être émis (défaut: true)
   */
  selectOpportunity(opportunity, emitEvent = true) {
    // Vérifier si l'opportunité est déjà sélectionnée
    const isAlreadySelected = this.selectedOpportunities.some(
      (op) =>
        op.category === opportunity.category && op.detail === opportunity.detail
    );

    // Si elle n'est pas déjà sélectionnée, l'ajouter
    if (!isAlreadySelected) {
      this.selectedOpportunities.push(opportunity);

      // Notifier les abonnés du changement
      this._notifySubscribers();

      // Émettre un événement pour notifier les autres composants
      if (emitEvent) {
        window.dispatchEvent(
          new CustomEvent(OPPORTUNITY_SELECTED_EVENT, {
            detail: { opportunity },
          })
        );
      }
    }
  }

  /**
   * Désélectionne une opportunité de prospection
   * @param {Object} opportunity - L'opportunité à désélectionner
   * @param {boolean} emitEvent - Si un événement doit être émis (défaut: true)
   */
  deselectOpportunity(opportunity, emitEvent = true) {
    // Filtrer l'opportunité de la liste
    this.selectedOpportunities = this.selectedOpportunities.filter(
      (op) =>
        !(
          op.category === opportunity.category &&
          op.detail === opportunity.detail
        )
    );

    // Notifier les abonnés du changement
    this._notifySubscribers();

    // Émettre un événement pour notifier les autres composants
    if (emitEvent) {
      window.dispatchEvent(
        new CustomEvent(OPPORTUNITY_DESELECTED_EVENT, {
          detail: { opportunity },
        })
      );
    }
  }

  /**
   * Récupère toutes les opportunités sélectionnées
   * @returns {Array} Les opportunités sélectionnées
   */
  getSelectedOpportunities() {
    return [...this.selectedOpportunities];
  }

  /**
   * Bascule l'état de sélection d'une opportunité
   * @param {Object} opportunity - L'opportunité à basculer
   */
  toggleOpportunity(opportunity) {
    const isSelected = this.isOpportunitySelected(opportunity);

    if (isSelected) {
      this.deselectOpportunity(opportunity);
    } else {
      this.selectOpportunity(opportunity);
    }
  }

  /**
   * Vérifie si une opportunité est sélectionnée
   * @param {Object} opportunity - L'opportunité à vérifier
   * @returns {boolean} Vrai si l'opportunité est sélectionnée
   */
  isOpportunitySelected(opportunity) {
    return this.selectedOpportunities.some(
      (op) =>
        op.category === opportunity.category && op.detail === opportunity.detail
    );
  }

  /**
   * S'abonne aux changements d'opportunités sélectionnées
   * @param {Function} callback - Fonction de rappel à appeler lors des changements
   * @returns {Function} Fonction pour se désabonner
   */
  subscribe(callback) {
    this.subscribers.onChange.push(callback);

    // Retourner une fonction pour se désabonner
    return () => {
      this.subscribers.onChange = this.subscribers.onChange.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Abonnement aux changements de contacts recommandés
   * @param {Function} callback - Fonction de rappel
   * @returns {Function} Fonction de désabonnement
   */
  subscribeToRecommendedContacts(callback) {
    this.subscribers.onRecommendedContacts.push(callback);
    return () => {
      this.subscribers.onRecommendedContacts =
        this.subscribers.onRecommendedContacts.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notifier les abonnés des contacts recommandés
   * @param {Array} recommendedContacts - Contacts recommandés
   * @private
   */
  _notifyRecommendedContactsSubscribers(recommendedContacts) {
    this.subscribers.onRecommendedContacts.forEach((callback) => {
      callback(recommendedContacts);
    });
  }

  /**
   * Notifie tous les abonnés d'un changement d'opportunités
   * @private
   */
  _notifySubscribers() {
    this.subscribers.onChange.forEach((callback) => {
      callback(this.selectedOpportunities);
    });
  }

  /**
   * Efface toutes les opportunités sélectionnées
   */
  clearSelectedOpportunities() {
    this.selectedOpportunities = [];
    this._notifySubscribers();
  }

  /**
   * Identifie les opportunités potentielles à partir de la matrice de pertinence
   * @param {Array} relevanceMatrix - Matrice de pertinence des actualités
   * @param {Object} opportunitiesByOffering - Opportunités existantes par offre
   * @returns {Array} Opportunités potentielles sans projets existants
   */
  identifyNewOpportunities(relevanceMatrix, opportunitiesByOffering) {
    const allPotential = this.identifyPotentialOpportunities(relevanceMatrix);

    // Filtrer les opportunités qui n'ont pas de projets existants
    return allPotential.filter((opportunity) => {
      const offerDetails = opportunity.detail.split(", ");

      // Vérifier si tous les éléments de l'offre n'ont pas d'opportunités existantes
      return offerDetails.every((detail) => {
        // Trouver l'offre correspondante
        const matchingOffering = Object.keys(opportunitiesByOffering).find(
          (offering) => offering.includes(detail) || detail.includes(offering)
        );

        // Si aucune offre correspondante n'est trouvée, c'est une nouvelle opportunité
        if (!matchingOffering) return true;

        // Si l'offre correspondante n'a pas d'opportunités, c'est une nouvelle opportunité
        return (
          !opportunitiesByOffering[matchingOffering] ||
          opportunitiesByOffering[matchingOffering].length === 0
        );
      });
    });
  }

  /**
   * Identifie les opportunités potentielles à partir de la matrice de pertinence
   * @param {Array} relevanceMatrix - Matrice de pertinence des actualités
   * @returns {Array} Opportunités potentielles
   */
  identifyPotentialOpportunities(relevanceMatrix) {
    if (!relevanceMatrix || !Array.isArray(relevanceMatrix)) {
      return [];
    }

    // Filtrer les entrées de matrice avec un score de pertinence élevé (3)
    const highRelevanceItems = relevanceMatrix.filter(
      (item) => item.relevanceScore === 3
    );

    // Convertir en format standard d'opportunité
    return highRelevanceItems.map((item) => ({
      category: item.offerCategory,
      detail: item.offerDetail,
      news: item.news,
      newsDate: item.newsDate,
      newsDescription: item.newsDescription,
      newsLink: item.newsLink,
      relevanceScore: item.relevanceScore,
    }));
  }
}

// Exporter une instance singleton du service
export const prospectionService = new ProspectionService();
