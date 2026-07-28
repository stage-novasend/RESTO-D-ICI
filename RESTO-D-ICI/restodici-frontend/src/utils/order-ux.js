const DELIVERY_FEEDBACK_PREFIX = 'restodici:delivery-feedback:';

const resolveStorage = (storage) => {
  if (storage) return storage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
};

export const getClientOrdersPath = (tab = 'orders') =>
  `/client/orders?tab=${encodeURIComponent(tab)}`;

export const getDeliveryFeedbackStorageKey = (orderId) =>
  `${DELIVERY_FEEDBACK_PREFIX}${String(orderId || '').trim()}`;

export const readDeliveryFeedback = (orderId, storage) => {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) return null;

  try {
    const rawValue = targetStorage.getItem(getDeliveryFeedbackStorageKey(orderId));
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue.value !== 'string') return null;

    return parsedValue;
  } catch {
    return null;
  }
};

export const writeDeliveryFeedback = (orderId, value, storage) => {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) return null;

  const feedback = {
    value,
    updatedAt: new Date().toISOString(),
  };

  targetStorage.setItem(
    getDeliveryFeedbackStorageKey(orderId),
    JSON.stringify(feedback),
  );

  return feedback;
};
