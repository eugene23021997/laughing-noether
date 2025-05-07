/**
 * Service pour récupérer et parser les flux RSS de Schneider Electric
 * Utilise l'API RSS2JSON pour convertir les flux RSS en JSON
 * Intègre l'analyse par l'API Claude pour l'extraction de contacts et d'insights commerciaux
 */

import { claudeAnalysisService } from "./claudeAnalysisService";
import { dataService } from "./dataService";

// L'URL de l'API RSS2JSON (gratuite avec des limites, nécessite une inscription pour plus de requêtes)
const RSS2JSON_API_URL = "https://api.rss2json.com/v1/api.json";
// Entrez votre clé API si vous en créez une (permet plus de requêtes)
const RSS2JSON_API_KEY = "88vzmfaog9tacnzokqfjydvju8tbf95dn3iavrpj";

// URLs des flux RSS de Schneider Electric et sources complémentaires
const SCHNEIDER_RSS_FEEDS = [
  // Flux RSS officiel des communiqués de presse de Schneider Electric France
  "https://www.se.com/fr/fr/about-us/newsroom/news/rss.xml",
  // Flux RSS des actualités globales (en anglais)
  "https://www.se.com/ww/en/about-us/newsroom/news/rss.xml",
  // Blog de Schneider Electric (si disponible en RSS)
  "https://blog.se.com/feed/",
  // Sources complémentaires
  "https://www.challenges.fr/rss.xml",
  "https://www.usinenouvelle.com/rss/",
  "https://www.01net.com/rss/",
  "https://www.zdnet.fr/feeds/rss/actualites/",
  "https://www.enerzine.com/feed",
  "https://www.maddyness.com/feed/",
];

// Mots-clés pour filtrer les articles pertinents des sources générales
const SCHNEIDER_KEYWORDS = [
  "schneider",
  "schneider electric",
  "jean-pascal tricoire",
  "peter herweck",
  "olivier blum",
  "efficacité énergétique",
  "gestion énergétique",
  "energy management",
  "automation",
  "automatisation industrielle",
  "industrial automation",
  "centre de données",
  "data center",
  "smart grid",
  "smart building",
  "bâtiment intelligent",
  "iot industriel",
  "iiot",
];

