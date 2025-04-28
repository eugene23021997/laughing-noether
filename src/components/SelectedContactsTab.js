import React, { useState, useMemo, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

const RecommendedContactCard = ({ contact, opportunity }) => {
  const getRelevanceColor = (score) => {
    if (score > 0.8) return "bg-green-500";
    if (score > 0.6) return "bg-blue-500";
    if (score > 0.4) return "bg-yellow-500";
    return "bg-gray-500";
  };

  const getRelevanceLabel = (score) => {
    if (score > 0.8) return "Très élevée";
    if (score > 0.6) return "Élevée";
    if (score > 0.4) return "Moyenne";
    return "Faible";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-100 hover:shadow-lg transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
            {contact.fullName ? contact.fullName.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {contact.fullName || "Contact anonyme"}
            </h3>
            <p className="text-sm text-gray-500">
              {contact.role || "Rôle non spécifié"}
            </p>
          </div>
        </div>
        <div
          className={`px-3 py-1 text-xs text-white rounded-full ${getRelevanceColor(
            contact.relevanceScore
          )}`}
        >
          {Math.round(contact.relevanceScore * 100)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
        {contact.email && (
          <div className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span>{contact.phone}</span>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500">
            Opportunité liée
          </span>
          <span className="text-sm font-semibold text-gray-700">
            {opportunity.detail}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">Pertinence</span>
          <div className="w-full bg-gray-200 rounded-full h-2 ml-2">
            <div
              className={`h-2 rounded-full ${getRelevanceColor(
                contact.relevanceScore
              )}`}
              style={{ width: `${contact.relevanceScore * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex space-x-2">
        <a
          href={`mailto:${contact.email}`}
          className="flex-1 text-center bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Contacter
        </a>
        <a
          href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
            contact.fullName
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center bg-gray-50 text-gray-600 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          LinkedIn
        </a>
      </div>
    </motion.div>
  );
};

const SelectedContactsTab = ({
  contacts = [],
  selectedOpportunities = [],
  isLoading = false,
}) => {
  // Existant : conserver la logique de filtrage et calcul des contacts

  // Composant de rendu avec une mise en page plus moderne et informative
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" />
        </div>
      ) : selectedOpportunities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-64 text-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            Aucune opportunité sélectionnée
          </h2>
          <p className="text-gray-500">
            Sélectionnez des opportunités de prospection dans les onglets
            Actualités ou Service Lines.
          </p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedOpportunities.map((opportunity, index) => (
            <div key={index} className="space-y-4">
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100 mb-2">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  {opportunity.detail}
                </h2>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {opportunity.category}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      opportunity.relevanceScore === 3
                        ? "bg-green-100 text-green-800"
                        : opportunity.relevanceScore === 2
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    Pertinence {opportunity.relevanceScore}
                  </span>
                </div>
              </div>

              {contacts
                .filter(
                  (contact) =>
                    contact.relatedOffers &&
                    contact.relatedOffers.some((offer) =>
                      offer
                        .toLowerCase()
                        .includes(opportunity.detail.toLowerCase())
                    )
                )
                .map((contact, contactIndex) => (
                  <RecommendedContactCard
                    key={contactIndex}
                    contact={contact}
                    opportunity={opportunity}
                  />
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectedContactsTab;
