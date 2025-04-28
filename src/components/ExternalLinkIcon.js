// Dans src/components/Icons.js

export const ExternalLinkIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5" // Trait plus fin
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    width="9" // Taille plus petite
    height="9" // Taille plus petite
  >
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14L21 3" />
  </svg>
);