// Mots-clés par catégorie d'offre pour l'analyse de pertinence
const KEYWORDS_BY_CATEGORY = {
  "Finance & Risk": [
    // Finance
    "finance",
    "financier",
    "bénéfice",
    "résultat",
    "revenu",
    "chiffre d'affaires",
    "investissement",
    "dividende",
    "action",
    "bourse",
    "obligation",
    "fiscal",
    "budget",
    "trésorerie",
    "profit",
    "marge",

    // Risk
    "risque",
    "conformité",
    "compliance",
    "audit",
    "contrôle",
    "régulation",
    "fraude",
    "cybersécurité",

    // Management
    "performance",
    "gestion",
    "gouvernance",
    "indicateur",
    "tableau de bord",

    // ERP & Solutions
    "erp",
    "pgi",
    "sap",
    "oracle",
    "cfo",
    "daf",
    "directeur financier",
  ],

  Technology: [
    // Data & Analytics
    "data",
    "données",
    "analytics",
    "analyse",
    "big data",
    "lake",
    "entrepôt de données",

    // Intelligence Artificielle
    "ai",
    "ia",
    "intelligence artificielle",
    "machine learning",
    "apprentissage automatique",
    "deep learning",
    "modèle",
    "prédictif",
    "chatbot",
    "nlp",
    "computer vision",

    // Cloud
    "cloud",
    "saas",
    "iaas",
    "paas",
    "hybride",
    "aws",
    "azure",
    "gcp",
    "multicloud",
    "virtualisation",
    "conteneur",
    "docker",
    "kubernetes",

    // Cybersécurité
    "sécurité",
    "security",
    "protection",
    "données",
    "privacy",
    "rgpd",
    "gdpr",
    "confidentialité",
    "hacker",
    "piratage",
    "vulnérabilité",
    "pare-feu",

    // Applications
    "application",
    "software",
    "logiciel",
    "solution",
    "api",
    "interface",
    "mobile",
    "web",
    "digital",
    "numérique",
    "intégration",
    "microservice",

    // IT Management
    "it",
    "si",
    "système d'information",
    "infrastructure",
    "réseau",
    "serveur",
    "cio",
    "dsi",
    "directeur informatique",
    "technologie",
  ],

  Operations: [
    // Manufacturing
    "fabrication",
    "usine",
    "production",
    "assemblage",
    "qualité",
    "lean",
    "industrie 4.0",
    "iiot",
    "automatisation",
    "robotique",

    // Maintenance
    "maintenance",
    "prédictive",
    "préventive",
    "équipement",
    "asset",
    "réparation",
    "panne",
    "downtime",
    "uptime",
    "temps d'arrêt",

    // Supply Chain
    "supply chain",
    "chaîne d'approvisionnement",
    "logistique",
    "stock",
    "inventaire",
    "entrepôt",
    "warehouse",
    "distribution",
    "transport",
    "livraison",
    "expédition",
    "traçabilité",

    // Planning
    "planification",
    "prévision",
    "forecast",
    "demande",
    "demand",
    "planning",
    "s&op",
    "approvisionnement",
    "production",
    "capacité",

    // Procurement
    "achat",
    "sourcing",
    "procurement",
    "fournisseur",
    "supplier",
    "appel d'offre",
    "rfp",
    "rfq",
    "contrat",
    "négociation",
    "spend",
    "dépense",
  ],

  "People & Strategy": [
    // Talent & HR
    "rh",
    "ressources humaines",
    "talent",
    "recrutement",
    "formation",
    "compétence",
    "carrière",
    "collaborateur",
    "employé",
    "engagement",
    "culture",
    "diversité",
    "inclusion",
    "bien-être",
    "remote",
    "télétravail",

    // Change Management
    "changement",
    "transformation",
    "conduite du changement",
    "adoption",
    "résistance",
    "accompagnement",
    "transition",
    "formation",
    "communication",

    // Strategy
    "stratégie",
    "vision",
    "mission",
    "objectif",
    "roadmap",
    "business model",
    "innovation",
    "disruption",
    "croissance",
    "expansion",
    "développement",

    // Project Management
    "projet",
    "programme",
    "portefeuille",
    "agile",
    "scrum",
    "kanban",
    "livrable",
    "jalon",
    "milestone",
    "planning",
    "pmo",
    "gestion de projet",
  ],

  "Customer & Growth": [
    // Digital & Innovation
    "digital",
    "numérique",
    "innovation",
    "transformation digitale",
    "disruption",
    "technologie",
    "startup",
    "écosystème",
    "incubation",
    "accélération",

    // Customer Experience
    "client",
    "customer",
    "expérience",
    "parcours",
    "journey",
    "satisfaction",
    "nps",
    "fidélité",
    "loyalty",
    "persona",
    "user",
    "utilisateur",

    // Marketing
    "marketing",
    "marque",
    "brand",
    "campagne",
    "communication",
    "média",
    "social media",
    "réseaux sociaux",
    "seo",
    "sea",
    "acquisition",
    "content",
    "contenu",
    "automation",
    "digital marketing",

    // Sales
    "vente",
    "commercial",
    "business development",
    "pipeline",
    "lead",
    "prospect",
    "opportunité",
    "funnel",
    "conversion",
    "channel",
    "canal",
    "distribution",
    "partenaire",
    "pricing",
    "prix",
    "tarification",

    // E-commerce & CRM
    "ecommerce",
    "e-commerce",
    "marketplace",
    "plateforme",
    "online",
    "en ligne",
    "crm",
    "gestion relation client",
    "salesforce",
    "microsoft dynamics",
  ],

  "BE Capital": [
    // M&A
    "acquisition",
    "fusion",
    "merger",
    "rachat",
    "cession",
    "joint venture",
    "consolidation",
    "due diligence",
    "valorisation",
    "synergies",

    // Private Equity
    "capital",
    "private equity",
    "investissement",
    "fund",
    "fonds",
    "lbo",
    "leverage",
    "transaction",
    "deal",
    "asset",
    "actif",

    // PMI & Carve out
    "pmi",
    "post-merger",
    "intégration",
    "carve out",
    "spin off",
    "séparation",
    "restructuration",
    "réorganisation",
    "transition",
  ],
};

