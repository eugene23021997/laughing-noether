/**
 * Service unifié pour l'extraction et la gestion des contacts
 * Ce service analyse le contenu des articles pour identifier les personnes, 
 * gère l'import/export des contacts et permet l'analyse de pertinence
 */

import * as XLSX from "xlsx";

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

  // Forme simple "Jean Dupont (Directeur...)"
  PERSON_TITLE_PARENTHESIS:
    /([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)+)\s*\(([^()]*(?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice-président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)[^()]*)\)/gi,

  // Formes comme "X a nommé Jean Dupont au poste de Directeur..."
  NAMED_AS:
    /(?:a\s+nommé|nomme|désigne|a\s+été\s+nommé|vient\s+d[e\']être\s+nommé|a\s+promu|promeut|est\s+nommé|devient|a\s+été\s+désigné)\s+([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)+)\s+(?:au\s+poste\s+de|comme|en\s+tant\s+que|en\s+qualité\s+de)\s+((?:[^,.]|[dD]'|[dD]e\s)+(?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice-président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)\s+(?:[^,.])+)/gi,

  // Reconnaissance directe des titres complets comme Chief Digital Officer
  TITLE_ONLY:
    /(Chief\s+(?:Digital|Information|Technology|Financial|Executive|Marketing|Operating|Human\s+Resources|Product|Strategy|Revenue|Customer|Security)\s+Officer|C[IDTFEMOPRSXH]O|(?:directeur|directrice)\s+(?:général|générale|technique|financier|financière|commercial|commerciale|des achats|des ventes|des opérations|marketing|des systèmes d'information))/gi,

  // Liste de noms pour les personnes sans titre clairement identifié
  POTENTIAL_NAMES: /([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+){1,2})(?![a-zÀ-ÿ])/g,
};

// Liste de titres/postes à rechercher (utilisée pour l'analyse contextuelle)
const TITLES = [
  // Direction générale
  "PDG", "CEO", "Président", "Présidente", "Directeur Général", "Directrice Générale", 
  "DG", "Chief Executive Officer", "President", "Chairman", "Chairwoman",

  // Direction finance
  "CFO", "Directeur Financier", "Directrice Financière", "Chief Financial Officer",
  "DAF", "Directeur Administratif et Financier", "Trésorier", "VP Finance",

  // Direction IT
  "CIO", "DSI", "Directeur des Systèmes d'Information", "Directrice des Systèmes d'Information",
  "Chief Information Officer", "CTO", "Chief Technology Officer", "Directeur Technique",
  "Directeur Digital", "Chief Digital Officer", "CDO",

  // Innovation & Data
  "CDO", "Chief Data Officer", "Directeur des Données", "Chief Innovation Officer",
  "Directeur de l'Innovation", "Data Officer", "Directeur Data",

  // Marketing & Communication
  "CMO", "Directeur Marketing", "Directrice Marketing", "Chief Marketing Officer",
  "Directeur de la Communication", "Directrice de la Communication", "Responsable Marketing",

  // Opérations & Supply Chain
  "COO", "Directeur des Opérations", "Directrice des Opérations", "Chief Operations Officer",
  "Directeur Supply Chain", "Directeur de la Chaîne d'Approvisionnement", "VP Operations",

  // Ressources Humaines
  "DRH", "Directeur des Ressources Humaines", "Directrice des Ressources Humaines",
  "CHRO", "Chief Human Resources Officer", "VP HR", "VP RH",

  // Sécurité
  "CSO", "CISO", "Chief Security Officer", "Chief Information Security Officer",
  "Directeur de la Sécurité",

  // Produit
  "CPO", "Chief Product Officer", "Directeur de Produit", "VP Product",

  // Stratégie
  "CSO", "Chief Strategy Officer", "Directeur de la Stratégie", "Head of Strategy",

  // Autres postes de direction
  "Directeur", "Directrice", "Vice-Président", "Vice-Présidente", "VP",
  "Responsable", "Chef de", "Head of", "Manager", "Dirigeant", "Executive",
];

// Entités connues à exclure (faux positifs)
const KNOWN_ENTITIES = [
  "Schneider Electric", "BearingPoint", "Microsoft", "Google", "Apple", "Amazon",
  "Accenture", "Capgemini", "Deloitte", "KPMG", "EY", "PWC", "IBM", "Oracle", "SAP",
  "Salesforce", "Siemens", "ABB", "General Electric", "Legrand", "Eaton", "France",
  "Europe", "États-Unis", "États Unis", "Etats-Unis", "Etats Unis", "Paris", "Lyon", 
  "Grenoble", "Commission Européenne", "Union Européenne", "Nations Unies", "ONU", 
  "Parlement", "evolving world", "industrial automation", "staying ahead", "curve",
  "Business Applications", "Data", "Analytics and AI", "Operations", "People & Strategy", 
  "Demand Management", "The future in motion", "Flexible", "agile operations",
];

/**
 * Classe ContactService pour gérer toutes les fonctionnalités liées aux contacts
 */
class ContactService {
  /**
   * Extrait les contacts potentiels d'un texte en utilisant différentes méthodes
   * @param {string} text - Le texte à analyser (titre + description de l'article)
   * @param {string} company - Le nom de l'entreprise pour le contexte
   * @returns {Array} Liste des contacts trouvés avec leur nom, rôle et niveau de confiance
   */
  extractContacts(text, company = "Schneider Electric") {
    if (!text) return [];

    const contacts = [];
    const processedNames = new Set(); // Pour éviter les doublons

    // Nettoyer le texte (supprimer les tags HTML, etc.)
    const cleanText = text.replace(/<[^>]*>?/gm, "");

    // Méthode 1: Recherche de modèles précis nom+titre
    this._extractWithPattern(PATTERNS.PERSON_WITH_TITLE, cleanText, contacts, processedNames, 0.9, company);
    this._extractWithPattern(PATTERNS.PERSON_WITH_TITLE_MR_MRS, cleanText, contacts, processedNames, 0.85, company, 1);
    this._extractWithPattern(PATTERNS.TITLE_THEN_PERSON, cleanText, contacts, processedNames, 0.8, company, 2, 1);
    this._extractWithPattern(PATTERNS.PERSON_TITLE_PARENTHESIS, cleanText, contacts, processedNames, 0.8, company);
    this._extractWithPattern(PATTERNS.NAMED_AS, cleanText, contacts, processedNames, 0.9, company);

    // Extraire les titres sans nom associé
    this._extractTitlesOnly(PATTERNS.TITLE_ONLY, cleanText, contacts, processedNames, company);

    // Méthode 2: Recherche contextuelle pour les noms sans titre explicite
    const potentialNames = [];
    let match;
    while ((match = PATTERNS.POTENTIAL_NAMES.exec(cleanText)) !== null) {
      const name = match[1];

      // Ignorer si déjà traité ou si c'est une entité connue
      if (
        processedNames.has(name.toLowerCase()) ||
        KNOWN_ENTITIES.some(
          (entity) => name.includes(entity) || entity.includes(name)
        )
      ) {
        continue;
      }

      // Obtenir le contexte avant et après le nom (50 caractères)
      const startPos = Math.max(0, match.index - 50);
      const endPos = Math.min(cleanText.length, match.index + name.length + 50);
      const context = cleanText.substring(startPos, endPos);

      // Calculer un score de confiance basé sur le contexte
      let confidenceScore = 0.3; // Score de base

      // Indice 1: Proche de l'entreprise mentionnée
      if (context.includes(company)) {
        confidenceScore += 0.2;
      }

      // Indice 2: Contient des mots comme "nommé", "rejoint", etc.
      if (
        /nomm[ée]|rejoi[nt]|arriv[ée]|intègre|recrut[ée]|promu[e]?|désign[ée]/i.test(
          context
        )
      ) {
        confidenceScore += 0.15;
      }

      // Indice 3: Proximité d'un titre sans avoir été capturé par les regex précédentes
      const titleNearby = TITLES.some((title) =>
        context.toLowerCase().includes(title.toLowerCase())
      );
      if (titleNearby) {
        confidenceScore += 0.15;

        // Essayer d'extraire le titre à partir du contexte
        const potentialTitle = this._extractTitleFromContext(context, name);

        potentialNames.push({
          name,
          role: potentialTitle || "Poste non spécifié",
          confidenceScore,
          company,
          context,
        });
      } else if (confidenceScore > 0.4) {
        // Ajouter seulement si le score dépasse un certain seuil
        potentialNames.push({
          name,
          role: "Poste non spécifié",
          confidenceScore,
          company,
          context,
        });
      }

      processedNames.add(name.toLowerCase());
    }

    // Filtrer les noms potentiels et les ajouter à la liste des contacts
    potentialNames
      .filter((contact) => contact.confidenceScore >= 0.4)
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .forEach((contact) => contacts.push(contact));

    return contacts;
  }

  /**
   * Méthode privée pour extraire les contacts à partir d'un modèle regex spécifique
   */
  _extractWithPattern(
    pattern,
    text,
    contacts,
    processedNames,
    baseConfidence,
    company,
    nameIndex = 1,
    roleIndex = 2
  ) {
    pattern.lastIndex = 0; // Réinitialiser l'index du regex

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[nameIndex].trim();
      const role = match[roleIndex].trim();

      // Vérifier si ce n'est pas une entité connue
      if (
        KNOWN_ENTITIES.some(
          (entity) => name.includes(entity) || entity.includes(name)
        )
      ) {
        continue;
      }

      // Éviter les doublons
      if (!processedNames.has(name.toLowerCase())) {
        processedNames.add(name.toLowerCase());

        contacts.push({
          name,
          role,
          confidenceScore: baseConfidence,
          company,
          context: text.substring(
            Math.max(0, match.index - 30),
            Math.min(text.length, match.index + match[0].length + 30)
          ),
        });
      }
    }
  }

  /**
   * Méthode privée pour extraire les titres sans nom associé
   */
  _extractTitlesOnly(pattern, text, contacts, processedNames, company) {
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const role = match[1].trim();

      // Vérifier si ce titre est déjà traité
      const roleKey = role.toLowerCase();
      if (processedNames.has(roleKey)) {
        continue;
      }

      // Vérifier si ce n'est pas une entité connue
      if (
        KNOWN_ENTITIES.some(
          (entity) => role.includes(entity) || entity.includes(entity)
        )
      ) {
        continue;
      }

      // Ajouter comme contact avec nom manquant
      contacts.push({
        name: "Nom non identifié",
        role: role,
        confidenceScore: 0.6,
        company,
        context: text.substring(
          Math.max(0, match.index - 30),
          Math.min(text.length, match.index + match[0].length + 30)
        ),
      });

      processedNames.add(roleKey);
    }
  }

  /**
   * Méthode privée pour extraire un titre à partir du contexte d'un nom
   */
  _extractTitleFromContext(context, name) {
    const namePos = context.indexOf(name);
    if (namePos === -1) return null;

    // Recherche de titre avant le nom
    const beforeName = context.substring(0, namePos).trim();
    // Recherche de titre après le nom
    const afterName = context.substring(namePos + name.length).trim();

    for (const title of TITLES) {
      // Vérifier si le titre est présent avant ou après le nom
      if (beforeName.includes(title)) {
        // Extraire la phrase contenant le titre (avant le nom)
        const titlePos = beforeName.lastIndexOf(title);
        const startPos = beforeName.lastIndexOf(".", titlePos);
        const endPos = beforeName.length;

        const extractedTitle = beforeName
          .substring(
            startPos === -1 ? Math.max(0, titlePos - 20) : startPos + 1,
            endPos
          )
          .trim();

        return extractedTitle;
      }

      if (afterName.includes(title)) {
        // Extraire la phrase contenant le titre (après le nom)
        const titlePos = afterName.indexOf(title);
        const startPos = 0;
        const endPos = afterName.indexOf(".", titlePos);

        const extractedTitle = afterName
          .substring(
            startPos,
            endPos === -1
              ? Math.min(afterName.length, titlePos + title.length + 20)
              : endPos
          )
          .trim();

        return extractedTitle;
      }
    }

    return null;
  }

  /**
   * Extrait les contacts de toutes les actualités
   * @param {Array} news - Liste des actualités à analyser
   * @param {string} company - Nom de l'entreprise pour le contexte
   * @returns {Array} Liste des contacts extraits
   */
  extractContactsFromNews(news, company = "Schneider Electric") {
    const allContacts = [];

    news.forEach((newsItem) => {
      // Combiner le titre et la description pour l'analyse
      const combinedText = `${newsItem.title || newsItem.news}. ${newsItem.description || newsItem.newsDescription || ""}`;

      // Extraire les contacts de cette actualité
      const contacts = this.extractContacts(combinedText, company);

      // Ajouter les références à l'article source
      contacts.forEach((contact) => {
        contact.source = {
          title: newsItem.title || newsItem.news,
          date: newsItem.date || newsItem.newsDate,
          link: newsItem.link || newsItem.newsLink || "",
        };

        allContacts.push(contact);
      });
    });

    // Dédupliquer et trier par score de confiance
    return this._deduplicateContacts(allContacts).sort(
      (a, b) => b.confidenceScore - a.confidenceScore
    );
  }

  /**
   * Méthode privée pour dédupliquer les contacts en fusionnant les informations sur les mêmes personnes
   */
  _deduplicateContacts(contacts) {
    const contactMap = new Map();

    contacts.forEach((contact) => {
      const nameKey = contact.name.toLowerCase();

      if (contactMap.has(nameKey)) {
        const existing = contactMap.get(nameKey);

        // Garder le rôle le plus précis
        if (
          contact.role !== "Poste non spécifié" &&
          (existing.role === "Poste non spécifié" ||
            contact.confidenceScore > existing.confidenceScore)
        ) {
          existing.role = contact.role;
        }

        // Mettre à jour le score de confiance
        existing.confidenceScore = Math.max(
          existing.confidenceScore,
          contact.confidenceScore
        );

        // Ajouter la source si elle est différente
        if (
          !existing.sources.some((source) => source.link === contact.source.link)
        ) {
          existing.sources.push(contact.source);
        }
      } else {
        // Nouveau contact
        contactMap.set(nameKey, {
          ...contact,
          sources: [contact.source],
        });

        // Supprimer la propriété source individuelle
        delete contactMap.get(nameKey).source;
      }
    });

    return Array.from(contactMap.values());
  }

  /**
   * Importe des contacts depuis un fichier Excel
   * @param {string} file - Le chemin du fichier à importer
   * @param {Object} options - Options d'importation
   * @returns {Promise<Array>} - Les contacts importés
   */
  async importContacts(file, options = {}) {
    try {
      const fileContent = await window.fs.readFile(file, {
        encoding: "binary",
      });

      // Options par défaut
      const defaultOptions = {
        sheetName: "CRM_Contacts",
        headerRowIndex: 0,
        contactCompany: "Schneider Electric",
      };

      const mergedOptions = { ...defaultOptions, ...options };

      // Lire le fichier Excel avec toutes les options pour capturer les métadonnées
      const workbook = XLSX.read(fileContent, {
        type: "binary",
        cellDates: true,
        cellStyles: true,
        cellNF: true,
        cellFormulas: true,
        sheetStubs: true,
      });

      // Vérifier que l'onglet existe
      if (!workbook.SheetNames.includes(mergedOptions.sheetName)) {
        console.error(`L'onglet '${mergedOptions.sheetName}' n'existe pas dans le fichier.`);
        console.log("Onglets disponibles:", workbook.SheetNames);
        throw new Error(`L'onglet '${mergedOptions.sheetName}' n'existe pas dans le fichier.`);
      }

      // Récupérer la feuille
      const worksheet = workbook.Sheets[mergedOptions.sheetName];

      // Analyser la structure de la feuille
      const sheetRange = XLSX.utils.decode_range(worksheet["!ref"]);
      console.log("Plage de la feuille:", sheetRange);

      // Récupérer tous les en-têtes possibles et leurs indices
      const headerMappings = this._analyzeHeaders(
        worksheet,
        mergedOptions.headerRowIndex
      );

      // Convertir la feuille en JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: "A", // Utiliser des lettres comme en-têtes pour préserver l'ordre exact
        range: mergedOptions.headerRowIndex, // Commencer à partir de la ligne d'en-tête
      });

      if (jsonData.length <= 1) {
        throw new Error("Le fichier Excel ne contient pas suffisamment de données.");
      }

      // Supprimer la ligne d'en-tête
      jsonData.shift();

      // Normaliser les données en utilisant les mappages détectés
      const contacts = this._normalizeContacts(
        jsonData,
        headerMappings,
        mergedOptions.contactCompany
      );

      return contacts;
    } catch (error) {
      console.error("Erreur lors de l'importation des contacts:", error);
      throw error;
    }
  }

  /**
   * Méthode privée pour analyser les en-têtes de la feuille Excel pour créer des mappings
   */
  _analyzeHeaders(worksheet, headerRowIndex) {
    const mappings = {
      firstName: null,
      lastName: null,
      fullName: null,
      email: null,
      function: null,
      department: null,
      company: null,
      phone: null,
      mobile: null,
      location: null,
      country: null,
      business: null,
      industry: null,
    };

    // Détecter la plage de la feuille
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    // Parcourir toutes les cellules de la ligne d'en-tête
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
      const cell = worksheet[cellAddress];

      if (!cell || !cell.v) continue;

      const headerText = cell.v.toString().trim().toLowerCase();

      // Mapper les en-têtes aux champs
      if (headerText.includes("prénom") || headerText.includes("prenom") || headerText.includes("first name")) {
        mappings.firstName = XLSX.utils.encode_col(col);
      } else if (headerText.includes("nom") || headerText.includes("last name") || headerText === "name") {
        mappings.lastName = XLSX.utils.encode_col(col);
      } else if (headerText.includes("email") || headerText.includes("courriel") || headerText.includes("mail")) {
        mappings.email = XLSX.utils.encode_col(col);
      } else if (headerText.includes("fonction") || headerText.includes("function") || 
                 headerText.includes("title") || headerText.includes("poste")) {
        mappings.function = XLSX.utils.encode_col(col);
      } else if (headerText.includes("département") || headerText.includes("departement") || 
                 headerText.includes("department")) {
        mappings.department = XLSX.utils.encode_col(col);
      } else if (headerText.includes("entreprise") || headerText.includes("company") || 
                 headerText.includes("organisation")) {
        mappings.company = XLSX.utils.encode_col(col);
      } else if (headerText.includes("téléphone") || headerText.includes("telephone") || 
                (headerText.includes("phone") && !headerText.includes("mobile"))) {
        mappings.phone = XLSX.utils.encode_col(col);
      } else if (headerText.includes("mobile") || headerText.includes("cellulaire") || 
                 headerText.includes("portable")) {
        mappings.mobile = XLSX.utils.encode_col(col);
      } else if (headerText.includes("localisation") || headerText.includes("location") || 
                headerText.includes("bureau") || headerText.includes("office")) {
        mappings.location = XLSX.utils.encode_col(col);
      } else if (headerText.includes("pays") || headerText.includes("country")) {
        mappings.country = XLSX.utils.encode_col(col);
      } else if (headerText.includes("business") || headerText.includes("business unit") || 
                headerText.includes("bu")) {
        mappings.business = XLSX.utils.encode_col(col);
      } else if (headerText.includes("industrie") || headerText.includes("industry") || 
                headerText.includes("secteur")) {
        mappings.industry = XLSX.utils.encode_col(col);
      }
    }

    // Si fullName n'est pas trouvé mais firstName et lastName le sont, marquer comme fullName à calculer
    if (!mappings.fullName && (mappings.firstName || mappings.lastName)) {
      mappings.fullName = "calculated";
    }

    return mappings;
  }

  /**
   * Méthode privée pour normaliser les données de contact importées
   */
  _normalizeContacts(data, mappings, defaultCompany) {
    return data
      .map((row) => {
        // Générer le nom complet si nécessaire
        let fullName = "";
        if (mappings.fullName === "calculated") {
          const firstName = mappings.firstName
            ? row[mappings.firstName] || ""
            : "";
          const lastName = mappings.lastName
            ? row[mappings.lastName] || ""
            : "";
          fullName = `${firstName} ${lastName}`.trim();
        } else if (mappings.fullName) {
          fullName = row[mappings.fullName] || "";
        }

        // Créer l'objet contact normalisé
        return {
          fullName,
          role: mappings.function
            ? row[mappings.function] || "Poste non spécifié"
            : "Poste non spécifié",
          company: mappings.company
            ? row[mappings.company] || defaultCompany
            : defaultCompany,
          email: mappings.email ? row[mappings.email] || "" : "",
          department: mappings.department ? row[mappings.department] || "" : "",
          phone: mappings.phone
            ? row[mappings.phone] || ""
            : mappings.mobile
            ? row[mappings.mobile] || ""
            : "",
          location: mappings.location ? row[mappings.location] || "" : "",
          country: mappings.country ? row[mappings.country] || "" : "",
          business: mappings.business ? row[mappings.business] || "" : "",
          industry: mappings.industry ? row[mappings.industry] || "" : "",
          confidenceScore: 1.0, // Score élevé pour les contacts importés
          importedFromExcel: true,
          sources: [],
        };
      })
      .filter((contact) => {
        // Filtrer les lignes vides ou invalides
        return (
          contact.role !== "Poste non spécifié" ||
          contact.email ||
          contact.department ||
          contact.business
        );
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
      const contactInfo =
        `${contact.role} ${contact.department || ""} ${contact.business || ""} ${contact.industry || ""}`.toLowerCase();

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
      "Directeur", "Directrice", "Director", "Responsable", "Head of", 
      "Chef de", "Manager", "Président", "President", "CEO", "COO", 
      "CFO", "CTO", "CIO", "CISO", "CDO", "CMO", "CSO", 
      "Vice-président", "Vice President", "VP",
    ];

    // Expressions régulières pour capter les fonctions dans le texte
    const functionRegexes = [
      // Format: "Directeur de X"
      new RegExp(
        `(${functionKeywords.join("|")})\\s+(?:de|des|du|de la|d'|of|for)?\\s+[A-Z][a-zÀ-ÿ]+(?:\\s+[A-Z][a-zÀ-ÿ]+)*`,
        "gi"
      ),
      // Format: "X Director/Manager"
      new RegExp(
        `[A-Z][a-zÀ-ÿ]+(?:\\s+[A-Z][a-zÀ-ÿ]+)*\\s+(${functionKeywords.join("|")})`,
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
        const contactInfo =
          `${contact.role} ${contact.department || ""} ${contact.business || ""}`.toLowerCase();

        return (
          contactInfo.includes(roleText) ||
          roleText.includes(contact.role.toLowerCase()) ||
          // Correspondance de fonction spécifique (ex: Directeur = Director)
          (roleText.includes("directeur") && contactInfo.includes("director")) ||
          (roleText.includes("director") && contactInfo.includes("directeur")) ||
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