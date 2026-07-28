import { useQuery } from '@tanstack/react-query';
import { Subscription } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { ALL_BUILT_MODULE_KEYS } from '@/lib/modules';

/**
 * Returns { enabledModules, isEnabled(key), isLoading }.
 * No Subscription row for a company means "not yet migrated to à-la-carte
 * billing" — we default to full access rather than locking out an existing
 * tenant that predates this system.
 */
export function useModuleAccess() {
  const { user } = useAuth();
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscription', user?.company_id],
    queryFn: () => Subscription.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });

  const subscription = subscriptions[0];
  const enabledModules = subscription ? (subscription.enabled_modules || []) : ALL_BUILT_MODULE_KEYS;

  return {
    enabledModules,
    isEnabled: (key) => enabledModules.includes(key),
    isLoading,
  };
}
