import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  liveness(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  async readiness(): Promise<{ status: string; database: string }> {
    try {
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          this.prisma.$queryRaw`SELECT 1`,
          new Promise<never>((_resolve, reject) => {
            deadline = setTimeout(
              () => reject(new Error('Readiness timeout')),
              3000,
            );
          }),
        ]);
      } finally {
        clearTimeout(deadline);
      }
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException('Banco indisponível.');
    }
  }
}
