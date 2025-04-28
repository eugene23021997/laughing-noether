import React from "react";
import NewsCard from "./NewsCard";
import LoadingSpinner from "./LoadingSpinner";
import { WarningIcon } from "./Icons";

/**
 * Composant pour afficher l'onglet Actualités contenant les actualités et leur pertinence
 * @param {Object} props - Les propriétés du composant
 * @param {Object} props.groupedByNews - Actualités groupées par titre
 * @param {Array} props.offersWithNewsButNoOpp - Offres mentionnées sans opportunités
 * @param {Object} props.offeringToServiceLine - Mapping des offres aux lignes de service
 * @param {boolean} props.isLoadingRss - Indicateur de chargement des flux RSS
 * @returns {JSX.Element} Contenu de l'onglet Actualités
 */
const MatrixTabContent = ({
  groupedByNews,
  offersWithNewsButNoOpp,
  offeringToServiceLine,
  isLoadingRss,
}) => {
  // Convertir l'objet groupedByNews en tableau pour pouvoir le trier
  const newsArray = Object.values(groupedByNews);

  /**
   * Fonction utilitaire pour parser une date au format "DD Mmm. YYYY"
   * @param {string} dateString - La date au format "DD Mmm. YYYY"
   * @returns {Date} Objet Date correspondant
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

  // Trier les actualités par date (des plus récentes aux plus anciennes)
  const sortedNews = [...newsArray].sort((a, b) => {
    // Utiliser notre fonction de parsing personnalisée pour traiter les dates
    const dateA = a.dateObj || parseCustomDate(a.newsDate);
    const dateB = b.dateObj || parseCustomDate(b.newsDate);
    return dateB - dateA; // Ordre chronologique inversé
  });

  return (
    <>
      {/* Afficher un overlay de chargement pendant la mise à jour des flux RSS */}
      {isLoadingRss && (
        <div className="premium-loading-overlay">
          <LoadingSpinner size="large" color="primary" />
          <p>Mise à jour des actualités en cours...</p>
        </div>
      )}

      {/* Grille d'actualités */}
      <div className="premium-news-grid">
        {sortedNews.length > 0 ? (
          sortedNews.map((news, index) => <NewsCard key={index} news={news} />)
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
    </>
  );
};

export default MatrixTabContent;
