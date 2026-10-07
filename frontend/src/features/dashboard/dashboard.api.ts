import { api } from '../../lib/api';
import type { DashboardOverview } from './dashboard.types';

export async function getDashboard(): Promise<DashboardOverview> {
  const { data } = await api.get<DashboardOverview>('/dashboard');
  return data;
}
