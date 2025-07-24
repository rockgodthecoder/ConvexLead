import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { v4 as uuidv4 } from "uuid";
import { Id } from "../../convex/_generated/dataModel";

function getOrCreateBrowserId(): string {
  let id = localStorage.getItem("browserId");
  if (!id) {
    id = uuidv4();
    localStorage.setItem("browserId", id);
  }
  return id;
}

/**
 * useJourneyTracking hook
 * @param documentId Convex Id<'leadMagnets'>
 * @param documentTitle Optional document title
 * @param pageName Optional page name
 * @param userId Optional user id
 * @param utmSource, utmMedium, utmCampaign, utmTerm, utmContent Optional UTM params
 */
export function useJourneyTracking({
  documentId,
  documentTitle,
  pageName,
  userId,
  email,
  utmSource,
  utmMedium,
  utmCampaign,
  utmTerm,
  utmContent,
}: {
  documentId: Id<"leadMagnets">;
  documentTitle?: string;
  pageName?: string;
  userId?: string;
  email?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}) {
  const recordJourneySession = useMutation(api.analytics.recordJourneySession);
  const previousPathRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const browserId = getOrCreateBrowserId();
    const sessionId = uuidv4();
    const startTime = Date.now();
    const previousPage = previousPathRef.current;
    previousPathRef.current = window.location.pathname;

    function sendSession() {
      const endTime = Date.now();
      recordJourneySession({
        browserId,
        sessionId,
        userId,
        documentId,
        documentTitle,
        pageName,
        pathname: window.location.pathname,
        referrer: document.referrer || undefined,
        previousPage: previousPage || undefined,
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        startTime,
        endTime,
        duration: Math.round((endTime - startTime) / 1000),
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        email,
      });
    }

    window.addEventListener("beforeunload", sendSession);
    return () => {
      sendSession();
      window.removeEventListener("beforeunload", sendSession);
    };
    // eslint-disable-next-line
  }, [documentId, documentTitle, pageName, userId, email, utmSource, utmMedium, utmCampaign, utmTerm, utmContent]);
} 