import { useState, useEffect } from 'react';
import { persistGet, persistSet } from '@/lib/persistentStorage';

/**
 * Persists page state (columns + cards) to DB + localStorage.
 * Supports deleting built-in cards, custom cards, drag-to-reorder, and custom columns.
 */
export function usePageStorage(pageKey, defaultColumns, builtInCards = []) {
  const colKey    = `redops_columns_${pageKey}`;
  const cardKey   = `redops_cards_${pageKey}`;
  const orderKey  = `redops_order_${pageKey}`;
  const hiddenKey = `redops_hidden_${pageKey}`;

  const localLoad = (key, fallback) => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
    catch { return fallback; }
  };

  const [columns, setColumnsRaw] = useState(() => localLoad(colKey, defaultColumns));
  const [customCards, setCustomCardsRaw] = useState(() => localLoad(cardKey, []));
  const [hiddenIds, setHiddenIdsRaw] = useState(() => localLoad(hiddenKey, []));
  const [cardOrder, setCardOrderRaw] = useState(() => localLoad(orderKey, builtInCards.map(c => c.id)));

  // When pageKey changes, immediately reset state from the new key's localStorage,
  // then sync from DB (overwriting only if DB has a value).
  useEffect(() => {
    setColumnsRaw(localLoad(colKey, defaultColumns));
    setCustomCardsRaw(localLoad(cardKey, []));
    setHiddenIdsRaw(localLoad(hiddenKey, []));
    setCardOrderRaw(localLoad(orderKey, builtInCards.map(c => c.id)));

    persistGet(colKey).then(val => { if (val !== null && val !== undefined) setColumnsRaw(val); });
    persistGet(cardKey).then(val => { if (val !== null && val !== undefined) setCustomCardsRaw(val); });
    persistGet(hiddenKey).then(val => { if (val !== null && val !== undefined) setHiddenIdsRaw(val); });
    persistGet(orderKey).then(val => { if (val !== null && val !== undefined) setCardOrderRaw(val); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const setColumns = (val) => {
    const next = typeof val === 'function' ? val(columns) : val;
    setColumnsRaw(next);
    persistSet(colKey, next);
  };

  const setCustomCards = (val) => {
    const next = typeof val === 'function' ? val(customCards) : val;
    setCustomCardsRaw(next);
    persistSet(cardKey, next);
  };

  const setHiddenIds = (val) => {
    const next = typeof val === 'function' ? val(hiddenIds) : val;
    setHiddenIdsRaw(next);
    persistSet(hiddenKey, next);
  };

  const setCardOrder = (val) => {
    const next = typeof val === 'function' ? val(cardOrder) : val;
    setCardOrderRaw(next);
    persistSet(orderKey, next);
  };

  // Merged ordered list
  const allCards = (() => {
    const builtInMap = {};
    builtInCards.forEach(c => { builtInMap[c.id] = { ...c, isBuiltIn: true }; });
    const customMap = {};
    customCards.forEach(c => { customMap[c.id] = { ...c, isBuiltIn: false }; });

    const orderedIds = [...cardOrder];
    builtInCards.forEach(c => { if (!orderedIds.includes(c.id)) orderedIds.push(c.id); });
    customCards.forEach(c => { if (!orderedIds.includes(c.id)) orderedIds.push(c.id); });

    return orderedIds
      .filter(id => !hiddenIds.includes(id))
      .map(id => builtInMap[id] || customMap[id])
      .filter(Boolean);
  })();

  const addCustomCard = (card) => {
    const newCard = { ...card, isBuiltIn: false };
    setCustomCards(prev => [...prev, newCard]);
    setCardOrder(prev => [...prev, card.id]);
  };

  const updateCard = (updatedCard) => {
    const isBuiltIn = builtInCards.some(c => c.id === updatedCard.id);
    if (isBuiltIn) {
      setHiddenIds(prev => prev.includes(updatedCard.id) ? prev : [...prev, updatedCard.id]);
      const overrideCard = { ...updatedCard, id: updatedCard.id + '_override', isBuiltIn: false, _originalId: updatedCard.id };
      setCustomCards(prev => {
        const existing = prev.findIndex(c => c._originalId === updatedCard.id);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = overrideCard;
          return next;
        }
        return [...prev, overrideCard];
      });
      setCardOrder(prev => {
        const overrideId = updatedCard.id + '_override';
        const idx = prev.indexOf(updatedCard.id);
        if (idx >= 0) {
          const next = [...prev];
          next.splice(idx + 1, 0, overrideId);
          return next;
        }
        return prev.includes(overrideId) ? prev : [...prev, overrideId];
      });
    } else {
      setCustomCards(prev => prev.map(c => c.id === updatedCard.id ? { ...updatedCard, isBuiltIn: false } : c));
    }
  };

  const deleteCard = (id) => {
    const isBuiltIn = builtInCards.some(c => c.id === id);
    if (isBuiltIn) {
      setHiddenIds(prev => [...prev, id]);
    } else {
      setCustomCards(prev => prev.filter(c => c.id !== id));
    }
    setCardOrder(prev => prev.filter(cid => cid !== id));
  };

  const reorderCards = (fromIndex, toIndex) => {
    const currentIds = allCards.map(c => c.id);
    const [moved] = currentIds.splice(fromIndex, 1);
    currentIds.splice(toIndex, 0, moved);
    const newOrder = [...currentIds, ...hiddenIds];
    setCardOrder(newOrder);
  };

  return { columns, setColumns, customCards, allCards, addCustomCard, updateCard, deleteCard, reorderCards };
}