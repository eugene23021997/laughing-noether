// src/services/rssFeedService.js - Version 100% Claude
import { claudeAnalysisService } from "./claudeAnalysisService";
import { dataService } from "./dataService";

// Configuration RSS (identique)
const RSS2JSON_API_URL = "https://api.rss2json.com/v1/api.json";
const RSS2JSON_API_KEY = "88vzmfaog9tacnzokqfjydvju8tbf95dn3iavrpj";

const SCHNEIDER_RSS_FEEDS = [
  "https://www.se.com/fr/fr/about-us/newsroom/news/rss.xml",
  "https://www.se.com/ww/en/about-us/newsroom/news/rss.xml",
  "https://blog.se.com/feed/",
  "https://www.challenges.fr/rss.xml",
  "https://www.usinenouvelle.com/rss/",
  "https://www.01net.com/rss/",
  "https://www.zdnet.fr/feeds/rss/actualites/",
  "https://www.enerzine.com/feed",
  "https://www.maddyness.com/feed/",
];

const SCHNEIDER_KEYWORDS = [
  "schneider", "schneider electric", "jean-pascal tricoire", "peter herweck",
  "olivier blum", "efficacité énergétique", "gestion énergétique", "energy management",
  "automation", "automatisation industrielle", "industrial automation", "centre de données",
  "data center", "smart grid", "smart building", "bâtiment intelligent", "iot industriel", "iiot",
];

/**
 * Récupère les actualités d'un flux RSS
 */
async function fetchRssFeed(rssUrl) {
  try {
    console.log(`Récupération du flux: ${rssUrl}`);
    const apiUrl = `${RSS2JSON_API_URL}?rss_url=${encodeURIComponent(rssUrl)}${
      RSS2JSON_API_KEY ? `&api_key=${RSS2JSON_API_KEY}` : ""
    }`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status !== "ok") {
      throw new Error(`Erreur API: ${data.message || "Erreur inconnue"}`);
    }

    console.log(`${data.items?.length || 0} articles récupérés de ${rssUrl}`);
    return data.items || [];
  } catch (error) {
    console.error(`Erreur flux RSS ${rssUrl}:`, error);
    return [];
  }
}

/**
 * Normalise un article RSS
 */
function normalizeNewsItem(item, source) {
  try {
    const pubDate = new Date(item.pubDate);
    const day = pubDate.getDate().toString().padStart(2, "0");
    const months = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", 
                   "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
    const month = months[pubDate.getMonth()];
    const year = pubDate.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;

    let categories = item.categories || [];
    if (typeof categories === "string") {
      categories = categories.split(",").map(cat => cat.trim());
    }

    let cleanDescription = "";
    if (item.description) {
      cleanDescription = item.description.replace(/<[^>]*>?/gm, "");
    }

    return {
      title: item.title || "Sans titre",
      date: formattedDate,
      category: categories.join(", ") || "Actualité",
      description: cleanDescription,
      link: item.link || "",
      source: source,
      pubDateTimestamp: pubDate.getTime(),
    };
  } catch (error) {
    console.error("Erreur normalisation:", error);
    return {
      title: item?.title || "Article sans titre",
      date: new Date().toLocaleDateString(),
      category: "Actualité",
      description: "Description non disponible",
      link: item?.link || "",
      source: source,
      pubDateTimestamp: Date.now(),
    };
  }
}

/**
 * Vérifie si une actualité concerne Schneider Electric
 * MAINTENANT UTILISE CLAUDE au lieu de mots-clés
 */
async function isRelevantToSchneiderWithClaude(newsItem) {
  // Si c'est une source officielle Schneider, c'est pertinent
  if (newsItem.source.includes("se.com") || newsItem.source.includes("blog.se.com")) {
    return true;
  }

  // Pour les autres sources, demander à Claude
  try {
    const prompt = `
Tu es un expert en analyse de contenu. Détermine si cette actualité concerne Schneider Electric.

ACTUALITÉ:
Titre: ${newsItem.title}
Description: ${newsItem.description}
Catégorie: ${newsItem.category}
Source: ${newsItem.source}

CRITÈRES:
- Mentionne explicitement Schneider Electric ou ses dirigeants
- Parle de domaines d'activité de Schneider Electric (énergie, automatisation, etc.)
- Évoque des partenariats, acquisitions, ou projets impliquant Schneider Electric

Réponds uniquement par "OUI" ou "NON" suivi d'une brève justification.

Format: 
PERTINENCE: [OUI/NON]
JUSTIFICATION: [explication courte]
`;

    const response = await claudeAnalysisService._callClaudeAPI(prompt);
    const isRelevant = response.includes("PERTINENCE: OUI");
    
    if (isRelevant) {
      console.log(`✓ Article pertinent identifié par Claude: ${newsItem.title}`);
    }
    
    return isRelevant;
  } catch (error) {
    console.error("Erreur analyse pertinence Claude:", error);
    // Fallback sur mots-clés en cas d'erreur
    const content = `${newsItem.title} ${newsItem.description} ${newsItem.category}`.toLowerCase();
    return SCHNEIDER_KEYWORDS.some(keyword => content.includes(keyword.toLowerCase()));
  }
}

