import { useState } from "react";
import { Twitter, Facebook, Instagram, Link as LinkIcon, Check } from "lucide-react";

const FRONTEND_URL = typeof window !== "undefined" ? window.location.origin : "";

export default function ShareButtons({ text, url = FRONTEND_URL, testIdPrefix = "share", className = "" }) {
  const [copied, setCopied] = useState(false);
  const [insta, setInsta] = useState(false);

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function copyForInstagram() {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setInsta(true);
      setTimeout(() => setInsta(false), 2200);
    } catch {}
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid={`${testIdPrefix}-row`}>
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 mr-1">Share</span>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${testIdPrefix}-twitter`}
        className="h-8 w-8 inline-flex items-center justify-center border border-white/15 hover:border-[#1DA1F2] hover:text-[#1DA1F2] text-white/60 transition-colors"
        aria-label="Share on Twitter"
        title="Share on X / Twitter"
      >
        <Twitter className="h-3.5 w-3.5" />
      </a>
      <a
        href={fbUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${testIdPrefix}-facebook`}
        className="h-8 w-8 inline-flex items-center justify-center border border-white/15 hover:border-[#1877F2] hover:text-[#1877F2] text-white/60 transition-colors"
        aria-label="Share on Facebook"
        title="Share on Facebook"
      >
        <Facebook className="h-3.5 w-3.5" />
      </a>
      <button
        onClick={copyForInstagram}
        data-testid={`${testIdPrefix}-instagram`}
        className="h-8 w-8 inline-flex items-center justify-center border border-white/15 hover:border-[#E1306C] hover:text-[#E1306C] text-white/60 transition-colors"
        aria-label="Copy for Instagram"
        title="Copy text & link for Instagram"
      >
        {insta ? <Check className="h-3.5 w-3.5 text-[#34C759]" /> : <Instagram className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={copyLink}
        data-testid={`${testIdPrefix}-copy`}
        className="h-8 w-8 inline-flex items-center justify-center border border-white/15 hover:border-white text-white/60 hover:text-white transition-colors"
        aria-label="Copy link"
        title="Copy link"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[#34C759]" /> : <LinkIcon className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
