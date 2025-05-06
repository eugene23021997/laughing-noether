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
   * Calcule la pertinence avancée d'un contact par rapport à une opportunité spécifique
   * @param {Object} contact - Le contact à évaluer
   * @param {Object} opportunity - L'opportunité spécifique (pas un tableau)
   * @returns {number} Score de pertinence entre 0 et 1
   */
  calculateContactRelevanceForOpportunity(contact, opportunity) {
    let totalScore = 0;

    // Vérifications de base
    if (!contact || !contact.role || !opportunity) return 0;

    // Conversion des données en minuscules pour comparaison
    const roleLower = (contact.role || "").toLowerCase();
    const departmentLower = (contact.department || "").toLowerCase();
    const emailLower = (contact.email || "").toLowerCase();
    
    // Données de l'opportunité en minuscules
    const opportunityCategory = (opportunity.category || "").toLowerCase();
    const opportunityDetail = (opportunity.detail || "").toLowerCase();
    const opportunityNews = (opportunity.news || "").toLowerCase();
    const opportunityDescription = (opportunity.newsDescription || "").toLowerCase();
    
    // Combinaison des textes d'opportunité pour une analyse globale
    const opportunityText = `${opportunityCategory} ${opportunityDetail} ${opportunityNews} ${opportunityDescription}`;

    // 1. Analyse du rôle décisionnel
    const isDecisionMaker = CONTACT_SELECTION_CRITERIA.decisionMakerRoles.some(
      (role) => roleLower.includes(role.toLowerCase())
    );
    totalScore += isDecisionMaker ? 0.3 : 0.1;

    // 2. Analyse de la correspondance directe avec l'opportunité
    // Diviser la description de l'offre en mots-clés
    const opportunityKeywords = opportunityDetail
      .split(/\s+|,|;|-|\./)
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase());
    
    // Vérifier si le rôle ou le département contient ces mots-clés
    let keywordMatches = 0;
    opportunityKeywords.forEach(keyword => {
      if (roleLower.includes(keyword) || departmentLower.includes(keyword)) {
        keywordMatches++;
      }
    });
    
    // Ajouter un score basé sur la correspondance de mots-clés
    const keywordMatchScore = Math.min(0.5, keywordMatches * 0.1);
    totalScore += keywordMatchScore;
    
    // 3. Analyse de la correspondance avec l'actualité
    const newsKeywords = opportunityNews
      .split(/\s+|,|;|-|\./)
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase());
    
    let newsMatches = 0;
    newsKeywords.forEach(keyword => {
      if (roleLower.includes(keyword) || departmentLower.includes(keyword)) {
        newsMatches++;
      }
    });
    
    const newsMatchScore = Math.min(0.3, newsMatches * 0.05);
    totalScore += newsMatchScore;

    // 4. Bonus pour l'expertise spécifique à la catégorie
    // Définir les domaines d'expertise par catégorie
    const expertiseByCategory = {
      "Finance & Risk": ["finance", "risk", "comptable", "fiscal", "audit", "conformité"],
      "Technology": ["it", "digital", "data", "cyber", "cloud", "architecture"],
      "Operations": ["production", "supply", "logistique", "maintenance", "qualité"],
      "People & Strategy": ["rh", "stratégie", "change", "talent", "transformation"],
      "Customer & Growth": ["marketing", "commercial", "vente", "client", "crm"],
      "BE Capital": ["m&a", "acquisition", "fusion", "investissement"]
    };
    
    const categoryExpertise = expertiseByCategory[opportunity.category] || [];
    let expertiseMatches = 0;
    
    categoryExpertise.forEach(expertise => {
      if (roleLower.includes(expertise) || departmentLower.includes(expertise)) {
        expertiseMatches++;
      }
    });
    
    const expertiseScore = Math.min(0.4, expertiseMatches * 0.1);
    totalScore += expertiseScore;

    // 5. Bonus pour les sources pertinentes
    if (contact.sources && contact.sources.length > 0) {
      // Vérifier si une des sources du contact est liée à l'actualité de l'opportunité
      const hasRelevantSource = contact.sources.some(source => 
        source.title && opportunity.news && 
        (source.title.toLowerCase().includes(opportunity.news.toLowerCase()) || 
         opportunity.news.toLowerCase().includes(source.title.toLowerCase()))
      );
      
      if (hasRelevantSource) {
        totalScore += 0.2;
      }
    }

    // 6. Bonus pour le score de pertinence de l'opportunité
    if (opportunity.relevanceScore === 3) {
      totalScore += 0.1;
    }

    // 7. Bonus pour email professionnel valide
    const isValidEmail = CONTACT_SELECTION_CRITERIA.companyDomains.some(
      (domain) => emailLower.includes(domain)
    );
    if (isValidEmail) {
      totalScore += 0.1;
    }

    // Normaliser le score final entre 0 et 1
    return Math.min(1, totalScore);
  }

  /**
   * Sélectionne une opportunité de prospection
   * @param {Object} opportunity - L'opportunité à sélectionner
   * @param {boolean} emitEvent - Si un événement doit être émis (défaut: true)
   */
  selectOpportunity(opportunity, emitEvent = true) {
    // Vérifier si l'opportunité existe déjà
    const exists = this.selectedOpportunities.some(
      (op) =>
        op.category === opportunity.category &&
        op.detail === opportunity.detail
    );

    // Si non, l'ajouter à la liste
    if (!exists) {
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
   * Identifie les contacts recommandés pour une opportunité spécifique
   * @param {Array} contacts - Liste des contacts disponibles
   * @param {Object} opportunity - L'opportunité sélectionnée (un seul objet)
   * @returns {Array} Contacts recommandés pour cette opportunité
   */
  identifyRecommendedContactsForOpportunity(contacts, opportunity) {
    if (!contacts || !opportunity) return [];

    // Calculer et filtrer les contacts pour cette opportunité spécifique
    const recommendedContacts = contacts
      .map((contact) => ({
        ...contact,
        relevanceScore: this.calculateContactRelevanceForOpportunity(contact, opportunity),
      }))
      // Filtrer les contacts vraiment pertinents pour cette opportunité (seuil plus élevé)
      .filter(
        (contact) =>
          contact.relevanceScore > 0.4 && // Seuil adapté pour la pertinence par opportunité
          (contact.email || contact.phone) &&
          contact.role !== "Poste non spécifié"
      )
      // Trier par score de pertinence décroissant
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      // Limiter à 10 contacts maximum par opportunité
      .slice(0, 10);

    return recommendedContacts;
  }

  /**
   * Identifie les contacts recommandés pour une liste d'opportunités
   * @param {Array} contacts - Liste des contacts disponibles
   * @param {Array} opportunities - Opportunités sélectionnées
   * @returns {Object} Contacts recommandés regroupés par opportunité
   */
  identifyRecommendedContacts(contacts, opportunities) {
    if (!contacts || !opportunities || opportunities.length === 0) return {};

    const recommendationsByOpportunity = {};

    // Pour chaque opportunité, identifier les contacts les plus pertinents
    opportunities.forEach(opportunity => {
      const opportunityKey = `${opportunity.category}-${opportunity.detail}`;
      const recommendedContacts = this.identifyRecommendedContactsForOpportunity(contacts, opportunity);
      
      recommendationsByOpportunity[opportunityKey] = {
        opportunity,
        contacts: recommendedContacts
      };
    });

    // Notifier les abonnés
    this._notifyRecommendedContactsSubscribers(recommendationsByOpportunity);

    return recommendationsByOpportunity;
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