/**
 * Récupère toutes les actualités avec analyse Claude complète
 */
async function getAllNews() {
  try {
    console.log("🚀 Début récupération des flux RSS avec analyse Claude");

    // 1. Récupération des flux RSS
    const newsPromises = SCHNEIDER_RSS_FEEDS.map(feed =>
      fetchRssFeed(feed).then(items => {
        if (!items || !Array.isArray(items)) return [];
        return items.map(item => normalizeNewsItem(item, feed));
      })
    );

    const newsArrays = await Promise.all(newsPromises);
    let allNews = newsArrays.flat();
    console.log(`📰 ${allNews.length} articles récupérés au total`);

    // 2. Filtrage intelligent avec Claude
    console.log("🤖 Filtrage intelligent avec Claude...");
    const relevantNews = [];
    
    for (const newsItem of allNews) {
      const isRelevant = await isRelevantToSchneiderWithClaude(newsItem);
      if (isRelevant) {
        relevantNews.push(newsItem);
      }
      // Petite pause pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ ${relevantNews.length} articles pertinents identifiés par Claude`);

    // 3. Élimination des doublons
    const uniqueNews = [];
    const titles = new Set();
    relevantNews.forEach(item => {
      if (!titles.has(item.title)) {
        titles.add(item.title);
        uniqueNews.push(item);
      }
    });

    console.log(`🔄 ${uniqueNews.length} articles uniques après déduplication`);

    // 4. Tri par date
    const sortedNews = uniqueNews.sort((a, b) => b.pubDateTimestamp - a.pubDateTimestamp);
    
    // 5. Analyse complète avec Claude
    console.log("🧠 Analyse complète avec Claude...");
    const bpOffers = dataService.getData().bpOffers;
    const analyzedNews = await analyzeNewsWithClaude(sortedNews, bpOffers);
    
    console.log(`✨ ${analyzedNews.filter(item => item.analyzed).length} articles analysés par Claude`);
    
    return analyzedNews;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des actualités:", error);
    return [];
  }
}

/**
 * Analyse les actualités avec Claude (remplace l'analyse par mots-clés)
 */
async function analyzeNewsWithClaude(news, bpOffers) {
  try {
    console.log(`🧠 Analyse Claude de ${news.length} actualités`);
    
    // Limiter le nombre d'articles à analyser pour éviter les coûts élevés
    const articlesToAnalyze = news.slice(0, 15);
    const enrichedNews = [];
    
    for (const newsItem of articlesToAnalyze) {
      try {
        console.log(`🔍 Analyse de: ${newsItem.title}`);
        
        // Analyse complète de l'article
        const analysis = await claudeAnalysisService.analyzeArticleCompletely(newsItem, bpOffers);
        
        // Enrichir l'actualité avec l'analyse
        const enrichedItem = {
          ...newsItem,
          ...analysis,
          analyzed: true
        };
        
        enrichedNews.push(enrichedItem);
        
        // Pause entre les analyses
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`❌ Erreur analyse de ${newsItem.title}:`, error);
        // Ajouter l'article sans analyse en cas d'erreur
        enrichedNews.push({
          ...newsItem,
          analyzed: false,
          contacts: [],
          insights: {}
        });
      }
    }
    
    // Ajouter les articles non analysés
    const remainingNews = news.slice(15).map(item => ({
      ...item,
      analyzed: false,
      contacts: [],
      insights: {}
    }));
    
    const finalNews = [...enrichedNews, ...remainingNews];
    
    console.log(`✅ Analyse terminée: ${enrichedNews.length} articles analysés par Claude`);
    
    return finalNews;
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse Claude:", error);
    return news.map(item => ({
      ...item,
      analyzed: false,
      contacts: [],
      insights: {}
    }));
  }
}

/**
 * Analyse la pertinence des actualités par rapport aux offres (100% Claude)
 */
async function analyzeNewsRelevance(news, offers) {
  try {
    console.log(`🎯 Analyse de pertinence Claude pour ${news.length} actualités`);
    
    // Utiliser le service Claude pour l'analyse de pertinence
    const relevanceMatrix = await claudeAnalysisService.analyzeNewsRelevance(news, offers);
    
    console.log(`📊 Matrice de pertinence générée: ${relevanceMatrix.length} entrées`);
    
    return relevanceMatrix;
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse de pertinence:", error);
    return [];
  }
}

/**
 * Extraction de contacts via Claude (remplace l'extraction par regex)
 */
async function extractContactsFromNews(news) {
  try {
    console.log(`👥 Extraction de contacts Claude pour ${news.length} actualités`);
    
    // Utiliser le service Claude pour l'extraction
    const contacts = await claudeAnalysisService.extractContactsFromNews(news);
    
    console.log(`📇 ${contacts.length} contacts extraits par Claude`);
    
    return contacts;
  } catch (error) {
    console.error("❌ Erreur lors de l'extraction de contacts:", error);
    return [];
  }
}

// Exporter le service avec les nouvelles méthodes Claude
export const rssFeedService = {
  getAllNews,
  analyzeNewsRelevance,
  extractContactsFromNews,
  analyzeNewsWithClaude,
  fetchRssFeed,
  // Nouvelles méthodes Claude
  isRelevantToSchneiderWithClaude
};
