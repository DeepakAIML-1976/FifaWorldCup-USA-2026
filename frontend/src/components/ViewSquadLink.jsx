export const SQUAD_LIST_URL = "https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf";

export function ViewSquadLink({ className = "", testId = "view-squad-link" }) {
  return (
    <a
      href={SQUAD_LIST_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-[#007AFF] hover:text-[#3395FF] transition-colors ${className}`}
    >
      View Squad
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 17L17 7M17 7H8M17 7v9" />
      </svg>
    </a>
  );
}
