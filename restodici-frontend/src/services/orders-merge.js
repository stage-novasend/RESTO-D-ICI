export function mergeManagerOrdersResults(clientResult, b2bResult) {
  const hasClientSuccess = clientResult?.status === 'fulfilled';
  const hasB2bSuccess = b2bResult?.status === 'fulfilled';

  const clientOrders = hasClientSuccess
    ? (clientResult.value?.data || []).map((order) => ({
        ...order,
        type: 'CLIENT',
        source: 'Client',
        amount: Number(order.montantTotal ?? order.total ?? 0),
      }))
    : [];

  const b2bOrders = hasB2bSuccess
    ? (b2bResult.value?.data || []).map((order) => ({
        ...order,
        type: 'B2B',
        source: order.source || 'Entreprise',
        amount: Number(order.total ?? order.montantTotal ?? 0),
      }))
    : [];

  const orders = [...clientOrders, ...b2bOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    orders,
    hasClientError: !hasClientSuccess,
    hasB2bError: !hasB2bSuccess,
    hasAnySuccess: hasClientSuccess || hasB2bSuccess,
  };
}
