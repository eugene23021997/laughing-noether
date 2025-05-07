import * as React from "react";
const { useState, useCallback, useMemo } = React;
import NewsCard from "./NewsCard";
import LoadingSpinner from "./LoadingSpinner";
import { WarningIcon } from "./Icons";

/**
 * Composant pour afficher l'onglet Actualités contenant les actualités et leur pertinence
 * Modifié pour utiliser le système de fenêtre modale au lieu des dépliants synchronisés
 *
 * @param {Object} props - Les propriétés du composant
 * @param {Object} props.groupedByNews - Actualités groupées par titre
 * @param {Array} props.offersWithNewsButNoOpp - Offres mentionnées sans opportunités
 * @param {Object} props.offeringToServiceLine - Mapping des offres aux lignes de service
 * @param {boolean} props.isLoadingRss - Indicateur de chargement des flux RSS
 * @param {function} props.fetchRssNews - Fonction pour rafraîchir les flux RSS
 * @param {Object} props.serviceLineStats - Statistiques par ligne de service
 * @param {string} props.selectedOffer - Offre sélectionnée
 * @param {function} props.setSelectedOffer - Fonction pour définir l'offre sélectionnée
 * @param {number} props.relevanceFilter - Filtre de pertinence
 * @param {function} props.setRelevanceFilter - Fonction pour définir le filtre de pertinence
 * @param {boolean} props.showRssOnly - Afficher seulement les actualités RSS
 * @param {function} props.setShowRssOnly - Fonction pour définir l'affichage RSS uniquement
 * @param {Array} props.contacts - Liste des contacts disponibles pour les opportunités
 * @returns {JSX.Element} Contenu de l'onglet Actualités
 */
