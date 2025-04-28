import React from "react";

/**
 * Composant de spinner de chargement personnalisé
 * @param {Object} props - Les propriétés du composant
 * @param {string} [props.size='medium'] - La taille du spinner ('small', 'medium', 'large')
 * @param {string} [props.color='primary'] - La couleur du spinner ('primary', 'secondary', 'white')
 * @returns {JSX.Element} Le composant de spinner
 */
const LoadingSpinner = ({ size = "medium", color = "primary" }) => {
  // Tailles prédéfinies
  const sizes = {
    small: {
      width: "16px",
      height: "16px",
      borderWidth: "2px",
    },
    medium: {
      width: "24px",
      height: "24px",
      borderWidth: "3px",
    },
    large: {
      width: "40px",
      height: "40px",
      borderWidth: "4px",
    },
  };

  // Couleurs prédéfinies
  const colors = {
    primary: {
      border: "rgba(0, 113, 243, 0.1)",
      borderTop: "var(--primary, #0071f3)",
    },
    secondary: {
      border: "rgba(109, 40, 217, 0.1)",
      borderTop: "var(--secondary, #6d28d9)",
    },
    white: {
      border: "rgba(255, 255, 255, 0.2)",
      borderTop: "rgba(255, 255, 255, 0.8)",
    },
  };

  // Style du spinner
  const spinnerStyle = {
    display: "inline-block",
    width: sizes[size].width,
    height: sizes[size].height,
    border: `${sizes[size].borderWidth} solid ${colors[color].border}`,
    borderTop: `${sizes[size].borderWidth} solid ${colors[color].borderTop}`,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  return <div style={spinnerStyle} aria-label="Chargement" />;
};

export default LoadingSpinner;
