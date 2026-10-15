export function totalCompra(
  itens: { quantidade?: number; valorUnitario?: number }[],
): number {
  const cents = itens.reduce((sum, item) => {
    const quantity = Number(item.quantidade ?? 0);
    const price = Number(item.valorUnitario ?? 0);
    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(price) ||
      quantity < 0 ||
      price < 0
    )
      return sum;
    const milliQuantity = Math.round(quantity * 1000);
    const centsPrice = Math.round(price * 100);
    if (
      !Number.isSafeInteger(milliQuantity) ||
      !Number.isSafeInteger(centsPrice)
    )
      return sum;
    const milliUnits = BigInt(milliQuantity);
    const unitCents = BigInt(centsPrice);
    // O servidor arredonda cada item a centavos antes de somar a compra.
    return sum + (milliUnits * unitCents + 500n) / 1000n;
  }, 0n);
  return Number(cents) / 100;
}
