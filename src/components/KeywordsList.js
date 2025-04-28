import React from "react";

/**
 * Composant pour afficher une liste de mots-clés sous forme de badges/pills
 * @param {Object} props - Les propriétés du composant
 * @param {Array|string} props.keywords - Liste de mots-clés ou chaîne séparée par des virgules
 * @param {number} [props.maxDisplay=5] - Nombre maximum de mots-clés à afficher
 * @param {boolean} [props.withDots=false] - Utiliser des points comme séparateurs
 * @returns {JSX.Element|null} Liste de mots-clés ou null si aucun mot-clé
 */
const KeywordsList = ({ keywords, maxDisplay = 5, withDots = false }) => {
  // Si aucun mot-clé n'est fourni ou si c'est une chaîne vide
  if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
    return null;
  }

  // Si c'est une chaîne, la diviser en tableau
  const keywordsArray =
    typeof keywords === "string"
      ? keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k)
          .slice(0, maxDisplay)
      : keywords.slice(0, maxDisplay);

  // Si plus de mots-clés que le maximum, indiquer avec un "..."
  const hasMoreKeywords =
    typeof keywords === "string"
      ? keywords.split(",").filter((k) => k.trim()).length > maxDisplay
      : keywords.length > maxDisplay;

  return (
    <div className="premium-keywords-container">
      {keywordsArray.map((keyword, index) => (
        <span key={index} className="premium-keyword-badge">
          {keyword}
        </span>
      ))}
      {hasMoreKeywords && <span className="premium-keyword-more">+</span>}
    </div>
  );
};

export default KeywordsList;
