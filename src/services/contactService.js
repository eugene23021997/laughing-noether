// src/services/contactService.js - Version 100% Claude
import { claudeAnalysisService } from "./claudeAnalysisService";

class ContactService {
  /**
   * Extrait les contacts à partir d'actualités via Claude
   * @param {Array} news - Les actualités à analyser
   * @returns {Array} - Les contacts extraits
   */
  async extractContactsFromNews(news) {
    try {
      console.log(`🤖 Extraction de contacts Claude pour ${news.length} actualités`);
      
      // Utiliser Claude pour l'extraction
      const contacts = await claudeAnalysisService.extractContactsFromNews(news);
      
      console.log(`👥 ${contacts.length} contacts extraits par Claude`);
      
      return contacts;
    } catch (error) {
      console.error("❌ Erreur lors de l'extraction de contacts:", error);
      return [];
    }
  }

  /**
   * Analyse la pertinence des contacts par rapport aux actualités via Claude
   * @param {Array} contacts - Les contacts importés
   * @param {Array} relevanceMatrix - La matrice de pertinence des actualités
   * @returns {Array} - Les contacts avec un score de pertinence
   */
  async analyzeContactRelevance(contacts, relevanceMatrix) {
    try {
      console.log(`🎯 Analyse de pertinence des contacts via Claude`);
      
      if (!contacts || contacts.length === 0) {
        return [];
      }

      // Préparer les opportunités à partir de la matrice de pertinence
      const opportunities = relevanceMatrix.map(item => ({
        category: item.offerCategory,
        detail: item.offerDetail,
        news: item.news,
        newsDescription: item.newsDescription,
        relevanceScore: item.relevanceScore
      }));

      // Analyser chaque contact avec Claude
      const analyzedContacts = [];
      
      for (const contact of contacts) {
        try {
          const analysis = await this._analyzeContactWithClaude(contact, opportunities);
          analyzedContacts.push({
            ...contact,
            ...analysis
          });
          
          // Pause entre les analyses
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          console.error(`Erreur analyse contact ${contact.fullName}:`, error);
          // Ajouter le contact sans analyse en cas d'erreur
          analyzedContacts.push({
            ...contact,
            relevanceScore: 0.5,
            relatedOffers: [],
            sources: []
          });
        }
      }

      console.log(`✅ ${analyzedContacts.length} contacts analysés par Claude`);
      
      return analyzedContacts;
    } catch (error) {
      console.error("❌ Erreur lors de l'analyse de pertinence des contacts:", error);
      return contacts;
    }
  }

  /**
   * Analyse un contact spécifique avec Claude
   * @private
   */
  async _analyzeContactWithClaude(contact, opportunities) {
    const prompt = `
Tu es un expert en analyse de contacts commerciaux. Analyse ce contact Schneider Electric par rapport aux opportunités commerciales identifiées.

CONTACT:
Nom: ${contact.fullName || contact.name}
Fonction: ${contact.role}
Département: ${contact.department || 'Non spécifié'}
Entreprise: ${contact.company || 'Schneider Electric'}
Business Unit: ${contact.business || 'Non spécifié'}

OPPORTUNITÉS COMMERCIALES:
${opportunities.slice(0, 10).map((opp, idx) => 
  `${idx + 1}. ${opp.category} - ${opp.detail} (Score: ${opp.relevanceScore})`
).join('\n')}

ANALYSE DEMANDÉE:
1. Évalue la pertinence de ce contact pour les opportunités (score 0-1)
2. Identifie les offres les plus pertinentes pour ce contact
3. Justifie ton évaluation
4. Propose une approche commerciale

CRITÈRES:
- Alignement fonction/département avec les opportunités
- Niveau de décision potentiel
- Pertinence métier
- Potentiel d'influence sur les décisions d'achat

Réponds au format JSON suivant:
{
  "relevanceScore": 0.75,
  "relatedOffers": ["offre1", "offre2"],
  "relevanceJustification": "justification détaillée",
  "approachSuggestion": "suggestion d'approche commerciale",
  "decisionLevel": "niveau de décision estimé (1-5)",
  "businessAlignment": "alignement avec les opportunités business"
}
`;

    try {
      const response = await claudeAnalysisService._callClaudeAPI(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          relevanceScore: parsed.relevanceScore || 0.5,
          relatedOffers: parsed.relatedOffers || [],
          relevanceJustification: parsed.relevanceJustification || "",
          approachSuggestion: parsed.approachSuggestion || "",
          decisionLevel: parsed.decisionLevel || 3,
          businessAlignment: parsed.businessAlignment || ""
        };
      }
    } catch (error) {
      console.error("Erreur parsing analyse contact:", error);
    }

