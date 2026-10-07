import { SetMetadata } from '@nestjs/common';
import type { Cargo } from '../../../generated/prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restringe um handler/controller aos cargos informados (RBAC).
 * A verificação acontece no RolesGuard, nunca no controller.
 * Uso: `@Roles('ADMINISTRADOR')`.
 */
export const Roles = (...roles: Cargo[]) => SetMetadata(ROLES_KEY, roles);
