import { useEffect, useState } from 'react';
import type { RelatedDocument } from '../api/client';

// Related documents for the selected document, refetched whenever it changes.
export function useRelatedDocuments(
  documentId: string | undefined,
  fetchRelated: (documentId: string) => Promise<RelatedDocument[]>,
): { related: RelatedDocument[]; loading: boolean } {
  const [related, setRelated] = useState<RelatedDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRelated([]);
    if (!documentId) {
      setLoading(false);
      return;
    }
    // Ignore the response if another document was selected before it arrived.
    let stale = false;
    setLoading(true);
    fetchRelated(documentId)
      .then(result => {
        if (!stale) setRelated(result);
      })
      .catch(error => console.error('Failed to load related documents:', error))
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [documentId, fetchRelated]);

  return { related, loading };
}
