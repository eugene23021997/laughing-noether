import * as React from "react";
const { useState, useEffect, useMemo, useRef } = React;
import { dataService } from "./services/dataService";
import { rssFeedService } from "./services/rssFeedService";
import MatrixTabContent from "./components/MatrixTabContent";
import ServiceLineTabContent from "./components/ServiceLineTabContent.js";
import ContactTabContent from "./components/ContactTabContent";
import LoadingSpinner from "./components/LoadingSpinner";
// Modification du chemin d'import pour les styles
import "./styles/main.css";

/**
 * Composant principal de l'application de suivi de compte pour la prospection commerciale
 * @returns {JSX.Element} Application de suivi de compte
 */
const App = () => {
  // États pour la navigation et les filtres
  const [activeTab, setActiveTab] = useState("actualites");
  const [selectedOffer, setSelectedOffer] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [relevanceFilter, setRelevanceFilter] = useState(0);
  const [yearFilter, setYearFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // États pour l'interface utilisateur
  const [isLoading, setIsLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchInputRef = useRef(null);

  // États pour les flux RSS
  const [rssNews, setRssNews] = useState([]);
  const [isLoadingRss, setIsLoadingRss] = useState(false);
  const [rssRelevanceMatrix, setRssRelevanceMatrix] = useState([]);
  const [showRssOnly, setShowRssOnly] = useState(false);
  const [lastRssUpdate, setLastRssUpdate] = useState(null);

  // États pour les données calculées
  const [opportunitiesByOffering, setOpportunitiesByOffering] = useState({});
  const [offeringStats, setOfferingStats] = useState({});
  const [serviceLineStats, setServiceLineStats] = useState({});
  const [yearlyStats, setYearlyStats] = useState({});
  const [offeringToServiceLine, setOfferingToServiceLine] = useState({});
  const [offersWithNewsButNoOpp, setOffersWithNewsButNoOpp] = useState([]);

  // État pour les contacts
  const [contacts, setContacts] = useState([]);

  // Récupération des données principales
  const data = useMemo(() => dataService.getData(), []);

  // Fusionner la matrice de pertinence des actualités
  const combinedRelevanceMatrix = useMemo(() => {
    return [...data.relevanceMatrix, ...rssRelevanceMatrix];
  }, [data.relevanceMatrix, rssRelevanceMatrix]);

  // Détecter le scroll pour changer le style de la navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Focus sur le champ de recherche lorsqu'il est affiché
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  /**
   * Extrait l'année d'une date au format "DD/MM/YYYY"
   * @param {string} dateStr - Date au format DD/MM/YYYY
   * @returns {string|null} L'année extraite ou null
   */
  const extractYear = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    return parts.length === 3 ? parts[2] : null;
  };

  /**
   * Parse une date au format français (DD Mmm. YYYY)
   * @param {string} dateString - Date au format DD Mmm. YYYY
   * @returns {Date} Objet Date
   */
  const parseCustomDate = (dateString) => {
    // Mapping des mois abrégés en français vers leurs indices (0-11)
    const monthMap = {
      "Janv.": 0,
      "Févr.": 1,
      Mars: 2,
      "Avr.": 3,
      Mai: 4,
      Juin: 5,
      "Juil.": 6,
      Août: 7,
      "Sept.": 8,
      "Oct.": 9,
      "Nov.": 10,
      "Déc.": 11,
    };

    // Découper la chaîne en composants
    const parts = dateString.split(" ");

    if (parts.length !== 3) {
      console.error(`Format de date non reconnu: ${dateString}`);
      return new Date(0); // Date par défaut en cas d'erreur
    }

    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1]];
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || month === undefined || isNaN(year)) {
      console.error(`Impossible de parser la date: ${dateString}`);
      return new Date(0); // Date par défaut en cas d'erreur
    }

    return new Date(year, month, day);
  };

  // Initialisation des données dérivées
  useEffect(() => {
    // Mapper les offres à leurs lignes de service
    const offeringToServiceLineMap = {};
    Object.entries(data.completeServiceLines).forEach(
      ([serviceLine, offerings]) => {
        offerings.forEach((offering) => {
          offeringToServiceLineMap[offering] = serviceLine;
        });
      }
    );
    setOfferingToServiceLine(offeringToServiceLineMap);

    // Mapper les opportunités par offre
    const oppByOffering = {};
    Object.values(data.completeServiceLines)
      .flat()
      .forEach((offering) => {
        oppByOffering[offering] = [];
      });

    data.rawOpportunities.forEach((opp) => {
      if (opp.serviceOffering) {
        if (!oppByOffering[opp.serviceOffering]) {
          oppByOffering[opp.serviceOffering] = [];
        }
        oppByOffering[opp.serviceOffering].push(opp);
      }
    });
    setOpportunitiesByOffering(oppByOffering);

    // Calculer les statistiques par offre
    const statsPerOffering = {};
    Object.entries(oppByOffering).forEach(([offering, opportunities]) => {
      const bookedOpps = opportunities.filter((opp) =>
        opp.status.includes("Booked")
      );
      const lostOpps = opportunities.filter((opp) =>
        opp.status.includes("Lost")
      );

      statsPerOffering[offering] = {
        totalOpportunities: opportunities.length,
        bookedOpportunities: bookedOpps.length,
        lostOpportunities: lostOpps.length,
        winRate:
          opportunities.length > 0
            ? ((bookedOpps.length / opportunities.length) * 100).toFixed(1)
            : "0.0",
        totalEstimatedValue: opportunities.reduce(
          (sum, opp) => sum + opp.estimatedValue,
          0
        ),
        totalBookedValue: bookedOpps.reduce(
          (sum, opp) => sum + opp.estimatedValue,
          0
        ),
      };
    });
    setOfferingStats(statsPerOffering);

    // Calculer les statistiques par ligne de service
    const statsPerServiceLine = {};
    Object.entries(offeringToServiceLineMap).forEach(
      ([offering, serviceLine]) => {
        if (!statsPerServiceLine[serviceLine]) {
          statsPerServiceLine[serviceLine] = {
            totalOpportunities: 0,
            bookedOpportunities: 0,
            lostOpportunities: 0,
            totalEstimatedValue: 0,
            totalBookedValue: 0,
            offerings: [],
          };
        }

        if (!statsPerServiceLine[serviceLine].offerings.includes(offering)) {
          statsPerServiceLine[serviceLine].offerings.push(offering);
        }

        if (statsPerOffering[offering]) {
          statsPerServiceLine[serviceLine].totalOpportunities +=
            statsPerOffering[offering].totalOpportunities;
          statsPerServiceLine[serviceLine].bookedOpportunities +=
            statsPerOffering[offering].bookedOpportunities;
          statsPerServiceLine[serviceLine].lostOpportunities +=
            statsPerOffering[offering].lostOpportunities;
          statsPerServiceLine[serviceLine].totalEstimatedValue +=
            statsPerOffering[offering].totalEstimatedValue;
          statsPerServiceLine[serviceLine].totalBookedValue +=
            statsPerOffering[offering].totalBookedValue;
        }
      }
    );
    setServiceLineStats(statsPerServiceLine);

    // Calculer les statistiques annuelles
    const statsByYear = {};
    data.rawOpportunities.forEach((opp) => {
      const year = extractYear(opp.closeDate);
      if (year) {
        if (!statsByYear[year]) {
          statsByYear[year] = {
            totalOpportunities: 0,
            bookedOpportunities: 0,
            totalValue: 0,
            bookedValue: 0,
          };
        }
        statsByYear[year].totalOpportunities++;
        statsByYear[year].totalValue += opp.estimatedValue;

        if (opp.status.includes("Booked")) {
          statsByYear[year].bookedOpportunities++;
          statsByYear[year].bookedValue += opp.estimatedValue;
        }
      }
    });
    setYearlyStats(statsByYear);

    // Identifier les offres mentionnées dans les actualités mais sans opportunités en cours
    const offersInNews = new Set();
    data.relevanceMatrix.forEach((item) => {
      const detailOfferings = item.offerDetail.split(", ");
      detailOfferings.forEach((detailOffer) => {
        Object.entries(data.completeServiceLines).forEach(([_, offerings]) => {
          offerings.forEach((offering) => {
            if (
              detailOffer.includes(offering) ||
              offering.includes(detailOffer)
            ) {
              offersInNews.add(offering);
            }
          });
        });
      });
    });

    const offersMissingOpps = Array.from(offersInNews).filter(
      (offer) => !oppByOffering[offer] || oppByOffering[offer].length === 0
    );
    setOffersWithNewsButNoOpp(offersMissingOpps);

    // Terminer le chargement
    setIsLoading(false);

    // Charger le flux RSS au démarrage
    fetchRssNews();
  }, [data]);

  // Dans src/App.js, modifier la fonction fetchRssNews pour intégrer l'analyse Claude

  const fetchRssNews = async () => {
    setIsLoadingRss(true);
    try {
      // Récupérer les actualités RSS avec l'analyse Claude
      const news = await rssFeedService.getAllNews();
      setRssNews(news);

      // Analyser la pertinence des actualités par rapport aux offres
      const relevanceMatrix = rssFeedService.analyzeNewsRelevance(
        news,
        data.completeServiceLines
      );
      setRssRelevanceMatrix(relevanceMatrix);

      // Mettre à jour la date de dernière mise à jour
      setLastRssUpdate(new Date());

      // Extraire les contacts des actualités en utilisant aussi ceux détectés par Claude
      const extractedContacts = contactService.extractContactsFromNews(news);
      setContacts(extractedContacts);

      // Afficher dans la console des informations sur l'analyse
      console.log(
        `Analyse RSS terminée: ${news.length} actualités récupérées et ${
          news.filter((item) => item.analyzed).length
        } analysées par IA`
      );
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des actualités RSS:",
        error
      );
    } finally {
      setIsLoadingRss(false);
    }
  };
  // Filtrer la matrice par offre, terme de recherche et score de pertinence
  const filteredMatrix = useMemo(() => {
    return combinedRelevanceMatrix.filter((item) => {
      // Filtre par offre
      const matchesOffer =
        selectedOffer === "all" || item.offerCategory === selectedOffer;

      // Filtre par terme de recherche
      const matchesSearch =
        !searchTerm ||
        item.news.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.newsCategory &&
          item.newsCategory.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.offerDetail &&
          item.offerDetail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.newsDescription &&
          item.newsDescription
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));

      // Filtre par score de pertinence
      const matchesRelevance = item.relevanceScore >= relevanceFilter;

      // Filtre par source (RSS uniquement ou toutes les sources)
      const matchesSource = !showRssOnly || item.newsLink;

      return matchesOffer && matchesSearch && matchesRelevance && matchesSource;
    });
  }, [
    combinedRelevanceMatrix,
    selectedOffer,
    searchTerm,
    relevanceFilter,
    showRssOnly,
  ]);

  // Grouper les résultats par actualité
  const groupedByNews = useMemo(() => {
    const grouped = {};
    filteredMatrix.forEach((item) => {
      if (!grouped[item.news]) {
        grouped[item.news] = {
          news: item.news,
          newsDate: item.newsDate,
          newsCategory: item.newsCategory || "Actualité",
          newsDescription: item.newsDescription || "",
          newsLink: item.newsLink || "",
          isRss: item.newsLink ? true : false, // Si un lien existe, c'est une actualité RSS
          offers: [],
          // Ajouter un objet Date pour faciliter le tri
          dateObj: parseCustomDate(item.newsDate),
        };
      }

      grouped[item.news].offers.push({
        category: item.offerCategory,
        detail: item.offerDetail,
        relevanceScore: item.relevanceScore,
        hasOpportunities: Array.from(item.offerDetail.split(", ")).some(
          (detail) =>
            Object.keys(opportunitiesByOffering).some(
              (key) =>
                (detail.includes(key) || key.includes(detail)) &&
                opportunitiesByOffering[key].length > 0
            )
        ),
      });
    });
    return grouped;
  }, [filteredMatrix, opportunitiesByOffering]);

  // Filtrer les opportunités par année
  const filteredOpportunities = (opportunities) => {
    if (yearFilter === "all") return opportunities;
    return opportunities.filter((opp) => {
      const year = extractYear(opp.closeDate);
      return year === yearFilter;
    });
  };

  // Trier les opportunités
  const sortOpportunities = (opportunities) => {
    return [...opportunities].sort((a, b) => {
      let valueA, valueB;

      if (sortBy === "date") {
        valueA = a.closeDate ? a.closeDate.split("/").reverse().join("") : "";
        valueB = b.closeDate ? b.closeDate.split("/").reverse().join("") : "";
      } else if (sortBy === "value") {
        valueA = a.estimatedValue;
        valueB = b.estimatedValue;
      } else if (sortBy === "name") {
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
      } else if (sortBy === "cm1") {
        valueA = parseFloat(a.cm1?.replace(",", ".")) || 0;
        valueB = parseFloat(b.cm1?.replace(",", ".")) || 0;
      }

      if (sortOrder === "asc") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  };

  // Fermer le menu et la recherche quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest(".premium-menu-container")) {
        setShowMenu(false);
      }
      if (
        showSearch &&
        !event.target.closest(".search-container") &&
        !event.target.closest(".search-toggle")
      ) {
        setShowSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu, showSearch]);

  // Si chargement en cours
  if (isLoading) {
    return (
      <div className="premium-loading">
        <div className="premium-spinner"></div>
        <div className="premium-loading-text">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="premium-app">
      {/* Navigation principale */}
      <nav className={`premium-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="premium-navbar-container">
          <div className="premium-navbar-brand">
            <div className="premium-logo">
              <svg
                width="20"
                height="20"
                viewBox="0 0 80 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M40 0C17.909 0 0 17.909 0 40C0 62.091 17.909 80 40 80C62.091 80 80 62.091 80 40C80 17.909 62.091 0 40 0ZM40 3.846C60 3.846 76.154 20 76.154 40C76.154 60 60 76.154 40 76.154C20 76.154 3.846 60 3.846 40C3.846 20 20 3.846 40 3.846Z"
                  fill="currentColor"
                />
                <path
                  d="M40 17.778C37.7908 17.778 36 19.5688 36 21.778V50.578L26.3234 40.9014C24.7658 39.3438 22.2342 39.3438 20.6766 40.9014C19.119 42.459 19.119 44.9906 20.6766 46.5482L37.1766 62.988C38.7342 64.5456 41.2658 64.5456 42.8234 62.988L59.2828 46.5482C60.8404 44.9906 60.8404 42.459 59.2828 40.9014C57.7252 39.3438 55.1936 39.3438 53.636 40.9014L44 50.578V21.778C44 19.5688 42.2092 17.778 40 17.778Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="premium-brand-name">BearingPoint</span>
          </div>

          <div className="premium-navbar-menu">
            <button
              className={`premium-nav-link ${
                activeTab === "actualites" ? "active" : ""
              }`}
              onClick={() => setActiveTab("actualites")}
            >
              Actualités
            </button>
            <button
              className={`premium-nav-link ${
                activeTab === "servicelines" ? "active" : ""
              }`}
              onClick={() => setActiveTab("servicelines")}
            >
              Service Lines
            </button>
            <button
              className={`premium-nav-link ${
                activeTab === "contacts" ? "active" : ""
              }`}
              onClick={() => setActiveTab("contacts")}
            >
              Contacts
            </button>
          </div>

          <div className="premium-navbar-actions">
            {/* Bouton de recherche */}
            <button
              className={`premium-action-button search-toggle ${
                showSearch ? "active" : ""
              }`}
              onClick={() => {
                setShowSearch(!showSearch);
                if (showMenu) setShowMenu(false);
              }}
              title="Rechercher"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 21L16.65 16.65"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Bouton de rafraîchissement des actualités RSS */}
            <button
              className={`premium-action-button ${
                isLoadingRss ? "active" : ""
              }`}
              onClick={fetchRssNews}
              disabled={isLoadingRss}
              title="Rafraîchir les actualités"
            >
              {isLoadingRss ? (
                <LoadingSpinner size="small" />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M23 4V10H17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M1 20V14H7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.51 9.00001C4.01717 7.56586 4.87913 6.2899 6.01547 5.27495C7.1518 4.26 8.52547 3.54233 10.0083 3.1851C11.4911 2.82788 13.0348 2.84181 14.5091 3.22531C15.9834 3.6088 17.3421 4.34536 18.456 5.38801L23 10M1 14L5.544 18.612C6.65794 19.6547 8.01658 20.3912 9.49087 20.7747C10.9652 21.1582 12.5089 21.1721 13.9917 20.8149C15.4745 20.4577 16.8482 19.74 17.9845 18.7251C19.1209 17.7101 19.9828 16.4342 20.49 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            {/* Bouton de menu */}
            <button
              className={`premium-action-button ${showMenu ? "active" : ""}`}
              onClick={() => {
                setShowMenu(!showMenu);
                if (showSearch) setShowSearch(false);
              }}
              title="Menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 12H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 6H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 18H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Barre de recherche */}
          {showSearch && (
            <div className="search-container">
              <div className="search-input-wrapper">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="premium-search-input"
                />
                {searchTerm && (
                  <button
                    className="search-clear-button"
                    onClick={() => setSearchTerm("")}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6 6L18 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Menu déroulant */}
          {showMenu && (
            <div className="premium-menu-container">
              <div className="premium-menu">
                <div className="premium-menu-section">
                  <h3 className="premium-menu-title">Filtres</h3>

                  <div className="premium-menu-group">
                    <span className="premium-menu-label">Ligne de service</span>
                    <div className="premium-menu-items">
                      <button
                        onClick={() => {
                          setSelectedOffer("all");
                          setShowMenu(false);
                        }}
                        className={selectedOffer === "all" ? "active" : ""}
                      >
                        Toutes les offres
                      </button>
                      {Object.keys(serviceLineStats).map((serviceLine) => (
                        <button
                          key={serviceLine}
                          onClick={() => {
                            setSelectedOffer(serviceLine);
                            setShowMenu(false);
                          }}
                          className={
                            selectedOffer === serviceLine ? "active" : ""
                          }
                        >
                          {serviceLine}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="premium-menu-group">
                    <span className="premium-menu-label">Actualités</span>
                    <div className="premium-menu-items">
                      <button
                        onClick={() => {
                          setShowRssOnly(false);
                          setShowMenu(false);
                        }}
                        className={!showRssOnly ? "active" : ""}
                      >
                        Toutes les actualités
                      </button>
                      <button
                        onClick={() => {
                          setShowRssOnly(true);
                          setShowMenu(false);
                        }}
                        className={showRssOnly ? "active" : ""}
                      >
                        Actualités RSS seulement
                      </button>
                    </div>
                  </div>

                  <div className="premium-menu-group">
                    <span className="premium-menu-label">
                      Score de pertinence
                    </span>
                    <div className="premium-menu-items">
                      <button
                        onClick={() => {
                          setRelevanceFilter(0);
                          setShowMenu(false);
                        }}
                        className={relevanceFilter === 0 ? "active" : ""}
                      >
                        Tous les scores
                      </button>
                      <button
                        onClick={() => {
                          setRelevanceFilter(1);
                          setShowMenu(false);
                        }}
                        className={relevanceFilter === 1 ? "active" : ""}
                      >
                        1 et plus
                      </button>
                      <button
                        onClick={() => {
                          setRelevanceFilter(2);
                          setShowMenu(false);
                        }}
                        className={relevanceFilter === 2 ? "active" : ""}
                      >
                        2 et plus
                      </button>
                      <button
                        onClick={() => {
                          setRelevanceFilter(3);
                          setShowMenu(false);
                        }}
                        className={relevanceFilter === 3 ? "active" : ""}
                      >
                        3 seulement
                      </button>
                    </div>
                  </div>

                  <div className="premium-menu-group">
                    <span className="premium-menu-label">Années</span>
                    <div className="premium-menu-items">
                      <button
                        onClick={() => {
                          setYearFilter("all");
                          setShowMenu(false);
                        }}
                        className={yearFilter === "all" ? "active" : ""}
                      >
                        Toutes les années
                      </button>
                      {Object.keys(yearlyStats)
                        .sort((a, b) => parseInt(b) - parseInt(a))
                        .map((year) => (
                          <button
                            key={year}
                            onClick={() => {
                              setYearFilter(year);
                              setShowMenu(false);
                            }}
                            className={yearFilter === year ? "active" : ""}
                          >
                            {year}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="premium-menu-section">
                  <h3 className="premium-menu-title">Légende</h3>
                  <div className="premium-menu-relevance">
                    <div className="premium-relevance-item">
                      <div className="premium-relevance-badge relevance-3">
                        3
                      </div>
                      <span>Très pertinent</span>
                    </div>
                    <div className="premium-relevance-item">
                      <div className="premium-relevance-badge relevance-2">
                        2
                      </div>
                      <span>Pertinent</span>
                    </div>
                    <div className="premium-relevance-item">
                      <div className="premium-relevance-badge relevance-1">
                        1
                      </div>
                      <span>Légèrement pertinent</span>
                    </div>
                  </div>

                  {lastRssUpdate && (
                    <div className="premium-rss-info">
                      <h3 className="premium-menu-title">Actualités RSS</h3>
                      <p className="premium-rss-update">
                        Dernière mise à jour: {lastRssUpdate.toLocaleString()}
                      </p>
                      <p className="premium-rss-count">
                        {rssNews.length} actualités chargées
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="premium-main">
        <div className="premium-banner">
          <div className="premium-banner-content">
            <h1>Suivi de compte</h1>
            <p className="premium-banner-subtitle">
              Analyse de l'adéquation entre actualités et offres
            </p>
          </div>
        </div>

        <div className="premium-container">
          {/* SUPPRIMÉ: La section premium-filters est retirée d'ici pour éviter la duplication */}

          {/* Résultats de recherche */}
          {searchTerm && (
            <div className="premium-search-results">
              <div className="premium-search-term">
                <span>Recherche: </span>
                <strong>{searchTerm}</strong>
                <button
                  className="premium-clear-search"
                  onClick={() => setSearchTerm("")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Contenu principal selon l'onglet actif */}
          <div className="premium-content">
            {activeTab === "actualites" && (
              <MatrixTabContent
                groupedByNews={groupedByNews}
                offersWithNewsButNoOpp={offersWithNewsButNoOpp}
                offeringToServiceLine={offeringToServiceLine}
                isLoadingRss={isLoadingRss}
                fetchRssNews={fetchRssNews}
                serviceLineStats={serviceLineStats}
                selectedOffer={selectedOffer}
                setSelectedOffer={setSelectedOffer}
                relevanceFilter={relevanceFilter}
                setRelevanceFilter={setRelevanceFilter}
                showRssOnly={showRssOnly}
                setShowRssOnly={setShowRssOnly}
                contacts={contacts} // Ajout des contacts
              />
            )}

            {activeTab === "servicelines" && (
              <ServiceLineTabContent
                data={data}
                combinedRelevanceMatrix={combinedRelevanceMatrix}
                selectedOffer={selectedOffer}
                setSelectedOffer={setSelectedOffer}
                relevanceFilter={relevanceFilter}
                opportunitiesByOffering={opportunitiesByOffering}
                contacts={contacts} // Ajout des contacts
              />
            )}

            {activeTab === "contacts" && (
              <ContactTabContent
                combinedRelevanceMatrix={combinedRelevanceMatrix}
                data={data}
                isLoadingRss={isLoadingRss}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="premium-footer">
        <div className="premium-footer-content">
          <p>
            Analyse basée sur les offres BearingPoint, les actualités Schneider
            Electric et les opportunités depuis 2018
          </p>
          {lastRssUpdate && (
            <p>
              Dernière mise à jour des actualités RSS:{" "}
              {lastRssUpdate.toLocaleString()}
            </p>
          )}
          <p className="premium-version">
            Version 6.0 - Dernière mise à jour: 15/04/2025
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