const MatrixTabContent = ({
  groupedByNews,
  offersWithNewsButNoOpp,
  offeringToServiceLine,
  isLoadingRss,
  fetchRssNews,
  serviceLineStats = {},
  selectedOffer = "all",
  setSelectedOffer = () => {},
  relevanceFilter = 0,
  setRelevanceFilter = () => {},
  showRssOnly = false,
  setShowRssOnly = () => {},
  contacts = [],
}) => {
  // État pour le filtre des opportunités de prospection
  const [showOnlyHighPotential, setShowOnlyHighPotential] = useState(false);

  // Convertir l'objet groupedByNews en tableau pour pouvoir le trier
  const newsArray = Object.values(groupedByNews);

  // Identifier les actualités avec opportunités de prospection
  const hasHighPotential = (news) => {
    return (
      news.offers &&
      news.offers.some(
        (offer) => offer.relevanceScore === 3 && !offer.hasOpportunities
      )
    );
  };

  // Filtrer et trier les actualités
  const filteredAndSortedNews = useMemo(() => {
    // Appliquer d'abord le filtre d'opportunités si activé
    let filtered = [...newsArray];
    if (showOnlyHighPotential) {
      filtered = filtered.filter(hasHighPotential);
    }

    // Puis trier par date (des plus récentes aux plus anciennes)
    return filtered.sort((a, b) => {
      const dateA = a.dateObj || new Date(a.newsDate);
      const dateB = b.dateObj || new Date(b.newsDate);
      return dateB - dateA; // Ordre chronologique inversé
    });
  }, [newsArray, showOnlyHighPotential]);

  return (
    <>
      {/* Afficher un overlay de chargement pendant la mise à jour des flux RSS */}
      {isLoadingRss && (
        <div className="premium-loading-overlay">
          <LoadingSpinner size="large" color="primary" />
          <p>Mise à jour des actualités en cours...</p>
        </div>
      )}

      {/* Section des filtres avec sélecteurs et bandeau d'opportunités */}
      <div className="premium-filters">
        <div className="premium-filter-controls">
          {/* Sélecteur de ligne de service */}
          <div className="premium-selector">
            <label htmlFor="serviceLineSelect">Ligne de service:</label>
            <select
              id="serviceLineSelect"
              value={selectedOffer}
              onChange={(e) => setSelectedOffer(e.target.value)}
              className="premium-select"
            >
              <option value="all">Toutes les offres</option>
              {Object.keys(serviceLineStats).map((serviceLine) => (
                <option key={serviceLine} value={serviceLine}>
                  {serviceLine}
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de pertinence minimum */}
          <div className="premium-selector">
            <label htmlFor="relevanceSelect">Pertinence minimum:</label>
            <select
              id="relevanceSelect"
              value={relevanceFilter}
              onChange={(e) => setRelevanceFilter(parseInt(e.target.value))}
              className="premium-select"
            >
              <option value="0">Tous les scores</option>
              <option value="1">1 et plus</option>
              <option value="2">2 et plus</option>
              <option value="3">3 seulement</option>
            </select>
          </div>

          {/* Sélecteur de filtrage de type d'actualités (remplace Source/Opportunités) */}
          <div className="premium-selector">
            <label htmlFor="opportunityFilter">Type d'actualités:</label>
            <select
              id="opportunityFilter"
              value={showOnlyHighPotential ? "opportunity" : "all"}
              onChange={(e) =>
                setShowOnlyHighPotential(e.target.value === "opportunity")
              }
              className="premium-select"
            >
              <option value="all">Toutes</option>
              <option value="opportunity">Prospection uniquement</option>
            </select>
          </div>

          {/* Bouton de rafraîchissement des actualités RSS */}
          <div className="premium-selector">
            <label htmlFor="refreshRss">Actualités RSS:</label>
            <button
              id="refreshRss"
              className="premium-button"
              onClick={fetchRssNews}
              disabled={isLoadingRss}
            >
              {isLoadingRss ? (
                <>
                  <LoadingSpinner size="small" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ marginRight: "8px" }}
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
                  Rafraîchir
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bannière info quand filtre d'opportunité est actif */}
        {showOnlyHighPotential && (
          <div
            className="premium-opportunity-banner"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              backgroundColor: "rgba(236, 72, 153, 0.08)",
              border: "1px solid rgba(236, 72, 153, 0.2)",
              borderRadius: "var(--border-radius)",
              color: "#ec4899",
              marginTop: "12px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 16L16 11H13V8L9 13H12V16Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              Affichage des actualités avec opportunités de prospection
              uniquement
            </span>
            <button
              onClick={() => setShowOnlyHighPotential(false)}
              style={{
                background: "none",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                color: "#ec4899",
                cursor: "pointer",
                marginLeft: "auto",
              }}
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
        )}
      </div>

      {/* Grille d'actualités */}
      <div className="premium-news-grid">
        {filteredAndSortedNews.length > 0 ? (
          filteredAndSortedNews.map((news, index) => (
            <NewsCard key={index} news={news} contacts={contacts} />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 8v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 16h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="empty-state-text">
              Aucune actualité ne correspond à vos critères de recherche.
              <br />
              <small>
                Essayez de modifier vos filtres ou de rafraîchir les actualités.
              </small>
            </div>
          </div>
        )}
      </div>

      {/* Section d'avertissement pour les offres mentionnées mais sans opportunités */}
      {offersWithNewsButNoOpp.length > 0 && (
        <div className="premium-warning-section">
          <h2 className="premium-section-title">
            Offres mentionnées dans les actualités sans opportunités en cours
          </h2>
          <div className="premium-warning-grid">
            {offersWithNewsButNoOpp.map((offer, index) => (
              <div key={index} className="premium-warning-item">
                <div className="premium-warning-content">
                  <div className="premium-warning-icon">
                    <WarningIcon />
                  </div>
                  <div className="premium-warning-text">
                    <strong>{offer}</strong>
                    <span className="premium-warning-subtext">
                      {offeringToServiceLine[offer]
                        ? `Ligne de service: ${offeringToServiceLine[offer]}`
                        : "Aucune ligne de service associée"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style pour la grille d'actualités responsive */}
      <style jsx>{`
        @media (min-width: 768px) and (max-width: 1279px) {
          .premium-news-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1280px) {
          .premium-news-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .premium-news-grid {
          display: grid;
          gap: 24px;
          margin-bottom: 32px;
        }
      `}</style>
    </>
  );
};

export default MatrixTabContent;
