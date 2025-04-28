/**
 * Service pour importer et analyser les contacts Schneider Electric
 * depuis un fichier Excel et les faire correspondre avec les actualités
 */

/**
 * Classe pour gérer l'importation et l'analyse des contacts Excel
 */
class ExcelImportService {
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
        console.error(
          `L'onglet '${mergedOptions.sheetName}' n'existe pas dans le fichier.`
        );
        console.log("Onglets disponibles:", workbook.SheetNames);
        throw new Error(
          `L'onglet '${mergedOptions.sheetName}' n'existe pas dans le fichier.`
        );
      }

      // Récupérer la feuille CRM_Contacts
      const worksheet = workbook.Sheets[mergedOptions.sheetName];

      // Analyser la structure de la feuille
      const sheetRange = XLSX.utils.decode_range(worksheet["!ref"]);
      console.log("Plage de la feuille:", sheetRange);

      // Récupérer tous les en-têtes possibles et leurs indices
      const headerMappings = this.analyzeHeaders(
        worksheet,
        mergedOptions.headerRowIndex
      );
      console.log("Mappings d'en-têtes détectés:", headerMappings);

      // Convertir la feuille en JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: "A", // Utiliser des lettres comme en-têtes pour préserver l'ordre exact
        range: mergedOptions.headerRowIndex, // Commencer à partir de la ligne d'en-tête
      });

      if (jsonData.length <= 1) {
        console.error(
          "Le fichier Excel ne contient pas suffisamment de données."
        );
        throw new Error(
          "Le fichier Excel ne contient pas suffisamment de données."
        );
      }

      // Supprimer la ligne d'en-tête
      jsonData.shift();

      // Normaliser les données en utilisant les mappages détectés
      const contacts = this.normalizeContacts(
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
   * Analyse les en-têtes de la feuille Excel pour créer des mappings
   * @param {Object} worksheet - La feuille Excel
   * @param {number} headerRowIndex - L'index de la ligne d'en-tête
   * @returns {Object} - Mappings d'en-têtes
   */
  analyzeHeaders(worksheet, headerRowIndex) {
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
      if (
        headerText.includes("prénom") ||
        headerText.includes("prenom") ||
        headerText.includes("first name")
      ) {
        mappings.firstName = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("nom") ||
        headerText.includes("last name") ||
        headerText === "name"
      ) {
        mappings.lastName = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("email") ||
        headerText.includes("courriel") ||
        headerText.includes("mail")
      ) {
        mappings.email = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("fonction") ||
        headerText.includes("function") ||
        headerText.includes("title") ||
        headerText.includes("poste")
      ) {
        mappings.function = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("département") ||
        headerText.includes("departement") ||
        headerText.includes("department")
      ) {
        mappings.department = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("entreprise") ||
        headerText.includes("company") ||
        headerText.includes("organisation")
      ) {
        mappings.company = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("téléphone") ||
        headerText.includes("telephone") ||
        (headerText.includes("phone") && !headerText.includes("mobile"))
      ) {
        mappings.phone = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("mobile") ||
        headerText.includes("cellulaire") ||
        headerText.includes("portable")
      ) {
        mappings.mobile = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("localisation") ||
        headerText.includes("location") ||
        headerText.includes("bureau") ||
        headerText.includes("office")
      ) {
        mappings.location = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("pays") ||
        headerText.includes("country")
      ) {
        mappings.country = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("business") ||
        headerText.includes("business unit") ||
        headerText.includes("bu")
      ) {
        mappings.business = XLSX.utils.encode_col(col);
      } else if (
        headerText.includes("industrie") ||
        headerText.includes("industry") ||
        headerText.includes("secteur")
      ) {
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
   * Normalise les données de contact importées en fonction des mappings
   * @param {Array} data - Les données brutes importées
   * @param {Object} mappings - Les mappings des en-têtes
   * @param {string} defaultCompany - L'entreprise par défaut
   * @returns {Array} - Les contacts normalisés
   */
  normalizeContacts(data, mappings, defaultCompany) {
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
        `${contact.role} ${contact.department} ${contact.business} ${contact.industry}`.toLowerCase();

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
        const contactInfo =
          `${contact.role} ${contact.department} ${contact.business}`.toLowerCase();

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

export const excelImportService = new ExcelImportService();
