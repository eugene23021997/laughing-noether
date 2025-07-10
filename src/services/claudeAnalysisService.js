// src/services/claudeAnalysisService.js - Version corrigée pour utiliser l'API serveur

class ClaudeAnalysisService {
  constructor() {
    this.apiUrl =
      process.env.NODE_ENV === "production"
        ? "https://votre-domaine.com/api/claude" // Remplacez par votre domaine de production
        : "http://localhost:3000/api/claude";

    this.testUrl =
      process.env.NODE_ENV === "production"
        ? "https://votre-domaine.com/api/test-claude"
        : "http://localhost:3000/api/test-claude";
  }

  /**
   * Teste la connexion à l'API Claude
   * @returns {Promise<Object>} Résultat du test
   */
  async testConnection() {
    try {
      console.log("🔍 Test de connexion à l'API Claude...");

      const response = await fetch(this.testUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Connexion API Claude réussie:", data);
        return { success: true, data };
      } else {
        console.error("❌ Échec du test API Claude:", data);
        return { success: false, error: data };
      }
    } catch (error) {
      console.error("❌ Erreur lors du test de connexion:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyse complète d'un article avec Claude
   * @param {Object} article - L'article à analyser
   * @param {Object} bpOffers - Les offres BearingPoint
   * @returns {Promise<Object>} - Analyse complète
   */
  async analyzeArticleCompletely(article, bpOffers) {
    try {
      console.log(`🤖 Analyse complète de l'article: "${article.title}"`);

      const prompt = this._buildCompleteAnalysisPrompt(article, bpOffers);
      const response = await this._callClaudeAPI(prompt);
      const analysis = this._parseCompleteAnalysis(response);

      console.log("✅ Analyse complète terminée:", {
        contactsFound: analysis.contacts?.length || 0,
        relevanceScore: analysis.relevanceScore,
        hasInsights: !!analysis.insights,
      });

      return analysis;
    } catch (error) {
      console.error("❌ Erreur lors de l'analyse complète:", error);
      return this._getDefaultAnalysis();
    }
  }

  /**
   * Analyse de pertinence entre actualités et offres via Claude
   * @param {Array} newsItems - Liste des actualités
   * @param {Object} bpOffers - Offres BearingPoint
   * @returns {Promise<Array>} - Matrice de pertinence
   */
  async analyzeNewsRelevance(newsItems, bpOffers) {
    try {
      console.log(
        `🎯 Analyse de pertinence Claude pour ${newsItems.length} actualités`
      );
      const relevanceMatrix = [];

      // Traiter les actualités par petits lots pour éviter les timeouts
      const batchSize = 3;
      for (let i = 0; i < newsItems.length; i += batchSize) {
        const batch = newsItems.slice(i, i + batchSize);
        console.log(
          `📊 Traitement du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            newsItems.length / batchSize
          )}`
        );

        const batchPromises = batch.map(async (newsItem) => {
          try {
            const prompt = this._buildRelevanceAnalysisPrompt(
              newsItem,
              bpOffers
            );
            const response = await this._callClaudeAPI(prompt);
            const analysis = this._parseRelevanceAnalysis(response, newsItem);
            return analysis;
          } catch (error) {
            console.error(
              `❌ Erreur pour l'actualité "${newsItem.title}":`,
              error
            );
            return [];
          }
        });

        const batchResults = await Promise.all(batchPromises);
        relevanceMatrix.push(...batchResults.flat());

        // Pause entre les lots
        if (i + batchSize < newsItems.length) {
          console.log("⏳ Pause entre les lots...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      console.log(
        `✅ Analyse de pertinence terminée: ${relevanceMatrix.length} entrées générées`
      );
      return relevanceMatrix;
    } catch (error) {
      console.error("❌ Erreur lors de l'analyse de pertinence:", error);
      return [];
    }
  }

  /**
   * Extraction de contacts via Claude
   * @param {Array} newsItems - Actualités à analyser
   * @returns {Promise<Array>} - Contacts extraits
   */
  async extractContactsFromNews(newsItems) {
    try {
      console.log(
        `👥 Extraction de contacts Claude pour ${newsItems.length} actualités`
      );
      const allContacts = [];

      for (let i = 0; i < newsItems.length; i++) {
        const newsItem = newsItems[i];
        console.log(
          `👤 Analyse contact ${i + 1}/${newsItems.length}: "${newsItem.title}"`
        );

        try {
          const prompt = this._buildContactExtractionPrompt(newsItem);
          const response = await this._callClaudeAPI(prompt);
          const contacts = this._parseContactsFromResponse(response, newsItem);
          allContacts.push(...contacts);

          // Pause entre les requêtes
          if (i < newsItems.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(
            `❌ Erreur extraction contact pour "${newsItem.title}":`,
            error
          );
          continue;
        }
      }

      const deduplicatedContacts = this._deduplicateContacts(allContacts);
      console.log(
        `✅ Extraction terminée: ${deduplicatedContacts.length} contacts uniques`
      );

      return deduplicatedContacts;
    } catch (error) {
      console.error("❌ Erreur lors de l'extraction de contacts:", error);
      return [];
    }
  }

  /**
   * Analyse des contacts par rapport aux opportunités
   * @param {Array} contacts - Liste des contacts
   * @param {Array} opportunities - Opportunités sélectionnées
   * @returns {Promise<Object>} - Recommandations de contacts
   */
  async analyzeContactRelevance(contacts, opportunities) {
    try {
      console.log(
        `🎯 Analyse de pertinence des contacts pour ${opportunities.length} opportunités`
      );
      const recommendations = {};

      for (let i = 0; i < opportunities.length; i++) {
        const opportunity = opportunities[i];
        console.log(
          `🔍 Analyse ${i + 1}/${opportunities.length}: "${opportunity.detail}"`
        );

        try {
          const prompt = this._buildContactRelevancePrompt(
            contacts,
            opportunity
          );
          const response = await this._callClaudeAPI(prompt);
          const analysis = this._parseContactRelevance(response, opportunity);

          const opportunityKey = `${opportunity.category}-${opportunity.detail}`;
          recommendations[opportunityKey] = {
            opportunity,
            contacts: analysis.contacts || [],
          };

          // Pause entre les analyses
          if (i < opportunities.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(
            `❌ Erreur analyse opportunité "${opportunity.detail}":`,
            error
          );
          continue;
        }
      }

      console.log(
        `✅ Analyse de pertinence terminée: ${
          Object.keys(recommendations).length
        } recommandations`
      );
      return recommendations;
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'analyse de pertinence des contacts:",
        error
      );
      return {};
    }
  }

  /**
   * Appelle l'API Claude via le serveur Express
   * @private
   */
  async _callClaudeAPI(
    prompt,
    model = "claude-3-5-sonnet-20241022",
    maxTokens = 4000
  ) {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API Error ${response.status}: ${errorData.error || "Unknown error"}`
        );
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error("❌ Erreur lors de l'appel à l'API Claude:", error);
      throw error;
    }
  }

  /**
   * Construit le prompt pour l'analyse complète
   * @private
   */
  _buildCompleteAnalysisPrompt(article, bpOffers) {
    const offersString = Object.entries(bpOffers)
      .map(
        ([category, offers]) =>
          `${category}:\n${offers.map((offer) => `  - ${offer}`).join("\n")}`
      )
      .join("\n\n");

    return `
Tu es un expert en analyse commerciale pour BearingPoint. Analyse cet article concernant Schneider Electric et fournis une analyse complète.

ARTICLE À ANALYSER:
Titre: ${article.title}
Date: ${article.date}
Catégorie: ${article.category || "Non spécifiée"}
Description: ${article.description || ""}
Lien: ${article.link || ""}

OFFRES BEARINGPOINT:
${offersString}

ANALYSE DEMANDÉE:
1. Résumé intelligent de l'article (2-3 phrases)
2. Extraction de tous les contacts mentionnés avec leurs informations
3. Identification des opportunités commerciales pour BearingPoint
4. Score de pertinence global (1-3) et justification
5. Recommandations d'offres BearingPoint les plus adaptées
6. Stratégie d'approche commerciale suggérée

IMPORTANT:
- Sois précis et factuel dans ton analyse
- Identifie uniquement les contacts travaillant chez Schneider Electric
- Évalue la pertinence en fonction du contexte business réel
- Propose des actions concrètes

Réponds au format JSON suivant:
{
  "summary": "résumé de l'article",
  "contacts": [
    {
      "fullName": "nom complet",
      "role": "fonction",
      "department": "département",
      "email": "email si mentionné",
      "phone": "téléphone si mentionné",
      "company": "Schneider Electric",
      "confidenceScore": 0.8,
      "relevanceReason": "pourquoi ce contact est pertinent"
    }
  ],
  "opportunities": [
    "opportunité commerciale 1",
    "opportunité commerciale 2"
  ],
  "relevanceScore": 2,
  "relevanceJustification": "justification du score",
  "recommendedOffers": [
    {
      "category": "catégorie",
      "offer": "offre spécifique",
      "relevanceReason": "pourquoi cette offre est pertinente"
    }
  ],
  "approachStrategy": [
    "action recommandée 1",
    "action recommandée 2"
  ]
}
`;
  }

  /**
   * Construit le prompt pour l'analyse de pertinence
   * @private
   */
  _buildRelevanceAnalysisPrompt(newsItem, bpOffers) {
    const offersString = Object.entries(bpOffers)
      .map(
        ([category, offers]) =>
          `${category}:\n${offers.map((offer) => `  - ${offer}`).join("\n")}`
      )
      .join("\n\n");

    return `
Tu es un expert en analyse commerciale. Analyse la pertinence de cette actualité Schneider Electric par rapport aux offres BearingPoint.

ACTUALITÉ:
Titre: ${newsItem.title}
Date: ${newsItem.date}
Catégorie: ${newsItem.category || "Actualité"}
Description: ${newsItem.description || ""}

OFFRES BEARINGPOINT:
${offersString}

ANALYSE DEMANDÉE:
1. Identifie les offres BearingPoint les plus pertinentes (maximum 3)
2. Attribue un score de pertinence (1-3) pour chaque offre identifiée
3. Justifie chaque score avec des arguments business concrets
4. Identifie les opportunités commerciales spécifiques

CRITÈRES DE PERTINENCE:
- Score 3: Opportunité commerciale directe et immédiate
- Score 2: Opportunité commerciale probable avec contexte favorable
- Score 1: Opportunité commerciale possible mais indirecte

Réponds au format JSON suivant:
{
  "relevantOffers": [
    {
      "category": "catégorie de l'offre",
      "offers": ["offre1", "offre2"],
      "relevanceScore": 2,
      "justification": "pourquoi cette offre est pertinente",
      "opportunities": ["opportunité commerciale spécifique"]
    }
  ],
  "globalAssessment": "évaluation globale de l'actualité",
  "businessContext": "contexte business important à retenir"
}
`;
  }

  /**
   * Construit le prompt pour l'extraction de contacts
   * @private
   */
  _buildContactExtractionPrompt(newsItem) {
    return `
Tu es un expert en extraction d'informations. Analyse cette actualité Schneider Electric et extrais tous les contacts mentionnés.

ACTUALITÉ:
Titre: ${newsItem.title}
Date: ${newsItem.date}
Description: ${newsItem.description || ""}

INSTRUCTIONS:
1. Identifie uniquement les personnes travaillant chez Schneider Electric
2. Extrais toutes les informations disponibles (nom, fonction, département, contact)
3. Privilégie les cadres dirigeants et décideurs
4. Évalue la fiabilité de chaque extraction (0-1)

CRITÈRES DE QUALITÉ:
- Nom complet clairement identifié
- Fonction/poste spécifique mentionné
- Lien évident avec Schneider Electric
- Informations de contact si disponibles

Réponds au format JSON suivant:
{
  "contacts": [
    {
      "fullName": "nom complet exact",
      "role": "fonction précise",
      "department": "département si mentionné",
      "email": "email si mentionné",
      "phone": "téléphone si mentionné",
      "company": "Schneider Electric",
      "confidenceScore": 0.9,
      "extractionContext": "contexte dans lequel le contact est mentionné"
    }
  ],
  "extractionQuality": "évaluation de la qualité de l'extraction",
  "additionalNotes": "notes importantes sur l'extraction"
}
`;
  }

  /**
   * Construit le prompt pour l'analyse de pertinence des contacts
   * @private
   */
  _buildContactRelevancePrompt(contacts, opportunity) {
    const contactsString = contacts
      .map(
        (contact) =>
          `- ${contact.fullName || contact.name}: ${contact.role} (${
            contact.department || "N/A"
          })`
      )
      .join("\n");

    return `
Tu es un expert en prospection commerciale. Analyse ces contacts Schneider Electric pour identifier les plus pertinents pour cette opportunité BearingPoint.

OPPORTUNITÉ:
Catégorie: ${opportunity.category}
Offre: ${opportunity.detail}
Contexte: ${opportunity.news || ""}
Description: ${opportunity.newsDescription || ""}

CONTACTS DISPONIBLES:
${contactsString}

ANALYSE DEMANDÉE:
1. Identifie les contacts les plus pertinents (maximum 10)
2. Classe-les par ordre de pertinence décroissante
3. Justifie chaque sélection avec des arguments business
4. Attribue un score de pertinence (0-1) à chaque contact

CRITÈRES DE PERTINENCE:
- Alignement du rôle avec l'offre BearingPoint
- Niveau de décision dans l'organisation
- Département/fonction en lien avec l'opportunité
- Contexte de l'actualité qui les mentionne

Réponds au format JSON suivant:
{
  "contacts": [
    {
      "fullName": "nom du contact",
      "role": "fonction",
      "department": "département",
      "email": "email si disponible",
      "phone": "téléphone si disponible",
      "company": "Schneider Electric",
      "relevanceScore": 0.85,
      "relevanceReason": "pourquoi ce contact est pertinent pour cette opportunité",
      "approachSuggestion": "suggestion d'approche commerciale"
    }
  ],
  "analysisQuality": "évaluation de la qualité de l'analyse",
  "strategicInsights": "insights stratégiques pour l'approche commerciale"
}
`;
  }

  /**
   * Parse l'analyse complète
   * @private
   */
  _parseCompleteAnalysis(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this._getDefaultAnalysis();
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "",
        contacts: parsed.contacts || [],
        opportunities: parsed.opportunities || [],
        relevanceScore: parsed.relevanceScore || 1,
        relevanceJustification: parsed.relevanceJustification || "",
        recommendedOffers: parsed.recommendedOffers || [],
        approachStrategy: parsed.approachStrategy || [],
        analyzed: true,
        insights: {
          summary: parsed.summary,
          opportunities: parsed.opportunities,
          relevanceScore: parsed.relevanceScore,
          recommendations: parsed.approachStrategy,
        },
      };
    } catch (error) {
      console.error("❌ Erreur parsing analyse complète:", error);
      return this._getDefaultAnalysis();
    }
  }

  /**
   * Parse l'analyse de pertinence
   * @private
   */
  _parseRelevanceAnalysis(response, newsItem) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      const matrix = [];

      if (parsed.relevantOffers && Array.isArray(parsed.relevantOffers)) {
        parsed.relevantOffers.forEach((offerGroup) => {
          offerGroup.offers.forEach((offer) => {
            matrix.push({
              news: newsItem.title,
              newsDate: newsItem.date,
              newsCategory: newsItem.category,
              newsDescription: newsItem.description,
              newsLink: newsItem.link,
              offerCategory: offerGroup.category,
              offerDetail: offer,
              relevanceScore: offerGroup.relevanceScore,
              justification: offerGroup.justification,
              opportunities: offerGroup.opportunities,
              analyzed: true,
            });
          });
        });
      }

      return matrix;
    } catch (error) {
      console.error("❌ Erreur parsing pertinence:", error);
      return [];
    }
  }

  /**
   * Parse les contacts de la réponse
   * @private
   */
  _parseContactsFromResponse(response, newsItem) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.contacts || !Array.isArray(parsed.contacts)) {
        return [];
      }

      return parsed.contacts.map((contact) => ({
        ...contact,
        sources: [
          {
            title: newsItem.title,
            date: newsItem.date,
            link: newsItem.link || "",
            extractionContext: contact.extractionContext,
          },
        ],
      }));
    } catch (error) {
      console.error("❌ Erreur parsing contacts:", error);
      return [];
    }
  }

  /**
   * Parse la pertinence des contacts
   * @private
   */
  _parseContactRelevance(response, opportunity) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { contacts: [] };

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        contacts: parsed.contacts || [],
        analysisQuality: parsed.analysisQuality,
        strategicInsights: parsed.strategicInsights,
      };
    } catch (error) {
      console.error("❌ Erreur parsing pertinence contacts:", error);
      return { contacts: [] };
    }
  }

  /**
   * Déduplique les contacts
   * @private
   */
  _deduplicateContacts(contacts) {
    const contactMap = new Map();

    contacts.forEach((contact) => {
      const key = (contact.fullName || contact.name || "").toLowerCase();
      if (key && !contactMap.has(key)) {
        contactMap.set(key, contact);
      } else if (key && contactMap.has(key)) {
        // Fusionner les sources
        const existing = contactMap.get(key);
        if (contact.sources) {
          existing.sources = [...(existing.sources || []), ...contact.sources];
        }
      }
    });

    return Array.from(contactMap.values());
  }

  /**
   * Retourne une analyse par défaut
   * @private
   */
  _getDefaultAnalysis() {
    return {
      summary: "",
      contacts: [],
      opportunities: [],
      relevanceScore: 0,
      relevanceJustification: "",
      recommendedOffers: [],
      approachStrategy: [],
      analyzed: false,
      insights: {
        summary: "",
        opportunities: [],
        relevanceScore: 0,
        recommendations: [],
      },
    };
  }
}

export const claudeAnalysisService = new ClaudeAnalysisService();
