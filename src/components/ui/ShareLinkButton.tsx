/**
 * Copy a shareable link to the current configuration. Lives in the Left Rail under the
 * Height Range card. The URL hash always reflects the current view (see useShareUrl), so
 * this just copies window.location.href.
 */
import { useRef, useState } from 'react';

export function ShareLinkButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (e.g. insecure context) — no-op; the URL is still shareable.
    }
  };

  return (
    <button type="button" className="share-link" onClick={copyLink} title="Copy a shareable link to this configuration">
      {copied ? '✓ Link copied' : '🔗 Copy shareable link'}
    </button>
  );
}