/**
 * Analyse les actualités avec Claude pour extraire des contacts et générer des insights
 * @param {Array} news - Les actualités à analyser
 * @returns {Promise<Array>} - Les actualités enrichies avec l'analyse Claude
 */
async function analyzeNewsWithClaude(news) {
  try {
    console.log("Début de l'analyse des actualités avec Claude");
    
    // Récupérer les offres BearingPoint pour l'analyse
    const bpOffers = dataService.getData().bpOffers;
    
    // Limiter le nombre d'articles à analyser pour éviter des coûts élevés
    // en production, vous pourriez vouloir analyser tous les articles
    const articlesToAnalyze = news.slice(0, 10); // Analyser seulement les 10 premiers articles
    
    // Analyser les articles avec Claude
    const analysisResults = await claudeAnalysisService.batchAnalyzeArticles(articlesToAnalyze, bpOffers);
    
    console.log(`Analyse terminée pour ${analysisResults.length} articles`);
    
    // Enrichir les actualités originales avec les résultats de l'analyse
    const enrichedNews = news.map(newsItem => {
      // Chercher si cet article a été analysé
      const analysis = analysisResults.find(result => 
        result.article.title === newsItem.title || 
        (result.article.link && result.article.link === newsItem.link)
      );
      
      if (analysis) {
        // Enrichir avec les données d'analyse
        return {
          ...newsItem,
          contacts: analysis.contacts || [],
          insights: analysis.insights || {},
          analyzed: true
        };
      }
      
      // Retourner l'article original si pas d'analyse
      return newsItem;
    });
    
    console.log(`${enrichedNews.filter(item => item.analyzed).length} actualités enrichies avec l'analyse Claude`);
    
    return enrichedNews;
  } catch (error) {
    console.error("Erreur lors de l'analyse des actualités avec Claude:", error);
    // En cas d'erreur, retourner les actualités originales sans enrichissement
    return news;
  }
}

