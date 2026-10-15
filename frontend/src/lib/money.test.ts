import { describe, expect, it } from 'vitest';
import { totalCompra } from './money';

describe('prévia de compra compatível com a API', () => {
  it('arredonda por item, inclusive meio centavo e quantidades fracionárias', () => {
    expect(
      totalCompra([
        { quantidade: 0.5, valorUnitario: 0.01 },
        { quantidade: 0.5, valorUnitario: 0.01 },
      ]),
    ).toBe(0.02);
    expect(
      totalCompra([
        { quantidade: 1, valorUnitario: 0.1 },
        { quantidade: 1, valorUnitario: 0.2 },
      ]),
    ).toBe(0.3);
    expect(totalCompra([{ quantidade: 1.125, valorUnitario: 12.34 }])).toBe(
      13.88,
    );
    expect(totalCompra([{ quantidade: 1e308, valorUnitario: 1 }])).toBe(0);
  });
});
