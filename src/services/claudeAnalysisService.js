// src/services/claudeAnalysisService.js

/**
 * Service pour analyser les articles via l'API Claude
 * Permet d'extraire des contacts et des opportunités commerciales
 */

// Configuration de l'API Claude
const CLAUDE_API_KEY =
  "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"; // À remplacer par votre clé API
const CLAUDE_API_URL = "https://anthropic-proxy.onrender.com/api/anthropic/messages";
const CLAUDE_MODEL = "claude-3-opus-20240229"; // Vous pouvez utiliser d'autres modèles comme claude-3-sonnet ou claude-3-haiku

/**
 * Classe pour l'analyse d'articles via Claude
 */
class ClaudeAnalysisService {
  /**
   * Analyse un article pour extraire des contacts
   * @param {Object} article - L'article à analyser
   * @returns {Promise<Array>} - Les contacts extraits
   */
  async extractContactsFromArticle(article) {
    try {
      const prompt = this._buildContactExtractionPrompt(article);
      const response = await this._callClaudeAPI(prompt);
      const contacts = this._parseContactsFromResponse(response);
      return contacts;
    } catch (error) {
      console.error(
        "Erreur lors de l'extraction des contacts via Claude:",
        error
      );
      return [];
    }
  }

  /**
   * Génère une synthèse commerciale de l'article
   * @param {Object} article - L'article à analyser
   * @param {Object} bpOffers - Les offres de BearingPoint
   * @returns {Promise<Object>} - La synthèse commerciale
   */
  async generateBusinessInsights(article, bpOffers) {
    try {
      const prompt = this._buildBusinessInsightsPrompt(article, bpOffers);
      const response = await this._callClaudeAPI(prompt);
      const insights = this._parseInsightsFromResponse(response);
      return insights;
    } catch (error) {
      console.error(
        "Erreur lors de la génération des insights via Claude:",
        error
      );
      return {
        summary: "",
        opportunities: [],
        relevanceScore: 0,
        recommendations: [],
      };
    }
  }