// Fonction pour récupérer les actualités d'un flux RSS
async function fetchRssFeed(rssUrl) {
  try {
    console.log(`Tentative de récupération du flux: ${rssUrl}`);

    // L'URL complète pour l'API RSS2JSON
    const apiUrl = `${RSS2JSON_API_URL}?rss_url=${encodeURIComponent(rssUrl)}${
      RSS2JSON_API_KEY ? `&api_key=${RSS2JSON_API_KEY}` : ""
    }`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération du flux RSS: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.status !== "ok") {
      throw new Error(
        `Erreur de l'API RSS2JSON: ${data.message || "Erreur inconnue"}`
      );
    }

    console.log(
      `Nombre d'articles récupérés de ${rssUrl}: ${
        data.items ? data.items.length : 0
      }`
    );
    return data.items || [];
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du flux RSS ${rssUrl}:`,
      error
    );
    return [];
  }
}

// Normaliser le format des actualités pour correspondre à notre structure de données
function normalizeNewsItem(item, source) {
  try {
    // Extraire la date et la formater comme "06 Avr. 2025"
    const pubDate = new Date(item.pubDate);
    const day = pubDate.getDate().toString().padStart(2, "0");

    // Tableau des mois en français abrégés
    const months = [
      "Janv.",
      "Févr.",
      "Mars",
      "Avr.",
      "Mai",
      "Juin",
      "Juil.",
      "Août",
      "Sept.",
      "Oct.",
      "Nov.",
      "Déc.",
    ];
    const month = months[pubDate.getMonth()];
    const year = pubDate.getFullYear();

    // Formater la date
    const formattedDate = `${day} ${month} ${year}`;

    // Extraire les catégories
    let categories = item.categories || [];
    if (typeof categories === "string") {
      categories = categories.split(",").map((cat) => cat.trim());
    }

    // Normaliser les catégories en français si possible
    const categoriesStr = categories.join(", ");

    // Nettoyer la description (enlever les tags HTML)
    let cleanDescription = "";
    if (item.description) {
      cleanDescription = item.description.replace(/<[^>]*>?/gm, "");
    }

    return {
      date: formattedDate,
      title: item.title || "Sans titre",
      category: categoriesStr || "Actualité",
      description: cleanDescription,
      link: item.link || "",
      source: source,
      pubDateTimestamp: pubDate.getTime(), // Ajouter un timestamp pour faciliter le tri
    };
  } catch (error) {
    console.error("Erreur lors de la normalisation d'un article:", error);
    // Retourner un article par défaut en cas d'erreur
    return {
      date: new Date().toLocaleDateString(),
      title: item?.title || "Article sans titre",
      category: "Actualité",
      description: "Description non disponible",
      link: item?.link || "",
      source: source,
      pubDateTimestamp: Date.now(),
    };
  }
}

// Vérifier si une actualité parle de Schneider Electric pour les sources générales
function isRelevantToSchneider(newsItem) {
  // Si la source est directement de Schneider Electric, c'est pertinent
  if (
    newsItem.source.includes("se.com") ||
    newsItem.source.includes("blog.se.com")
  ) {
    return true;
  }

  // Pour les autres sources, vérifier si l'actualité mentionne Schneider Electric
  const content =
    `${newsItem.title} ${newsItem.description} ${newsItem.category}`.toLowerCase();

  // Vérifier si l'un des mots-clés est présent dans le contenu
  return SCHNEIDER_KEYWORDS.some((keyword) =>
    content.includes(keyword.toLowerCase())
  );
}

// Fonction pour récupérer toutes les actualités de tous les flux RSS
async function getAllNews() {
  try {
    console.log("Début de récupération des flux RSS");

    // Récupérer les actualités de tous les flux en parallèle
    const newsPromises = SCHNEIDER_RSS_FEEDS.map((feed) =>
      fetchRssFeed(feed).then((items) => {
        if (!items || !Array.isArray(items)) {
          console.log(`Aucun article récupéré ou format invalide pour ${feed}`);
          return [];
        }
        return items.map((item) => normalizeNewsItem(item, feed));
      })
    );

    // Attendre que toutes les requêtes soient terminées
    const newsArrays = await Promise.all(newsPromises);

    // Fusionner tous les tableaux d'actualités
    let allNews = newsArrays.flat();

    console.log(`Nombre total d'articles avant filtrage: ${allNews.length}`);

    // Filtrer les actualités pour ne garder que celles qui parlent de Schneider Electric
    let filteredNews = allNews.filter(isRelevantToSchneider);

    console.log(
      `Nombre d'articles après filtrage Schneider: ${filteredNews.length}`
    );

    // Éliminer les doublons potentiels (basés sur le titre)
    const uniqueNews = [];
    const titles = new Set();

    filteredNews.forEach((item) => {
      if (!titles.has(item.title)) {
        titles.add(item.title);
        uniqueNews.push(item);
      }
    });

    console.log(
      `Nombre d'articles après élimination des doublons: ${uniqueNews.length}`
    );

    // Trier par date (du plus récent au plus ancien)
    const sortedNews = uniqueNews.sort((a, b) => b.pubDateTimestamp - a.pubDateTimestamp);
    
    // Analyser les actualités avec Claude pour extraire contacts et insights
    const analyzedNews = await analyzeNewsWithClaude(sortedNews);
    
    return analyzedNews;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération et de l'analyse des actualités:",
      error
    );
    return [];
  }
}

