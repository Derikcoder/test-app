import { useCallback, useState } from 'react';
import api from '../api/axios';

/**
 * Shared quotation action state and handlers for customer profile pages.
 */
const useQuotationActions = (setQuotations) => {
  const [quotActionState, setQuotActionState] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleAcceptQuot = useCallback(async (quotation) => {
    setQuotActionState((prev) => ({ ...prev, [quotation._id]: 'loading' }));

    try {
      await api.patch(`/quotations/share/${quotation.shareToken}/accept`);
      setQuotActionState((prev) => ({ ...prev, [quotation._id]: 'accepted' }));
      setQuotations((prev) => prev.map((item) => (
        item._id === quotation._id ? { ...item, status: 'approved' } : item
      )));
    } catch {
      setQuotActionState((prev) => ({ ...prev, [quotation._id]: null }));
    }
  }, [setQuotations]);

  const handleRejectQuot = useCallback(async (quotation) => {
    setQuotActionState((prev) => ({ ...prev, [quotation._id]: 'loading' }));

    try {
      const body = rejectReason.trim() ? { reason: rejectReason.trim() } : {};
      await api.patch(`/quotations/share/${quotation.shareToken}/reject`, body);
      setQuotActionState((prev) => ({ ...prev, [quotation._id]: 'rejected' }));
      setQuotations((prev) => prev.map((item) => (
        item._id === quotation._id ? { ...item, status: 'rejected' } : item
      )));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      setQuotActionState((prev) => ({ ...prev, [quotation._id]: null }));
    }
  }, [rejectReason, setQuotations]);

  return {
    quotActionState,
    rejectingId,
    rejectReason,
    setRejectingId,
    setRejectReason,
    handleAcceptQuot,
    handleRejectQuot,
  };
};

export default useQuotationActions;
