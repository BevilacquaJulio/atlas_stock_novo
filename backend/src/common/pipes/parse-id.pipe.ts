import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { idSchema } from '../validators/bounds';

@Injectable()
export class ParseIdPipe implements PipeTransform {
  transform(value: unknown): number {
    if (typeof value !== 'string' || !/^\d+$/.test(value))
      throw new BadRequestException('ID inválido.');
    const parsed = idSchema.safeParse(value);
    if (!parsed.success) throw new BadRequestException('ID inválido.');
    return parsed.data;
  }
}