// Fonction pour lancer une analyse de pertinence des actualités par rapport aux offres
function analyzeNewsRelevance(news, offers) {
  try {
    const relevanceMatrix = [];

    // Pour chaque actualité
    news.forEach((newsItem) => {
      // Si l'actualité a été analysée par Claude, utiliser ses insights
      if (newsItem.analyzed && newsItem.insights && newsItem.insights.recommendedOffers) {
        // Utiliser le score de pertinence de Claude (1-3)
        const relevanceScore = Math.min(3, Math.max(1, newsItem.insights.relevanceScore || 1));
        
        // Ajouter une entrée dans la matrice pour chaque offre recommandée
        newsItem.insights.recommendedOffers.forEach(recommendation => {
          relevanceMatrix.push({
            news: newsItem.title,
            newsDate: newsItem.date,
            newsCategory: newsItem.category,
            newsDescription: newsItem.description,
            newsLink: newsItem.link,
            offerCategory: recommendation.category,
            relevanceScore: relevanceScore,
            offerDetail: recommendation.offer,
            aiSummary: newsItem.insights.summary,
            aiOpportunities: newsItem.insights.opportunities,
            aiApproach: newsItem.insights.approachSuggestions
          });
        });
      } else {
        // Méthode traditionnelle d'analyse par mots-clés
        // Texte de l'actualité en minuscules pour la recherche
        const newsText = `${newsItem.title} ${newsItem.description || ""} ${
          newsItem.category || ""
        }`.toLowerCase();

        // Pour chaque catégorie d'offre
        Object.entries(KEYWORDS_BY_CATEGORY).forEach(([category, keywords]) => {
          // Compter combien de mots clés sont présents dans l'actualité
          let matchCount = 0;
          let matchedKeywords = [];

          keywords.forEach((keyword) => {
            if (newsText.includes(keyword.toLowerCase())) {
              matchCount++;
              matchedKeywords.push(keyword);
            }
          });

          // Calculer un score de pertinence de 1 à 3
          let relevanceScore = 0;
          if (matchCount > 5) {
            // Augmenter le seuil pour un score élevé
            relevanceScore = 3; // Très pertinent
          } else if (matchCount > 2) {
            // Ajuster le seuil intermédiaire
            relevanceScore = 2; // Pertinent
          } else if (matchCount > 0) {
            relevanceScore = 1; // Légèrement pertinent
          }

          // Facteur d'ajustement basé sur la spécificité des mots clés
          // Les mots-clés plus spécifiques ont plus de poids
          let specificityFactor = 0;
          matchedKeywords.forEach((keyword) => {
            // Les termes plus longs sont généralement plus spécifiques
            if (keyword.length > 8) specificityFactor += 0.1;

            // Les termes techniques ont plus de poids
            const technicalTerms = [
              "erp",
              "crm",
              "analytics",
              "cloud",
              "cybersécurité",
              "ia",
              "ai",
            ];
            if (technicalTerms.includes(keyword.toLowerCase()))
              specificityFactor += 0.2;
          });

          // Ajuster le score en fonction de la spécificité (mais pas au-delà de 3)
          relevanceScore = Math.min(3, relevanceScore * (1 + specificityFactor));

          // Si au moins un mot clé a été trouvé, ajouter à la matrice
          if (relevanceScore > 0) {
            // Trouver les offres détaillées correspondantes
            const matchedOffers = [];

            // Parcourir les offres détaillées pour trouver celles qui correspondent aux mots clés
            Object.entries(offers).forEach(([serviceLine, serviceOfferings]) => {
              if (serviceLine === category) {
                serviceOfferings.forEach((offering) => {
                  // Vérifier si le nom de l'offre contient l'un des mots clés correspondants
                  const offeringLower = offering.toLowerCase();
                  if (
                    matchedKeywords.some((keyword) =>
                      offeringLower.includes(keyword.toLowerCase())
                    )
                  ) {
                    matchedOffers.push(offering);
                  }
                });
              }
            });

            relevanceMatrix.push({
              news: newsItem.title,
              newsDate: newsItem.date,
              newsCategory: newsItem.category,
              newsDescription: newsItem.description,
              newsLink: newsItem.link,
              offerCategory: category,
              relevanceScore: Math.round(relevanceScore), // Arrondir pour maintenir des valeurs entières 1, 2 ou 3
              offerDetail: matchedOffers.join(", ") || category,
            });
          }
        });
      }
    });

    return relevanceMatrix;
  } catch (error) {
    console.error(
      "Erreur lors de l'analyse de la pertinence des actualités:",
      error
    );
    return [];
  }
}

// Exporter le service
export const rssFeedService = {
  getAllNews,
  analyzeNewsRelevance,
  analyzeNewsWithClaude, // Nouvelle fonction exportée
  fetchRssFeed
};
