import { useQuery } from '@tanstack/react-query';
import { getDashboard } from './dashboard.api';

const KEY = ['dashboard'];

export function useDashboard() {
  return useQuery({
    queryKey: KEY,
    queryFn: getDashboard,
    staleTime: 60_000,
  });
}