  /**
   * Analyse en batch plusieurs articles
   * @param {Array} articles - Les articles à analyser
   * @param {Object} bpOffers - Les offres de BearingPoint
   * @returns {Promise<Array>} - Les résultats d'analyse
   */
  async batchAnalyzeArticles(articles, bpOffers) {
    try {
      console.log(`Analyse par lot de ${articles.length} articles`);
      const results = [];

      // Traitement par lot pour éviter de surcharger l'API
      const batchSize = 5;
      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        console.log(
          `Traitement du lot ${i / batchSize + 1}/${Math.ceil(
            articles.length / batchSize
          )}`
        );

        // Traiter chaque article du lot en parallèle
        const batchPromises = batch.map(async (article) => {
          // Extraire les contacts de l'article
          const contacts = await this.extractContactsFromArticle(article);

          // Générer des insights commerciaux
          const insights = await this.generateBusinessInsights(
            article,
            bpOffers
          );

          return {
            article,
            contacts,
            insights,
          };
        });

        // Attendre que tous les articles du lot soient traités
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Attente entre les lots pour respecter les limites de l'API
        if (i + batchSize < articles.length) {
          console.log(
            "Pause entre les lots pour respecter les limites de l'API..."
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      return results;
    } catch (error) {
      console.error("Erreur lors de l'analyse en batch via Claude:", error);
      return [];
    }
  }

  /**
   * Construit le prompt pour l'extraction de contacts
   * @param {Object} article - L'article à analyser
   * @returns {string} - Le prompt formaté
   * @private
   */
  _buildContactExtractionPrompt(article) {
    return `
    Analyse l'article suivant provenant de Schneider Electric et identifie toutes les personnes mentionnées.
    Pour chaque personne, extrais les informations suivantes au format JSON:
    - nom complet (fullName)
    - fonction/poste (role)
    - département/service (department)
    - email (email)
    - téléphone (phone)
    - entreprise (company)
    
    Titre de l'article: ${article.title}
    Date: ${article.date}
    Catégorie: ${article.category || "Non spécifiée"}
    Description: ${article.description || ""}
    Lien: ${article.link || ""}
    
    Attention aux points suivants:
    - Identifie uniquement les personnes qui travaillent chez Schneider Electric
    - Cherche particulièrement les cadres dirigeants et décideurs (C-level, directeurs, responsables)
    - Extrait la fonction exacte mentionnée dans l'article
    - Si une information n'est pas présente, laisse le champ vide
    - L'entreprise par défaut est "Schneider Electric" sauf indication contraire
    - Évalue la confiance de chaque extraction avec un score entre 0 et 1 (confidenceScore)
    
    Réponds uniquement au format JSON suivant:
    { "contacts": [ { "fullName": "", "role": "", "department": "", "email": "", "phone": "", "company": "", "confidenceScore": 0.0 } ] }
    `;
  }

  /**
   * Construit le prompt pour la génération de insights commerciaux
   * @param {Object} article - L'article à analyser
   * @param {Object} bpOffers - Les offres de BearingPoint
   * @returns {string} - Le prompt formaté
   * @private
   */
  _buildBusinessInsightsPrompt(article, bpOffers) {
    // Convertir l'objet des offres en chaîne formatée
    const offersString = Object.entries(bpOffers)
      .map(([category, offers]) => {
        return `${category}:\n${offers
          .map((offer) => `  - ${offer}`)
          .join("\n")}`;
      })
      .join("\n\n");

    return `
    Analyse cet article concernant Schneider Electric et génère des insights commerciaux pour BearingPoint.
    
    Titre de l'article: ${article.title}
    Date: ${article.date}
    Catégorie: ${article.category || "Non spécifiée"}
    Description: ${article.description || ""}
    Lien: ${article.link || ""}
    
    Voici les offres de services de BearingPoint:
    ${offersString}
    
    Ton analyse doit contenir:
    1. Un résumé synthétique de l'article
    2. Les opportunités commerciales identifiées pour BearingPoint chez Schneider Electric
    3. Un score de pertinence (1 à 3, où 3 est le plus pertinent)
    4. Une liste de 3-5 offres BearingPoint particulièrement adaptées à cette actualité
    5. Des suggestions d'approche commerciale pour BearingPoint
    
    Réponds uniquement au format JSON suivant:
    {
      "summary": "",
      "opportunities": [],
      "relevanceScore": 0,
      "recommendedOffers": [
        { "category": "", "offer": "" }
      ],
      "approachSuggestions": []
    }
    `;
  }

  /**
   * Appelle l'API Claude avec le prompt donné
   * @param {string} prompt - Le prompt à envoyer
   * @returns {Promise<string>} - La réponse de Claude
   * @private
   */
  async _callClaudeAPI(prompt) {
    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Erreur API Claude: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error("Erreur lors de l'appel à l'API Claude:", error);
      throw error;
    }
  }

  /**
   * Parse les contacts depuis la réponse JSON de Claude
   * @param {string} response - La réponse de Claude
   * @returns {Array} - Les contacts extraits
   * @private
   */
  _parseContactsFromResponse(response) {
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Aucun JSON trouvé dans la réponse de Claude");
        return [];
      }

      const jsonString = jsonMatch[0];
      const parsedData = JSON.parse(jsonString);

      if (!parsedData.contacts || !Array.isArray(parsedData.contacts)) {
        console.error("Format de réponse invalide de Claude");
        return [];
      }

      // Vérifier et nettoyer les contacts
      return parsedData.contacts
        .map((contact) => ({
          fullName: contact.fullName || "",
          role: contact.role || "Poste non spécifié",
          department: contact.department || "",
          email: contact.email || "",
          phone: contact.phone || "",
          company: contact.company || "Schneider Electric",
          confidenceScore: contact.confidenceScore || 0.5,
          source: {
            title: "IA Claude",
            date: new Date().toLocaleDateString(),
            extraction: true,
          },
        }))
        .filter(
          (contact) => contact.fullName && contact.fullName.trim() !== ""
        );
    } catch (error) {
      console.error(
        "Erreur lors du parsing des contacts depuis la réponse de Claude:",
        error
      );
      return [];
    }
  }

  /**
   * Parse les insights depuis la réponse JSON de Claude
   * @param {string} response - La réponse de Claude
   * @returns {Object} - Les insights commerciaux
   * @private
   */
  _parseInsightsFromResponse(response) {
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Aucun JSON trouvé dans la réponse de Claude");
        return {
          summary: "",
          opportunities: [],
          relevanceScore: 0,
          recommendedOffers: [],
          approachSuggestions: [],
        };
      }

      const jsonString = jsonMatch[0];
      const parsedData = JSON.parse(jsonString);

      // Vérifier si toutes les propriétés attendues sont présentes
      return {
        summary: parsedData.summary || "",
        opportunities: Array.isArray(parsedData.opportunities)
          ? parsedData.opportunities
          : [],
        relevanceScore: parseInt(parsedData.relevanceScore) || 0,
        recommendedOffers: Array.isArray(parsedData.recommendedOffers)
          ? parsedData.recommendedOffers
          : [],
        approachSuggestions: Array.isArray(parsedData.approachSuggestions)
          ? parsedData.approachSuggestions
          : [],
      };
    } catch (error) {
      console.error(
        "Erreur lors du parsing des insights depuis la réponse de Claude:",
        error
      );
      return {
        summary: "",
        opportunities: [],
        relevanceScore: 0,
        recommendedOffers: [],
        approachSuggestions: [],
      };
    }
  }
}

// Exporter une instance unique du service
export const claudeAnalysisService = new ClaudeAnalysisService();
