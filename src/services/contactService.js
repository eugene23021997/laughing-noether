/**
 * Service unifié pour l'extraction et la gestion des contacts
 * Ce service analyse le contenu des articles pour identifier les personnes,
 * gère l'import/export des contacts et permet l'analyse de pertinence
 */

// Expressions régulières pour identifier les noms et titres - OPTIMISÉES
const PATTERNS = {
  // Modèle : [Prénom Nom], [Titre/Fonction] - moins restrictif
  PERSON_WITH_TITLE:
    /([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+)+)\s*,\s*((?:[^,.;:]+\s+)?(?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice[-\s]président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)(?:\s+[^,.;:]+)*)/gi,

  // Pour les cas comme "M. Dupont, Directeur..." - moins restrictif
  PERSON_WITH_TITLE_MR_MRS:
    /(?:M\.|Mme\.?|Mlle\.?|Mr\.?|Mrs\.?|Ms\.?)\s+([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+)*)\s*,\s*((?:[^,.;:]+\s+)?(?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice[-\s]président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)(?:\s+[^,.;:]+)*)/gi,

  // Motifs comme "Directeur X, Jean Dupont" - moins restrictif
  TITLE_THEN_PERSON:
    /((?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice[-\s]président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)(?:\s+[^,.;:]+)*),\s+([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+)+)/gi,

  // Modèle pour les podcasts et interviews - plus permissif
  PODCAST_PERSON_TITLE:
    /(?:podcast|interview|entretien|webinar|webinaire).*?(?:with|avec|featuring|feat\.?|host(?:ed)? by|par)\s+([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+){1,3})(?:\s*[,(-]\s*((?:Chief|Director|Head|Manager|VP|Directeur|Président|CEO|CIO|CTO|CDO|CFO|CSO)[^,.;:()]*)?)?/i,

  // Modèle pour "Prénom Nom est (le nouveau) Titre" - moins restrictif
  NAMED_AS_TITLE:
    /([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+){1,3})\s+(?:est|is|devient|a été nommé|nommé|appointed|becomes|named)\s+(?:le\s+|la\s+|l['\u2019]\s*)?(?:nouveau|nouvelle|new)?\s+((?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice[-\s]président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)(?:\s+[^,.;:]+){0,5})/i,

  // NOUVEAU: Modèle pour "Prénom Nom, Titre de Company"
  PERSON_COMPANY_TITLE:
    /([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+)+)[\s,]+(?:(?:directeur|directrice|président|présidente|CEO|PDG|DG|DSI|CFO|CTO|CDO|CIO|CHRO|COO|CMO|vice[-\s]président|VP|responsable|manager|chef|head|leader|dirigeant|fondateur|fondatrice|chief|officer|executive)(?:\s+[^,.;:]+){0,5})\s+(?:de|chez|at|pour|of|from|à|au)\s+(?:Schneider|Electric|SE)/i,

  // Nouveau: Détection simple des noms suivis de "de Schneider Electric"
  PERSON_OF_SCHNEIDER:
    /([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+){1,3})(?:\s*[,(]([^,.;:()]{5,50})?[,)]?)?\s+(?:de|chez|at|pour|of|from|à|au)\s+(?:Schneider|Electric|SE)/i,

  // Pour les "Chief Digital Officer" et postes similaires
  EXECUTIVE_TITLE: /\b(Chief\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+Officer)\b/gi,
};

// Liste de titres/postes valides
const VALID_TITLES = [
  // Direction générale
  "PDG",
  "CEO",
  "Président",
  "Présidente",
  "Directeur Général",
  "Directrice Générale",
  "DG",
  "Chief Executive Officer",
  "President",
  "Chairman",
  "Chairwoman",

  // Direction finance
  "CFO",
  "Directeur Financier",
  "Directrice Financière",
  "Chief Financial Officer",
  "DAF",
  "Directeur Administratif et Financier",
  "Trésorier",
  "VP Finance",

  // Direction IT
  "CIO",
  "DSI",
  "Directeur des Systèmes d'Information",
  "Chief Information Officer",
  "CTO",
  "Chief Technology Officer",
  "Directeur Technique",
  "Directeur Digital",
  "Chief Digital Officer",
  "CDO",

  // Innovation & Data
  "Chief Data Officer",
  "Directeur des Données",
  "Chief Innovation Officer",
  "Directeur de l'Innovation",
  "Data Officer",
  "Directeur Data",

  // Marketing & Communication
  "CMO",
  "Directeur Marketing",
  "Directrice Marketing",
  "Chief Marketing Officer",
  "Directeur de la Communication",
  "Directrice de la Communication",
  "Responsable Marketing",

  // Opérations & Supply Chain
  "COO",
  "Directeur des Opérations",
  "Directrice des Opérations",
  "Chief Operations Officer",
  "Directeur Supply Chain",
  "Directeur de la Chaîne d'Approvisionnement",
  "VP Operations",

  // Ressources Humaines
  "DRH",
  "Directeur des Ressources Humaines",
  "Directrice des Ressources Humaines",
  "CHRO",
  "Chief Human Resources Officer",
  "VP HR",
  "VP RH",

  // Sécurité
  "CSO",
  "CISO",
  "Chief Security Officer",
  "Chief Information Security Officer",
  "Directeur de la Sécurité",

  // Produit
  "CPO",
  "Chief Product Officer",
  "Directeur de Produit",
  "VP Product",

  // Stratégie
  "CSO",
  "Chief Strategy Officer",
  "Directeur de la Stratégie",
  "Head of Strategy",
];

// Titres complets - utilisés pour valider et fusionner les titres trouvés
const COMPLETE_TITLES = [
  "Chief Executive Officer",
  "Chief Financial Officer",
  "Chief Operating Officer",
  "Chief Technology Officer",
  "Chief Information Officer",
  "Chief Digital Officer",
  "Chief Marketing Officer",
  "Chief Product Officer",
  "Chief Security Officer",
  "Chief Strategy Officer",
  "Chief Data Officer",
  "Chief Innovation Officer",
  "Chief Human Resources Officer",
  "Directeur Général",
  "Directeur Financier",
  "Directeur des Opérations",
  "Directeur Technique",
  "Directeur des Systèmes d'Information",
  "Directeur Digital",
  "Directeur Marketing",
  "Directeur de Produit",
  "Directeur de la Sécurité",
  "Directeur de la Stratégie",
  "Directeur des Données",
  "Directeur de l'Innovation",
  "Directeur des Ressources Humaines",
];

// Mots qui ne sont pas des noms de personnes mais qu'on pourrait confondre - RÉDUIT pour être moins restrictif
const NON_PERSON_WORDS = [
  "uninterruptible",
  "power",
  "supply",
  "ups",
  "podcast",
  "press",
  "release",
  "communiqué",
  "presse",
  "webinar",
  "webinaire",
  "replay",
  "announcement",
  "annonce",
];

// Entités connues à exclure (faux positifs) - RÉDUIT pour être moins restrictif
const KNOWN_ENTITIES = [
  "Schneider Electric",
  "BearingPoint",
  "Microsoft",
  "Google",
  "Apple",
  "Amazon",
  "Accenture",
  "Capgemini",
  "Deloitte",
  "KPMG",
  "EY",
  "PWC",
  "IBM",
  "Oracle",
  "SAP",
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

    // Vérifier si le texte est un titre d'article avec nominations
    if (this._isNominationTitle(cleanText)) {
      this._extractFromNominationTitle(
        cleanText,
        contacts,
        processedNames,
        company
      );
    }

    // Vérifier s'il s'agit d'un podcast
    if (
      cleanText.toLowerCase().includes("[podcast]") ||
      cleanText.toLowerCase().includes("interview") ||
      cleanText.toLowerCase().includes("webinar")
    ) {
      this._extractFromPodcast(cleanText, contacts, processedNames, company);
    }

    // Identifier les "Chief X Officer" complets
    this._extractExecutiveTitles(cleanText, contacts, processedNames, company);

    // Modèles standards - NOUVEAU: Ordre optimisé du plus précis au moins précis
    this._extractWithPattern(
      PATTERNS.NAMED_AS_TITLE,
      cleanText,
      contacts,
      processedNames,
      0.95,
      company
    );
    this._extractWithPattern(
      PATTERNS.PERSON_WITH_TITLE,
      cleanText,
      contacts,
      processedNames,
      0.9,
      company
    );
    this._extractWithPattern(
      PATTERNS.PERSON_WITH_TITLE_MR_MRS,
      cleanText,
      contacts,
      processedNames,
      0.85,
      company,
      1
    );
    this._extractWithPattern(
      PATTERNS.TITLE_THEN_PERSON,
      cleanText,
      contacts,
      processedNames,
      0.8,
      company,
      2,
      1
    );

    // NOUVEAU: Patrons spécifiques à Schneider Electric
    this._extractWithPattern(
      PATTERNS.PERSON_COMPANY_TITLE,
      cleanText,
      contacts,
      processedNames,
      0.9,
      company
    );
    this._extractWithPattern(
      PATTERNS.PERSON_OF_SCHNEIDER,
      cleanText,
      contacts,
      processedNames,
      0.7,
      company
    );

    // NOUVEAU: Rechercher des emails dans le texte et les associer aux contacts le cas échéant
    this._extractAndAssociateEmails(cleanText, contacts);

    // Filtrer les faux positifs mais MOINS STRICT
    return this._filterFalsePositives(contacts, false);
  }

  /**
   * NOUVEAU: Extrait les adresses email du texte et les associe aux contacts existants
   */
  _extractAndAssociateEmails(text, contacts) {
    // Regex pour trouver les adresses email
    const emailRegex = /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g;
    const emails = [...text.matchAll(emailRegex)].map((match) => match[0]);

    if (emails.length === 0) return;

    // Tenter d'associer les emails aux contacts par nom
    emails.forEach((email) => {
      // Extraire le nom potentiel de l'email (ex: jean.dupont@schneider-electric.com -> jean dupont)
      const namePart = email.split("@")[0];
      const namePieces = namePart.split(/[._-]/);

      if (namePieces.length > 1) {
        // Créer différentes versions du nom
        const possibleFirstName = namePieces[0];
        const possibleLastName = namePieces[1];

        // Essayer de trouver un contact correspondant
        for (const contact of contacts) {
          // Normaliser le nom pour la comparaison (sans accents, en minuscules)
          const normalizedContactName = contact.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

          // Vérifier si le nom dans l'email correspond au contact
          if (
            normalizedContactName.includes(possibleFirstName.toLowerCase()) &&
            normalizedContactName.includes(possibleLastName.toLowerCase())
          ) {
            contact.email = email;
            contact.confidenceScore = Math.min(
              1.0,
              contact.confidenceScore + 0.1
            ); // Augmenter la confiance
            break;
          }
        }
      }

      // Si aucun contact n'a été associé et l'email est de Schneider Electric,
      // ajouter un contact générique avec cette adresse
      if (
        !contacts.some((c) => c.email === email) &&
        (email.includes("schneider") || email.includes("se.com"))
      ) {
        // Tenter de générer un nom à partir de l'email
        const namePart = email.split("@")[0];
        const namePieces = namePart.split(/[._-]/);

        let generatedName = "";
        if (namePieces.length >= 2) {
          generatedName = namePieces
            .map(
              (part) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join(" ");
        }

        if (generatedName && !processedNames.has(generatedName.toLowerCase())) {
          contacts.push({
            name: generatedName,
            role: "Poste non spécifié",
            email: email,
            company: "Schneider Electric",
            confidenceScore: 0.6,
            context: `Email extrait: ${email}`,
          });

          processedNames.add(generatedName.toLowerCase());
        }
      }
    });
  }

  /**
   * Vérifie si un texte ressemble à un titre d'article annonçant une nomination
   */
  _isNominationTitle(text) {
    return /([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+){1,3})\s+(?:est|is|devient|a été nommé|appointed|becomes|named)\s+(?:le\s+|la\s+|l')?(?:nouveau|nouvelle|new)?\s+(?:directeur|directrice|président|CEO|PDG)/i.test(
      text
    );
  }

  /**
   * Extrait les contacts à partir d'un titre d'article de nomination
   */
  _extractFromNominationTitle(text, contacts, processedNames, company) {
    const match = text.match(PATTERNS.NAMED_AS_TITLE);
    if (match) {
      const name = match[1].trim();
      let role = match[2].trim();

      // Vérifier que le nom et le rôle ont du sens - MOINS STRICT
      if (this._isValidPersonName(name, true)) {
        role = this._normalizeTitle(role);

        processedNames.add(name.toLowerCase());

        contacts.push({
          name,
          role,
          confidenceScore: 0.98,
          company,
          context: text,
        });
      }
    }
  }

  /**
   * Extrait des contacts à partir d'un podcast
   */
  _extractFromPodcast(text, contacts, processedNames, company) {
    const match = text.match(PATTERNS.PODCAST_PERSON_TITLE);
    if (match) {
      const name = match[1].trim();
      // Si on n'a pas extrait de titre ou si c'est vide
      let role = match[2] ? match[2].trim() : null;

      // Si on a un nom mais pas de rôle précis trouvé dans le titre - MOINS STRICT
      if (this._isValidPersonName(name, true)) {
        if (!role) {
          // Pour un podcast, chercher dans le texte s'il y a des informations sur le rôle
          // Par exemple: "Peter Weckesser, Chief Digital Officer" dans le contenu
          const nameContext = this._findNameContextInText(text, name);
          if (nameContext) {
            const roleMatch = nameContext.match(/([^,]+),\s*([^,.]+)/);
            if (roleMatch && roleMatch[2]) {
              role = roleMatch[2].trim();
            } else {
              // Chercher des titres typiques à proximité du nom
              role = this._findNearbyTitle(nameContext);
            }
          }

          // Si toujours pas de rôle, chercher parmi les titres standards typiques
          if (!role) {
            [
              "Chief Digital Officer",
              "CTO",
              "CEO",
              "CFO",
              "COO",
              "CIO",
            ].forEach((title) => {
              if (text.includes(title) && !role) {
                role = title;
              }
            });
          }
        }

        // Si on a trouvé un rôle ou utiliser "Non spécifié" sinon
        role = role ? this._normalizeTitle(role) : "Poste non spécifié";

        // Éviter les doublons
        if (!processedNames.has(name.toLowerCase())) {
          processedNames.add(name.toLowerCase());

          contacts.push({
            name,
            role,
            confidenceScore: 0.9,
            company,
            context: text,
          });
        }
      }
    }
  }

  /**
   * Identifie les titres de postes de direction complets (ex: Chief Digital Officer)
   */
  _extractExecutiveTitles(text, contacts, processedNames, company) {
    const executiveTitleMatches = [...text.matchAll(PATTERNS.EXECUTIVE_TITLE)];

    for (const match of executiveTitleMatches) {
      const fullTitle = match[1];

      // Chercher les noms à proximité du titre
      const contextStart = Math.max(0, match.index - 100); // ÉLARGI: augmenté de 50 à 100
      const contextEnd = Math.min(
        text.length,
        match.index + match[0].length + 100
      ); // ÉLARGI
      const context = text.substring(contextStart, contextEnd);

      // Chercher un nom propre: commence par majuscule, suivi d'une ou plusieurs lettres minuscules
      const nameMatches = [
        ...context.matchAll(/([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+)+)/g),
      ];

      for (const nameMatch of nameMatches) {
        const potentialName = nameMatch[1].trim();

        // Vérifier si c'est un nom valide et pas un mot non-personne - MOINS STRICT
        if (
          this._isValidPersonName(potentialName, true) &&
          !processedNames.has(potentialName.toLowerCase())
        ) {
          // Ajouter le contact
          processedNames.add(potentialName.toLowerCase());

          contacts.push({
            name: potentialName,
            role: fullTitle,
            confidenceScore: 0.85,
            company,
            context: context,
          });

          // On ne prend que le premier nom valide pour éviter les doublons ou faux positifs
          break;
        }
      }
    }
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
    const matches = [...text.matchAll(pattern)];

    for (const match of matches) {
      const name = match[nameIndex].trim();
      const role = match[roleIndex]
        ? match[roleIndex].trim()
        : "Poste non spécifié";

      // Vérifier que c'est un nom valide - MOINS STRICT
      if (this._isValidPersonName(name, true)) {
        // Normaliser le rôle pour les formats standards
        const normalizedRole = this._normalizeTitle(role);

        // Éviter les doublons
        if (!processedNames.has(name.toLowerCase())) {
          processedNames.add(name.toLowerCase());

          contacts.push({
            name,
            role: normalizedRole,
            confidenceScore: baseConfidence,
            company,
            context: text.substring(
              Math.max(0, match.index - 50), // ÉLARGI: augmenté de 30 à 50
              Math.min(text.length, match.index + match[0].length + 50) // ÉLARGI
            ),
          });
        }
      }
    }
  }

  /**
   * Vérifie si un nom semble être un nom de personne valide
   * @param {string} name - Le nom à vérifier
   * @param {boolean} lessStrict - Si true, applique des règles moins strictes
   */
  _isValidPersonName(name, lessStrict = false) {
    if (!name || typeof name !== "string") return false;

    // Doit contenir au moins deux mots
    const words = name.trim().split(/\s+/);
    if (words.length < 2) return false;

    // Chaque mot doit commencer par une majuscule suivie de minuscules
    // MOINS STRICT: en mode moins strict, on permet certaines exceptions
    let validNameFormat;
    if (lessStrict) {
      validNameFormat = words.every(
        (word) =>
          /^[A-ZÀ-Ý][a-zà-ÿ]{1,}$/.test(word) ||
          /^[A-ZÀ-Ý][a-zà-ÿ]+-[A-ZÀ-Ý]?[a-zà-ÿ]+$/.test(word)
      ); // Permet les noms composés
    } else {
      validNameFormat = words.every((word) => /^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(word));
    }

    // Exclure les entités connues - MOINS STRICT
    const isKnownEntity = KNOWN_ENTITIES.some(
      (entity) =>
        name.toLowerCase() === entity.toLowerCase() ||
        (name.split(/\s+/).length <= 2 &&
          entity.toLowerCase().includes(name.toLowerCase()))
    );

    // Vérifier la longueur du nom (ni trop court ni trop long)
    // MOINS STRICT: Augmenter la limite supérieure
    const validLength = name.length >= 5 && name.length <= 50;

    // MOINS STRICT: simplification des règles
    if (lessStrict) {
      // Si c'est un format de nom valide et pas une entité connue, c'est bon
      return validNameFormat && !isKnownEntity && validLength;
    }

    return validNameFormat && !isKnownEntity && validLength;
  }

  /**
   * Vérifie si un texte contient des mots qui ne sont pas des noms de personnes
   * @param {boolean} lessStrict - Si true, applique des règles moins strictes
   */
  _containsNonPersonWords(text, lessStrict = false) {
    if (!text) return true;
    const lowerText = text.toLowerCase();

    // MOINS STRICT: Vérifier uniquement les correspondances exactes
    if (lessStrict) {
      return NON_PERSON_WORDS.some((word) => lowerText === word.toLowerCase());
    }

    return NON_PERSON_WORDS.some(
      (word) =>
        lowerText === word.toLowerCase() ||
        lowerText.split(/\s+/).includes(word.toLowerCase())
    );
  }

  /**
   * Trouve le contexte autour d'un nom dans un texte
   */
  _findNameContextInText(text, name) {
    if (!text || !name) return null;

    const nameIndex = text.indexOf(name);
    if (nameIndex === -1) return null;

    // Récupérer un contexte de 150 caractères autour du nom (ÉLARGI de 100 à 150)
    const contextStart = Math.max(0, nameIndex - 75);
    const contextEnd = Math.min(text.length, nameIndex + name.length + 75);

    return text.substring(contextStart, contextEnd);
  }

  /**
   * Cherche un titre typique à proximité d'un texte donné
   */
  _findNearbyTitle(text) {
    if (!text) return null;

    for (const title of VALID_TITLES) {
      if (text.includes(title)) {
        return title;
      }
    }

    return null;
  }

  /**
   * Normalise un titre pour un format standard
   */
  _normalizeTitle(title) {
    if (!title) return "Poste non spécifié";

    // Supprimer les mots parasites au début
    let normalized = title.replace(
      /^(?:le |la |l'|est |is |comme |as |the |a |an )+/i,
      ""
    );

    // Supprimer les mots parasites à la fin
    normalized = normalized.replace(
      /\s+(?:de|du|des|d'|of|at|pour|for|chez|with)\s+.*$/i,
      ""
    );

    // Traitement des cas spéciaux
    const lowerTitle = normalized.toLowerCase();

    // Regrouper Chief et Officer s'ils apparaissent séparément
    if (lowerTitle === "chief digital" || lowerTitle === "digital officer") {
      return "Chief Digital Officer";
    }

    // Fusionner des parties de titres qui devraient être ensemble
    for (const fullTitle of COMPLETE_TITLES) {
      const fullTitleLower = fullTitle.toLowerCase();
      // Si une partie du titre complet apparaît dans notre titre
      if (
        lowerTitle.includes(fullTitleLower.split(" ")[0].toLowerCase()) &&
        lowerTitle.includes(fullTitleLower.split(" ").pop().toLowerCase())
      ) {
        return fullTitle;
      }
    }

    // Cas spécifiques
    if (
      lowerTitle.includes("directeur général") ||
      lowerTitle.includes("directeur general")
    ) {
      return "Directeur Général";
    }

    if (
      lowerTitle.includes("chief digital") &&
      lowerTitle.includes("officer")
    ) {
      return "Chief Digital Officer";
    }

    // Capitaliser la première lettre
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  /**
   * Filtre les faux positifs dans les contacts détectés
   * @param {boolean} lessStrict - Si true, applique des règles moins strictes
   */
  _filterFalsePositives(contacts, lessStrict = true) {
    if (lessStrict) {
      // En mode moins strict, on garde pratiquement tous les contacts
      return contacts.filter((contact) => {
        // Vérifier seulement que le nom a au moins deux mots
        const nameWords = contact.name.trim().split(/\s+/);
        return nameWords.length >= 2 && !KNOWN_ENTITIES.includes(contact.name);
      });
    }

    // En mode strict normal
    return contacts.filter((contact) => {
      // Vérifier le nom
      if (!this._isValidPersonName(contact.name)) {
        return false;
      }

      // Vérifier si le nom contient des mots problématiques
      if (this._containsNonPersonWords(contact.name)) {
        return false;
      }

      // Vérifier si le rôle a du sens
      if (contact.role === "Officer") {
        return false; // Officer seul n'est pas un poste complet
      }

      return true;
    });
  }

  /**
   * Extrait les contacts de toutes les actualités
   * @param {Array} news - Liste des actualités à analyser
   * @param {string} company - Nom de l'entreprise pour le contexte
   * @returns {Array} Liste des contacts extraits
   */
  extractContactsFromNews(news, company = "Schneider Electric") {
    const allContacts = [];
    console.log(`Analyse de ${news.length} actualités...`);

    news.forEach((newsItem, index) => {
      // Traiter séparément le titre et la description pour une meilleure extraction
      const title = newsItem.title || newsItem.news || "";
      const description =
        newsItem.description || newsItem.newsDescription || "";

      console.log(
        `Analyse de l'actualité #${index + 1}: ${title.substring(0, 50)}...`
      );

      // Extraire du titre (prioritaire)
      if (title) {
        const titleContacts = this.extractContacts(title, company);
        console.log(`  - Contacts extraits du titre: ${titleContacts.length}`);

        // Pour chaque contact trouvé dans le titre
        titleContacts.forEach((contact) => {
          contact.source = {
            title: title,
            date: newsItem.date || newsItem.newsDate,
            link: newsItem.link || newsItem.newsLink || "",
          };

          allContacts.push(contact);
        });
      }

      // Extraire du contenu combiné pour attraper d'autres contacts ou contextes
      const combinedText = `${title}. ${description}`;
      const combinedContacts = this.extractContacts(combinedText, company);
      console.log(
        `  - Contacts extraits du contenu combiné: ${combinedContacts.length}`
      );

      // Combiner les contacts du contenu avec ceux du titre
      combinedContacts.forEach((contact) => {
        // Vérifier si ce contact n'est pas déjà présent
        const existingContact = allContacts.find(
          (c) =>
            c.name.toLowerCase() === contact.name.toLowerCase() &&
            c.source?.title === title
        );

        if (!existingContact) {
          contact.source = {
            title: title,
            date: newsItem.date || newsItem.newsDate,
            link: newsItem.link || newsItem.newsLink || "",
          };

          allContacts.push(contact);
        }
      });
    });

    // Dédupliquer et standardiser les contacts
    const uniqueContacts = this._deduplicateAndStandardizeContacts(allContacts);
    console.log(
      `Total des contacts uniques extraits: ${uniqueContacts.length}`
    );
    return uniqueContacts;
  }

  /**
   * Déduplique les contacts et standardise leurs rôles
   */
  _deduplicateAndStandardizeContacts(contacts) {
    // Regrouper par nom pour éviter les doublons
    const contactMap = new Map();

    contacts.forEach((contact) => {
      const nameKey = contact.name.toLowerCase();

      if (contactMap.has(nameKey)) {
        const existing = contactMap.get(nameKey);

        // Garder le rôle le plus précis ou avec le score le plus élevé
        if (
          contact.role !== "Poste non spécifié" &&
          (existing.role === "Poste non spécifié" ||
            contact.confidenceScore > existing.confidenceScore)
        ) {
          existing.role = contact.role;
        }

        // Conserver l'email si présent
        if (contact.email && !existing.email) {
          existing.email = contact.email;
        }

        // Mettre à jour le score de confiance
        existing.confidenceScore = Math.max(
          existing.confidenceScore,
          contact.confidenceScore
        );

        // Ajouter la source si différente
        if (
          contact.source &&
          !existing.sources.some((s) => s.title === contact.source.title)
        ) {
          existing.sources.push(contact.source);
        }
      } else {
        // Nouveau contact
        contactMap.set(nameKey, {
          ...contact,
          sources: contact.source ? [contact.source] : [],
        });

        // Supprimer la propriété source individuelle
        delete contactMap.get(nameKey).source;
      }
    });

    // Convertir la map en tableau et trier par score de confiance
    const uniqueContacts = Array.from(contactMap.values());

    // Standardiser les rôles finaux
    uniqueContacts.forEach((contact) => {
      // Standardiser les rôles communs
      const roleLower = contact.role.toLowerCase();

      if (
        roleLower.includes("chief") &&
        roleLower.includes("digital") &&
        roleLower.includes("officer")
      ) {
        contact.role = "Chief Digital Officer";
      } else if (
        roleLower.includes("directeur") &&
        roleLower.includes("général")
      ) {
        contact.role = "Directeur Général";
      }

      // Autres standardisations
      for (const fullTitle of COMPLETE_TITLES) {
        if (roleLower.includes(fullTitle.toLowerCase())) {
          contact.role = fullTitle;
          break;
        }
      }
    });

    return uniqueContacts.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Importe des contacts depuis un fichier Excel, CSV ou autre format
   * Utilisation du lazy loading pour charger XLSX uniquement quand nécessaire
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

      let contacts = [];

      // Vérifier si c'est un fichier CSV
      if (file.name.toLowerCase().endsWith(".csv")) {
        contacts = await this._importCSV(file);
      }
      // Vérifier si c'est un fichier Excel
      else if (
        file.name.toLowerCase().endsWith(".xlsx") ||
        file.name.toLowerCase().endsWith(".xls") ||
        file.type.includes("spreadsheet") ||
        file.type.includes("excel")
      ) {
        contacts = await this._importExcel(file);
      } else {
        throw new Error(
          "Format de fichier non pris en charge. Utilisez un fichier Excel (.xlsx, .xls) ou CSV (.csv)"
        );
      }

      console.log(`Importation terminée: ${contacts.length} contacts importés`);

      // Retourner les contacts, même si c'est une liste vide
      return contacts;
    } catch (error) {
      console.error("Erreur lors de l'importation des contacts:", error);
      throw error;
    }
  }

  /**
   * Importe des contacts depuis un fichier CSV
   * @param {File} file - L'objet File CSV
   * @returns {Promise<Array>} - Les contacts importés
   */
  async _importCSV(file) {
    try {
      // Lire le fichier CSV avec l'API FileReader
      const fileContent = await this._readFileAsText(file);

      // Séparer les lignes
      const lines = fileContent.split("\n");
      if (lines.length <= 1) {
        throw new Error(
          "Le fichier CSV ne contient pas suffisamment de données"
        );
      }

      // Récupérer les en-têtes (première ligne) et nettoyer
      const headers = lines[0].split(",").map((header) => header.trim());

      // Créer un mappage des en-têtes avec la nouvelle méthode
      const headerMap = this._createHeaderMap(headers);

      console.log("Mappage d'en-têtes CSV détecté:", headerMap);

      // Vérifier si nous avons trouvé un en-tête de rôle
      if (headerMap.role === -1) {
        console.warn(
          "Attention: Aucune colonne 'Role' trouvée, certaines données pourraient être incorrectes"
        );
      }

      // Traiter chaque ligne
      const contacts = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(",").map((value) => value.trim());

        // Créer le contact
        const contact = {
          fullName: "",
          role: "Poste non spécifié",
          company: "Schneider Electric",
          email: "",
          department: "",
          phone: "",
          confidenceScore: 1.0,
          sources: [],
        };

        // Construire le nom complet
        if (headerMap.name >= 0 && values[headerMap.name]) {
          contact.fullName = values[headerMap.name];
        } else if (headerMap.firstName >= 0 && headerMap.lastName >= 0) {
          const firstName = values[headerMap.firstName] || "";
          const lastName = values[headerMap.lastName] || "";
          contact.fullName = `${firstName} ${lastName}`.trim();
        }

        // Récupérer le bon rôle
        if (headerMap.role >= 0 && values[headerMap.role]) {
          contact.role = values[headerMap.role];
        }

        // Remplir les autres champs
        if (headerMap.company >= 0 && values[headerMap.company]) {
          contact.company = values[headerMap.company];
        }
        if (headerMap.email >= 0 && values[headerMap.email]) {
          contact.email = values[headerMap.email];
        }
        if (headerMap.department >= 0 && values[headerMap.department]) {
          contact.department = values[headerMap.department];
        }
        if (headerMap.phone >= 0 && values[headerMap.phone]) {
          contact.phone = values[headerMap.phone];
        }

        // Ajouter seulement si nous avons un nom et que ce n'est pas une ligne vide
        if (contact.fullName) {
          contacts.push(contact);
        }
      }

      return contacts;
    } catch (error) {
      console.error("Erreur lors de l'importation du CSV:", error);
      throw new Error(`Erreur lors de l'importation du CSV: ${error.message}`);
    }
  }

  /**
   * Importe des contacts depuis un fichier Excel avec lazy loading
   * @param {File} file - L'objet File Excel
   * @returns {Promise<Array>} - Les contacts importés
   */
  async _importExcel(file) {
    try {
      console.log("Début de l'importation Excel pour:", file.name);

      // Chargement dynamique de la bibliothèque XLSX
      const XLSX = await import('xlsx');
      console.log("Bibliothèque XLSX chargée avec succès");

      // Lire le fichier comme ArrayBuffer
      const arrayBuffer = await this._readFileAsArrayBuffer(file);

      // Lire le fichier Excel avec XLSX
      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: true,
        cellNF: true,
        cellStyles: true,
      });

      // Vérifier que le workbook existe
      if (
        !workbook ||
        !workbook.SheetNames ||
        workbook.SheetNames.length === 0
      ) {
        throw new Error("Format de fichier Excel non valide ou vide");
      }

      console.log("Feuilles disponibles:", workbook.SheetNames);

      // Trouver la première feuille qui contient "Contact" ou utiliser la première
      let sheetName =
        workbook.SheetNames.find((name) =>
          name.toLowerCase().includes("contact")
        ) || workbook.SheetNames[0];

      console.log("Utilisation de la feuille:", sheetName);

      // Récupérer la feuille
      const worksheet = workbook.Sheets[sheetName];

      // Vérifier que la feuille a un contenu
      if (!worksheet || !worksheet["!ref"]) {
        throw new Error(`La feuille ${sheetName} est vide ou invalide`);
      }

      // Convertir la feuille en JSON avec les noms de colonnes comme clés
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log("Données brutes extraites:", jsonData.length, "lignes");
      console.log(
        "Exemple de première ligne:",
        jsonData.length > 0 ? JSON.stringify(jsonData[0]) : "Aucune donnée"
      );

      // Si aucune donnée n'est extraite
      if (jsonData.length === 0) {
        throw new Error("Aucune donnée n'a pu être extraite du fichier Excel");
      }

      // Déterminer les colonnes disponibles à partir de la première ligne
      const firstRow = jsonData[0];
      const availableColumns = Object.keys(firstRow);
      console.log("Colonnes disponibles:", availableColumns);

      // Fonction pour trouver la colonne correspondant le mieux à un type de données
      const findBestColumn = (possibleNames) => {
        // D'abord essayer les correspondances exactes
        for (const name of possibleNames) {
          const exactMatch = availableColumns.find(
            (col) => col.toLowerCase() === name.toLowerCase()
          );
          if (exactMatch) return exactMatch;
        }

        // Ensuite essayer les correspondances partielles
        for (const name of possibleNames) {
          const partialMatch = availableColumns.find((col) =>
            col.toLowerCase().includes(name.toLowerCase())
          );
          if (partialMatch) return partialMatch;
        }

        return null;
      };

      // Mapper les colonnes aux champs souhaités
      const columnMap = {
        fullName: findBestColumn([
          "fullname",
          "full name",
          "name",
          "nom complet",
        ]),
        firstName: findBestColumn([
          "firstname",
          "first name",
          "prénom",
          "prenom",
        ]),
        lastName: findBestColumn(["lastname", "last name", "nom"]),
        role: findBestColumn(["role", "title", "fonction", "poste"]),
        email: findBestColumn(["email", "mail", "courriel"]),
        company: findBestColumn([
          "company",
          "entreprise",
          "société",
          "organization",
        ]),
        department: findBestColumn([
          "department",
          "département",
          "departement",
          "service",
        ]),
        phone: findBestColumn([
          "phone",
          "téléphone",
          "telephone",
          "tel",
          "mobile",
        ]),
      };

      console.log("Mappage de colonnes détecté:", columnMap);

      // Créer la liste de contacts
      const contacts = jsonData
        .map((row) => {
          // Déterminer le nom complet
          let fullName = "";
          if (columnMap.fullName && row[columnMap.fullName]) {
            fullName = row[columnMap.fullName];
          } else if (columnMap.firstName && columnMap.lastName) {
            const firstName = row[columnMap.firstName] || "";
            const lastName = row[columnMap.lastName] || "";
            fullName = `${firstName} ${lastName}`.trim();
          } else {
            // Chercher n'importe quelle colonne qui pourrait contenir un nom
            for (const col of availableColumns) {
              if (
                typeof row[col] === "string" &&
                /^[A-Z][a-z]+ [A-Z][a-z]+/.test(row[col]) &&
                !col.toLowerCase().includes("id")
              ) {
                fullName = row[col];
                break;
              }
            }
          }

          // Déterminer le rôle
          let role = "Poste non spécifié";
          if (columnMap.role && row[columnMap.role]) {
            // Vérifier si la valeur est un GUID ou ID
            const roleValue = row[columnMap.role];
            const isGuid =
              typeof roleValue === "string" &&
              /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(roleValue);

            if (!isGuid) {
              role = roleValue;
            } else {
              console.log(
                "Valeur de rôle ignorée car semble être un GUID:",
                roleValue
              );
            }
          }

          // Créer l'objet contact
          return {
            fullName,
            role,
            company:
              columnMap.company && row[columnMap.company]
                ? row[columnMap.company]
                : "Schneider Electric",
            email:
              columnMap.email && row[columnMap.email]
                ? row[columnMap.email]
                : "",
            department:
              columnMap.department && row[columnMap.department]
                ? row[columnMap.department]
                : "",
            phone:
              columnMap.phone && row[columnMap.phone]
                ? row[columnMap.phone]
                : "",
            confidenceScore: 1.0,
            importedFromExcel: true,
            sources: [],
          };
        })
        .filter((contact) => {
          // Vérifier si le contact est valide (a au moins un nom)
          const isValid = contact.fullName && contact.fullName.trim() !== "";
          if (!isValid) {
            console.log("Contact ignoré car nom manquant:", contact);
          }
          return isValid;
        });

      console.log(
        `Importation réussie: ${contacts.length} contacts valides extraits`
      );
      return contacts;
    } catch (error) {
      console.error("Erreur détaillée lors de l'importation Excel:", error);
      throw new Error(`Erreur lors de l'importation Excel: ${error.message}`);
    }
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
   * Méthode pour créer un mappage des en-têtes de colonnes
   * @param {Array} headers - Les en-têtes du fichier
   * @returns {Object} - Mappage des en-têtes aux indices de colonnes
   */
  _createHeaderMap(headers) {
    const headerMap = {
      name: -1,
      firstName: -1,
      lastName: -1,
      role: -1,
      company: -1,
      email: -1,
      department: -1,
      phone: -1,
    };

    // Chercher les correspondances exactes d'abord
    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase().trim();

      // Correspondances exactes pour Role
      if (headerLower === "role") {
        headerMap.role = index;
      }
      // Correspondances exactes pour les autres champs
      else if (headerLower === "fullname" || headerLower === "full name") {
        headerMap.name = index;
      } else if (
        headerLower === "firstname" ||
        headerLower === "first name" ||
        headerLower === "prénom" ||
        headerLower === "prenom"
      ) {
        headerMap.firstName = index;
      } else if (
        headerLower === "lastname" ||
        headerLower === "last name" ||
        headerLower === "nom"
      ) {
        headerMap.lastName = index;
      } else if (
        headerLower === "email" ||
        headerLower === "courriel" ||
        headerLower === "mail"
      ) {
        headerMap.email = index;
      } else if (headerLower === "company" || headerLower === "entreprise") {
        headerMap.company = index;
      } else if (
        headerLower === "department" ||
        headerLower === "département" ||
        headerLower === "departement"
      ) {
        headerMap.department = index;
      } else if (
        headerLower === "phone" ||
        headerLower === "téléphone" ||
        headerLower === "telephone"
      ) {
        headerMap.phone = index;
      }
    });

    // Si on n'a pas trouvé de correspondance exacte, essayer des correspondances partielles
    if (headerMap.role === -1) {
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase().trim();

        // Éviter d'utiliser des champs comme 'businessfunction'
        // Chercher uniquement les en-têtes contenant "role" mais pas d'autres mots clés suspects
        if (
          headerLower.includes("role") &&
          !headerLower.includes("business") &&
          !headerLower.includes("function") &&
          !headerLower.includes("id")
        ) {
          headerMap.role = index;
        }

        // Autres correspondances partielles
        if (
          headerMap.name === -1 &&
          headerLower.includes("name") &&
          !headerLower.includes("first") &&
          !headerLower.includes("last")
        ) {
          headerMap.name = index;
        }

        // Pour les autres champs
        if (
          headerMap.firstName === -1 &&
          ((headerLower.includes("first") && headerLower.includes("name")) ||
            headerLower.includes("prénom") ||
            headerLower.includes("prenom"))
        ) {
          headerMap.firstName = index;
        }

        if (
          headerMap.lastName === -1 &&
          ((headerLower.includes("last") && headerLower.includes("name")) ||
            (headerLower.includes("nom") && !headerLower.includes("prénom")))
        ) {
          headerMap.lastName = index;
        }

        if (
          headerMap.email === -1 &&
          (headerLower.includes("mail") || headerLower.includes("courriel"))
        ) {
          headerMap.email = index;
        }

        if (
          headerMap.department === -1 &&
          (headerLower.includes("depart") || headerLower.includes("service"))
        ) {
          headerMap.department = index;
        }

        if (
          headerMap.phone === -1 &&
          (headerLower.includes("phone") || headerLower.includes("tel"))
        ) {
          headerMap.phone = index;
        }
      });
    }

    console.log("Mappage d'en-têtes détecté:", headerMap);
    return headerMap;
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