    return {
      relevanceScore: 0.5,
      relatedOffers: [],
      relevanceJustification: "",
      approachSuggestion: "",
      decisionLevel: 3,
      businessAlignment: ""
    };
  }

  /**
   * Identifie les rôles mentionnés dans les actualités via Claude
   * @param {Array} relevanceMatrix - La matrice de pertinence des actualités
   * @returns {Array} - Les rôles identifiés
   */
  async identifyRolesInNews(relevanceMatrix) {
    try {
      console.log(`🔍 Identification des rôles via Claude`);
      
      const newsTexts = relevanceMatrix.map(item => 
        `${item.news} ${item.newsDescription || ''}`
      ).join('\n\n');

      const prompt = `
Tu es un expert en analyse organisationnelle. Identifie tous les rôles/fonctions mentionnés dans ces actualités Schneider Electric.

ACTUALITÉS:
${newsTexts}

ANALYSE DEMANDÉE:
1. Identifie tous les rôles/fonctions mentionnés
2. Privilégie les postes de direction et de décision
3. Normalise les intitulés (ex: "Directeur Général" plutôt que "DG")
4. Évite les doublons

CRITÈRES:
- Rôles explicitement mentionnés
- Fonctions déduites du contexte
- Postes clés pour la prise de décision
- Interlocuteurs pertinents pour BearingPoint

Réponds au format JSON suivant:
{
  "roles": [
    {
      "title": "Directeur Général",
      "variations": ["DG", "CEO", "PDG"],
      "importance": "high",
      "decisionPower": 5
    }
  ],
  "totalRolesFound": 12,
  "analysisNotes": "notes sur l'analyse"
}
`;

      const response = await claudeAnalysisService._callClaudeAPI(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.roles?.map(role => role.title) || [];
      }
      
      return [];
    } catch (error) {
      console.error("❌ Erreur identification des rôles:", error);
      return [];
    }
  }

  /**
   * Trouve les contacts pertinents pour les rôles identifiés via Claude
   * @param {Array} contacts - Les contacts disponibles
   * @param {Array} roles - Les rôles identifiés
   * @returns {Object} - Mapping des rôles vers les contacts
   */
  async matchContactsToRoles(contacts, roles) {
    try {
      console.log(`🤝 Matching contacts-rôles via Claude`);
      
      const contactsString = contacts.map(contact => 
        `${contact.fullName || contact.name}: ${contact.role}`
      ).join('\n');

      const prompt = `
Tu es un expert en matching organisationnel. Associe ces contacts aux rôles recherchés.

CONTACTS DISPONIBLES:
${contactsString}

RÔLES RECHERCHÉS:
${roles.join(', ')}

ANALYSE DEMANDÉE:
1. Associe chaque contact aux rôles correspondants
2. Évalue la qualité du match (0-1)
3. Identifie les rôles sans contact correspondant
4. Suggère des rôles alternatifs

Réponds au format JSON suivant:
{
  "matches": {
    "Directeur Général": [
      {
        "contactName": "Jean Dupont",
        "matchQuality": 0.95,
        "justification": "Fonction exacte"
      }
    ]
  },
  "missingRoles": ["rôle sans contact"],
  "suggestions": ["suggestions de rôles alternatifs"]
}
`;

      const response = await claudeAnalysisService._callClaudeAPI(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Convertir au format attendu
        const rolesToContacts = {};
        Object.entries(parsed.matches || {}).forEach(([role, matches]) => {
          if (matches && matches.length > 0) {
            rolesToContacts[role] = matches.map(match => 
              contacts.find(c => 
                (c.fullName || c.name) === match.contactName
              )
            ).filter(Boolean);
          }
        });
        
        return rolesToContacts;
      }
      
      return {};
    } catch (error) {
      console.error("❌ Erreur matching contacts-rôles:", error);
      return {};
    }
  }

  /**
   * Identifie les rôles manquants via Claude
   * @param {Array} roles - Les rôles identifiés
   * @param {Object} rolesToContacts - Mapping des rôles vers les contacts
   * @returns {Array} - Les rôles manquants
   */
  identifyMissingRoles(roles, rolesToContacts) {
    return roles.filter(role => !rolesToContacts[role] || rolesToContacts[role].length === 0);
  }

  /**
   * Importe des contacts depuis un fichier Excel (garde la logique existante)
   * @param {File} file - L'objet File à importer
   * @returns {Promise<Array>} - Les contacts importés
   */
  async importContacts(file) {
    try {
      console.log(`📁 Importation du fichier: ${file.name}`);
      
      const fileContent = await this._readFileAsArrayBuffer(file);
      const XLSX = await import("xlsx");
      
      const workbook = XLSX.read(fileContent, {
        type: "array",
        cellDates: true,
        cellNF: true,
        cellStyles: true,
        cellFormulas: true,
        sheetStubs: true,
      });

      if (!workbook?.SheetNames?.length) {
        throw new Error("Format de fichier Excel non valide ou vide");
      }

      const sheetName = workbook.SheetNames.includes("CRM_Contacts")
        ? "CRM_Contacts"
        : workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet?.["!ref"]) {
        throw new Error(`La feuille ${sheetName} est vide ou invalide`);
      }

      // Analyser les en-têtes
      const headers = [];
      const range = XLSX.utils.decode_range(worksheet["!ref"]);

      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c });
        const cell = worksheet[cellAddress];
        if (cell?.v) {
          headers.push({
            col: XLSX.utils.encode_col(c),
            value: cell.v.toString(),
          });
        }
      }

      // Mapping des colonnes
      const columnMap = this._mapColumns(headers);
      
      // Conversion en JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: 1,
      });

      if (jsonData.length === 0) {
        throw new Error("Aucune donnée dans le fichier Excel");
      }

      // Normaliser les contacts
      const contacts = jsonData
        .map(row => this._normalizeContact(row, headers, columnMap))
        .filter(contact => contact !== null);

      console.log(`✅ ${contacts.length} contacts importés`);
      
      return contacts;
    } catch (error) {
      console.error("❌ Erreur importation Excel:", error);
      throw new Error(`Erreur lors de l'importation Excel: ${error.message}`);
    }
  }

  /**
   * Mappe les colonnes du fichier Excel
   * @private
   */
  _mapColumns(headers) {
    const columnMap = {
      fullName: null,
      firstName: null,
      lastName: null,
      role: null,
      email: null,
      phone: null,
      company: null,
      department: null,
    };

    headers.forEach(header => {
      const headerValue = header.value.toLowerCase();
      
      if (headerValue === "full name") columnMap.fullName = header.col;
      else if (headerValue === "first name") columnMap.firstName = header.col;
      else if (headerValue === "last name") columnMap.lastName = header.col;
      else if (headerValue === "role") columnMap.role = header.col;
      else if (headerValue === "email") columnMap.email = header.col;
      else if (headerValue === "phone") columnMap.phone = header.col;
      else if (headerValue === "_be_accountname" || headerValue === "account")
        columnMap.company = header.col;
      else if (headerValue === "department") columnMap.department = header.col;
    });

    if (!columnMap.fullName && (columnMap.firstName || columnMap.lastName)) {
      columnMap.fullName = "calculated";
    }

    return columnMap;
  }

  /**
   * Normalise un contact
   * @private
   */
  _normalizeContact(row, headers, columnMap) {
    let fullName = "";
    if (columnMap.fullName === "calculated") {
      const firstName = columnMap.firstName
        ? row[headers.find(h => h.col === columnMap.firstName)?.value] || ""
        : "";
      const lastName = columnMap.lastName
        ? row[headers.find(h => h.col === columnMap.lastName)?.value] || ""
        : "";
      fullName = `${firstName} ${lastName}`.trim();
    } else if (columnMap.fullName) {
      fullName = row[headers.find(h => h.col === columnMap.fullName)?.value] || "";
    }

    if (!fullName) return null;

    return {
      fullName,
      role: columnMap.role
        ? row[headers.find(h => h.col === columnMap.role)?.value] || "Poste non spécifié"
        : "Poste non spécifié",
      email: columnMap.email
        ? row[headers.find(h => h.col === columnMap.email)?.value] || ""
        : "",
      department: columnMap.department
        ? row[headers.find(h => h.col === columnMap.department)?.value] || ""
        : "",
      phone: columnMap.phone
        ? row[headers.find(h => h.col === columnMap.phone)?.value] || ""
        : "",
      company: columnMap.company
        ? row[headers.find(h => h.col === columnMap.company)?.value] || "Schneider Electric"
        : "Schneider Electric",
      confidenceScore: 1.0,
      importedFromExcel: true,
      sources: [],
    };
  }

  /**
   * Lit un fichier comme ArrayBuffer
   * @private
   */
  _readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Erreur de lecture du fichier"));
      reader.readAsArrayBuffer(file);
    });
  }
}

export const contactService = new ContactService();
