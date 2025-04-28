import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
// Modification du chemin d'import pour les styles
import "./styles/main.css";

/**
 * Point d'entrée de l'application
 * Rend le composant App dans l'élément racine
 */
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
