/**
 * Service pour l'extraction et l'analyse des contacts à partir de texte
 * Ce service complémentaire est utilisé pour gérer les contacts Schneider Electric
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

// Liste des rôles standards pour la classification
const STANDARD_ROLES = [
  "CEO / PDG",
  "CFO / Directeur Financier",
  "CIO / DSI",
  "CTO / Directeur Technique",
  "CDO / Directeur Digital",
  "COO / Directeur des Opérations",
  "CMO / Directeur Marketing",
  "CHRO / DRH",
  "CSO / Directeur Sécurité",
  "Directeur Stratégie",
  "Directeur Commercial",
  "Directeur de la Transformation",
  "Directeur de l'Innovation",
  "Directeur de la Supply Chain",
  "Directeur de Production",
  "Directeur de Projet",
  "VP / Vice-Président",
  "Responsable IT",
  "Responsable Commercial",
  "Responsable Achats",
  "Chef de Produit",
  "Autre"
];

/**
 * Classe pour la gestion des contacts
 */
class ContactService {
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

  /**
   * Importe des contacts depuis un fichier Excel, CSV ou autre format
   * @param {File} file - L'objet File à importer
   * @returns {Promise<Array>} - Les contacts importés
   */
  async importContacts(file) {
    try {
      console.log(`Tentative d'importation du fichier: ${file.name} (type: ${file.type})`);

      // Vérifier que nous avons bien un fichier
      if (!file || !(file instanceof File)) {
        throw new Error("Aucun fichier valide fourni pour l'importation");
      }

      // Lire le fichier comme ArrayBuffer
      const fileContent = await this._readFileAsArrayBuffer(file);
      console.log("Fichier lu avec succès, taille:", fileContent.byteLength);

      // Charger dynamiquement XLSX
      const XLSX = await import('xlsx');
      console.log("Bibliothèque XLSX chargée avec succès");

      // Lire le fichier Excel avec TOUTES les options
      const workbook = XLSX.read(fileContent, {
        type: "array",
        cellDates: true,
        cellNF: true,
        cellStyles: true,
        cellFormulas: true,
        sheetStubs: true
      });

      // Vérifier que le workbook existe
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Format de fichier Excel non valide ou vide");
      }

      console.log("Feuilles disponibles:", workbook.SheetNames);

      // Chercher l'onglet CRM_Contacts ou utiliser le premier
      const sheetName = workbook.SheetNames.includes('CRM_Contacts') 
        ? 'CRM_Contacts' 
        : workbook.SheetNames[0];

      console.log("Utilisation de la feuille:", sheetName);

      // Récupérer la feuille
      const worksheet = workbook.Sheets[sheetName];

      // Vérifier que la feuille a un contenu
      if (!worksheet || !worksheet["!ref"]) {
        throw new Error(`La feuille ${sheetName} est vide ou invalide`);
      }

      // Obtenir les en-têtes depuis la première ligne
      const headers = [];
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({r: range.s.r, c});
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          headers.push({
            col: XLSX.utils.encode_col(c),
            value: cell.v.toString()
          });
        }
      }
      
      console.log("En-têtes détectés:", headers);

      // Créer un mappage des colonnes importantes
      const columnMap = {
        fullName: null,
        firstName: null,
        lastName: null,
        role: null,
        email: null,
        phone: null,
        company: null,
        department: null
      };

      // Mapper les colonnes en fonction des en-têtes
      headers.forEach(header => {
        const headerValue = header.value.toLowerCase();
        
        if (headerValue === 'full name') columnMap.fullName = header.col;
        else if (headerValue === 'first name') columnMap.firstName = header.col;
        else if (headerValue === 'last name') columnMap.lastName = header.col;
        else if (headerValue === 'role') columnMap.role = header.col;
        else if (headerValue === 'email') columnMap.email = header.col;
        else if (headerValue === 'phone') columnMap.phone = header.col;
        else if (headerValue === '_be_accountname' || headerValue === 'account') columnMap.company = header.col;
        else if (headerValue === 'department') columnMap.department = header.col;
      });

      console.log("Mappage des colonnes:", columnMap);

      // Convertir la feuille en JSON en ignorant la première ligne d'en-têtes
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: 1 // Commencer à la ligne 2 (ignorer les en-têtes)
      });

      if (jsonData.length === 0) {
        console.error("Aucune donnée n'a pu être extraite du fichier Excel");
        throw new Error("Aucune donnée n'a pu être extraite du fichier Excel");
      }

      console.log(`${jsonData.length} lignes extraites`);

      // Normaliser les données en contacts
      const contacts = jsonData.map(row => {
        // Obtenir le nom complet
        let fullName = "";
        if (columnMap.fullName && row[headers.find(h => h.col === columnMap.fullName)?.value]) {
          fullName = row[headers.find(h => h.col === columnMap.fullName)?.value];
        } else if (columnMap.firstName && columnMap.lastName) {
          const firstName = row[headers.find(h => h.col === columnMap.firstName)?.value] || "";
          const lastName = row[headers.find(h => h.col === columnMap.lastName)?.value] || "";
          fullName = `${firstName} ${lastName}`.trim();
        }

        // Ignore les lignes sans nom
        if (!fullName) return null;

        // Obtenir le rôle et le normaliser
        const role = columnMap.role 
          ? row[headers.find(h => h.col === columnMap.role)?.value] || "Poste non spécifié"
          : "Poste non spécifié";
        
        // Utiliser la fonction _normalizeTitle pour classifier le rôle
        const normalizedRole = this._normalizeTitle(role);

        // Obtenir l'email
        const email = columnMap.email
          ? row[headers.find(h => h.col === columnMap.email)?.value] || ""
          : "";

        // Créer l'objet contact
        return {
          fullName,
          role: normalizedRole,
          email: email,
          department: columnMap.department 
            ? row[headers.find(h => h.col === columnMap.department)?.value] || "" 
            : "",
          phone: columnMap.phone 
            ? row[headers.find(h => h.col === columnMap.phone)?.value] || "" 
            : "",
          company: columnMap.company 
            ? row[headers.find(h => h.col === columnMap.company)?.value] || "Schneider Electric" 
            : "Schneider Electric",
          confidenceScore: 1.0, // Score élevé pour les contacts importés
          importedFromExcel: true,
          sources: [],
        };
      }).filter(contact => contact !== null);

      console.log(`${contacts.length} contacts valides extraits`);
      console.log("Exemple des premiers contacts:", contacts.slice(0, 3));

      return contacts;
    } catch (error) {
      console.error("Erreur détaillée lors de l'importation Excel:", error);
      throw new Error(`Erreur lors de l'importation Excel: ${error.message}`);
    }
  }

  /**
   * Normalise un titre pour un format standard
   * @param {string} title - Le titre à normaliser
   * @returns {string} - Le titre normalisé
   */
  _normalizeTitle(title) {
    if (!title) return "Poste non spécifié";
    
    const lowerTitle = title.toLowerCase();
    
    // PDG / CEO
    if (lowerTitle.includes("pdg") || lowerTitle.includes("ceo") || 
        lowerTitle.includes("président") || lowerTitle.includes("president") || 
        lowerTitle.includes("chief executive") || lowerTitle.includes("directeur général")) {
      return "CEO / PDG";
    }
    
    // CFO / Directeur Financier
    if (lowerTitle.includes("cfo") || lowerTitle.includes("financier") || 
        lowerTitle.includes("finance") || lowerTitle.includes("chief financial")) {
      return "CFO / Directeur Financier";
    }
    
    // CIO / DSI
    if (lowerTitle.includes("cio") || lowerTitle.includes("dsi") || 
        lowerTitle.includes("systèmes d'information") || lowerTitle.includes("information technology") ||
        lowerTitle.includes("informatique")) {
      return "CIO / DSI";
    }
    
    // CTO / Directeur Technique
    if (lowerTitle.includes("cto") || lowerTitle.includes("technique") || 
        lowerTitle.includes("technology") || lowerTitle.includes("technical")) {
      return "CTO / Directeur Technique";
    }
    
    // CDO / Directeur Digital
    if (lowerTitle.includes("cdo") || lowerTitle.includes("digital") || 
        lowerTitle.includes("numérique")) {
      return "CDO / Directeur Digital";
    }
    
    // COO / Directeur des Opérations
    if (lowerTitle.includes("coo") || lowerTitle.includes("opérations") || 
        lowerTitle.includes("operations")) {
      return "COO / Directeur des Opérations";
    }
    
    // CMO / Directeur Marketing
    if (lowerTitle.includes("cmo") || lowerTitle.includes("marketing")) {
      return "CMO / Directeur Marketing";
    }
    
    // CHRO / DRH
    if (lowerTitle.includes("rh") || lowerTitle.includes("ressources humaines") || 
        lowerTitle.includes("human resources") || lowerTitle.includes("chro") || 
        lowerTitle.includes("drh")) {
      return "CHRO / DRH";
    }
    
    // CSO / Directeur Sécurité
    if (lowerTitle.includes("cso") || lowerTitle.includes("sécurité") || 
        lowerTitle.includes("security")) {
      return "CSO / Directeur Sécurité";
    }
    
    // Directeur Stratégie
    if (lowerTitle.includes("stratégie") || lowerTitle.includes("strategy")) {
      return "Directeur Stratégie";
    }
    
    // Directeur Commercial
    if ((lowerTitle.includes("commercial") || lowerTitle.includes("ventes") || 
         lowerTitle.includes("sales")) && 
        (lowerTitle.includes("directeur") || lowerTitle.includes("director"))) {
      return "Directeur Commercial";
    }
    
    // Directeur de la Transformation
    if (lowerTitle.includes("transformation")) {
      return "Directeur de la Transformation";
    }
    
    // Directeur de l'Innovation
    if (lowerTitle.includes("innovation")) {
      return "Directeur de l'Innovation";
    }
    
    // Directeur de la Supply Chain
    if (lowerTitle.includes("supply chain") || lowerTitle.includes("chaîne") || 
        lowerTitle.includes("logistique")) {
      return "Directeur de la Supply Chain";
    }
    
    // Directeur de Production
    if (lowerTitle.includes("production") || lowerTitle.includes("manufacturing")) {
      return "Directeur de Production";
    }
    
    // Directeur de Projet
    if (lowerTitle.includes("projet") || lowerTitle.includes("project")) {
      return "Directeur de Projet";
    }
    
    // VP / Vice-Président
    if (lowerTitle.includes("vice") || lowerTitle.includes("vp")) {
      return "VP / Vice-Président";
    }
    
    // Responsable IT
    if ((lowerTitle.includes("it") || lowerTitle.includes("informatique")) && 
        (lowerTitle.includes("responsable") || lowerTitle.includes("manager") || 
         lowerTitle.includes("chef"))) {
      return "Responsable IT";
    }
    
    // Responsable Commercial
    if ((lowerTitle.includes("commercial") || lowerTitle.includes("ventes") || 
         lowerTitle.includes("sales")) && 
        (lowerTitle.includes("responsable") || lowerTitle.includes("manager") || 
         lowerTitle.includes("chef"))) {
      return "Responsable Commercial";
    }
    
    // Responsable Achats
    if (lowerTitle.includes("achat") || lowerTitle.includes("procurement") || 
        lowerTitle.includes("purchasing")) {
      return "Responsable Achats";
    }
    
    // Chef de Produit
    if (lowerTitle.includes("produit") || lowerTitle.includes("product")) {
      return "Chef de Produit";
    }
    
    // Si aucune correspondance précise, retourner "Autre"
    return "Autre";
  }

  /**
   * Méthode utilitaire pour lire un fichier comme texte
   * @param {File} file - Le fichier à lire
   * @returns {Promise<string>} - Le contenu du fichier
   */
  _readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Erreur de lecture du fichier"));
      reader.readAsText(file);
    });
  }

  /**
   * Méthode utilitaire pour lire un fichier comme ArrayBuffer
   * @param {File} file - Le fichier à lire
   * @returns {Promise<ArrayBuffer>} - Le contenu du fichier
   */
  _readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Erreur de lecture du fichier"));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Analyse la pertinence des contacts par rapport aux actualités
   * @param {Array} contacts - Les contacts importés
   * @param {Array} relevanceMatrix - La matrice de pertinence des actualités
   * @returns {Array} - Les contacts avec un score de pertinence
   */
  analyzeContactRelevance(contacts, relevanceMatrix) {
    return contacts.map((contact) => {
      const relatedOffers = new Set();
      const relatedNews = new Set();
      let maxRelevanceScore = 0;

      // Chercher des correspondances dans les informations du contact
      const contactInfo = `${contact.role} ${contact.department || ""} ${
        contact.business || ""
      } ${contact.industry || ""}`.toLowerCase();

      relevanceMatrix.forEach((item) => {
        // Vérifier si les détails de l'offre correspondent au profil du contact
        const offerDetails = item.offerDetail.toLowerCase();
        const newsText = `${item.news} ${
          item.newsDescription || ""
        }`.toLowerCase();

        // Vérifier les correspondances directes entre la fonction du contact et les détails de l'offre
        const hasOfferMatch = offerDetails.split(", ").some(
          (detail) =>
            contactInfo.includes(detail.trim()) ||
            // Vérifier les termes clés de la fonction
            [
              "directeur",
              "manager",
              "responsable",
              "chef",
              "head",
              "président",
              "vp",
            ].some(
              (term) =>
                contactInfo.includes(term) &&
                detail.toLowerCase().includes(term)
            )
        );

        // Vérifier les correspondances entre la fonction du contact et le texte de l'actualité
        const hasNewsMatch =
          newsText.includes(contact.role.toLowerCase()) ||
          (contact.department &&
            newsText.includes(contact.department.toLowerCase())) ||
          (contact.business &&
            newsText.includes(contact.business.toLowerCase()));

        if (hasOfferMatch || hasNewsMatch) {
          item.offerDetail
            .split(", ")
            .forEach((offer) => relatedOffers.add(offer));
          relatedNews.add(item.news);

          // Mettre à jour le score de pertinence maximum
          if (item.relevanceScore > maxRelevanceScore) {
            maxRelevanceScore = item.relevanceScore;
          }
        }
      });

      // Ajouter les actualités comme sources
      const sources = Array.from(relatedNews).map((newsTitle) => {
        const newsItem = relevanceMatrix.find(
          (item) => item.news === newsTitle
        );
        return {
          title: newsTitle,
          date: newsItem?.newsDate || "",
          link: newsItem?.newsLink || "",
        };
      });

      // Mettre à jour le contact avec les informations de pertinence
      return {
        ...contact,
        relatedOffers: Array.from(relatedOffers),
        sources,
        relevanceScore:
          sources.length > 0 ? maxRelevanceScore * 0.33 + 0.67 : 0.67, // Ajuster le score de confiance
      };
    });
  }

  /**
   * Identifie les rôles mentionnés dans les actualités
   * @param {Array} relevanceMatrix - La matrice de pertinence des actualités
   * @returns {Array} - Les rôles identifiés dans les actualités
   */
  identifyRolesInNews(relevanceMatrix) {
    const roles = new Set();

    // Liste des mots-clés de fonction à rechercher
    const functionKeywords = [
      "Directeur",
      "Directrice",
      "Director",
      "Responsable",
      "Head of",
      "Chef de",
      "Manager",
      "Président",
      "President",
      "CEO",
      "COO",
      "CFO",
      "CTO",
      "CIO",
      "CISO",
      "CDO",
      "CMO",
      "CSO",
      "Vice-président",
      "Vice President",
      "VP",
    ];

    // Expressions régulières pour capter les fonctions dans le texte
    const functionRegexes = [
      // Format: "Directeur de X"
      new RegExp(
        `(${functionKeywords.join(
          "|"
        )})\\s+(?:de|des|du|de la|d'|of|for)?\\s+[A-Z][a-zÀ-ÿ]+(?:\\s+[A-Z][a-zÀ-ÿ]+)*`,
        "gi"
      ),
      // Format: "X Director/Manager"
      new RegExp(
        `[A-Z][a-zÀ-ÿ]+(?:\\s+[A-Z][a-zÀ-ÿ]+)*\\s+(${functionKeywords.join(
          "|"
        )})`,
        "gi"
      ),
    ];

    relevanceMatrix.forEach((item) => {
      const newsText = `${item.news} ${item.newsDescription || ""}`;

      // Appliquer chaque regex
      functionRegexes.forEach((regex) => {
        const matches = newsText.match(regex);
        if (matches) {
          matches.forEach((match) => roles.add(match.trim()));
        }
      });
    });

    return Array.from(roles);
  }

  /**
   * Trouve les contacts pertinents pour les rôles identifiés
   * @param {Array} contacts - Les contacts disponibles
   * @param {Array} roles - Les rôles identifiés dans les actualités
   * @returns {Object} - Mapping des rôles vers les contacts pertinents
   */
  matchContactsToRoles(contacts, roles) {
    const rolesToContacts = {};

    roles.forEach((role) => {
      const matchingContacts = contacts.filter((contact) => {
        const roleText = role.toLowerCase();
        const contactInfo = `${contact.role} ${contact.department || ""} ${
          contact.business || ""
        }`.toLowerCase();

        return (
          contactInfo.includes(roleText) ||
          roleText.includes(contact.role.toLowerCase()) ||
          // Correspondance de fonction spécifique (ex: Directeur = Director)
          (roleText.includes("directeur") &&
            contactInfo.includes("director")) ||
          (roleText.includes("director") &&
            contactInfo.includes("directeur")) ||
          (roleText.includes("responsable") && contactInfo.includes("head")) ||
          (roleText.includes("head of") && contactInfo.includes("responsable"))
        );
      });

      if (matchingContacts.length > 0) {
        rolesToContacts[role] = matchingContacts;
      }
    });

    return rolesToContacts;
  }

  /**
   * Identifie les rôles manquants (mentionnés dans les actualités mais sans contact correspondant)
   * @param {Array} roles - Les rôles identifiés dans les actualités
   * @param {Object} rolesToContacts - Mapping des rôles vers les contacts
   * @returns {Array} - Les rôles manquants
   */
  identifyMissingRoles(roles, rolesToContacts) {
    return roles.filter((role) => !rolesToContacts[role]);
  }
}

// Exporter une instance unique du service
export const contactService = new ContactService();
