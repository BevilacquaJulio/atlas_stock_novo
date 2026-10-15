import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { MAX_MONEY } from './validators/bounds';

export function itemTotal(quantity: number, price: number): number {
  const value = new Prisma.Decimal(quantity)
    .mul(price)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (value.gt(MAX_MONEY))
    throw new BadRequestException('Valor total excede o limite permitido.');
  return value.toNumber();
}

export function sumMoney(values: number[]): number {
  const total = values.reduce(
    (sum, value) => sum.add(value),
    new Prisma.Decimal(0),
  );
  if (total.gt(MAX_MONEY))
    throw new BadRequestException('Valor total excede o limite permitido.');
  return total.toNumber();
}
