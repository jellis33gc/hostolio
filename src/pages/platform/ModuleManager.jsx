import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Company, Subscription } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { MODULE_DEFS, ALL_BUILT_MODULE_KEYS } from '@/lib/modules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

export default function ModuleManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['all-companies'],
    queryFn: () => Company.filter({}),
    enabled: !!user?.is_platform_owner,
  });
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: () => Subscription.filter({}),
    enabled: !!user?.is_platform_owner,
  });

  const subscriptionFor = (companyId) => subscriptions.find((s) => s.company_id === companyId);

  const toggleModule = async (company, moduleKey) => {
    setSaving(`${company.id}-${moduleKey}`);
    try {
      const existing = subscriptionFor(company.id);
      const current = existing ? (existing.enabled_modules || []) : ALL_BUILT_MODULE_KEYS;
      const next = current.includes(moduleKey) ? current.filter((k) => k !== moduleKey) : [...current, moduleKey];
      if (existing) {
        await Subscription.update(existing.id, { enabled_modules: next });
      } else {
        await Subscription.create({ company_id: company.id, enabled_modules: next, status: 'active' });
      }
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch (err) {
      toast({ title: 'Could not update', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  if (!user?.is_platform_owner) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Platform administration is not available on this account.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-heading font-semibold tracking-tight mb-1">Module Manager</h1>
      <p className="text-sm text-muted-foreground mb-6">Control which modules each tenant has access to. Changes take effect immediately.</p>

      <div className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {companies.map((company) => {
          const sub = subscriptionFor(company.id);
          const enabled = sub ? (sub.enabled_modules || []) : ALL_BUILT_MODULE_KEYS;
          const migrated = !!sub;
          return (
            <Card key={company.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">{company.name}</CardTitle>
                {!migrated && <Badge variant="outline">Legacy — full access, no subscription row yet</Badge>}
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {MODULE_DEFS.map((mod) => (
                  <div key={mod.key} className={`flex items-start gap-2.5 rounded-md border p-3 ${!mod.built ? 'opacity-50' : ''}`}>
                    <Switch
                      checked={enabled.includes(mod.key)}
                      disabled={!mod.built || saving === `${company.id}-${mod.key}`}
                      onCheckedChange={() => toggleModule(company, mod.key)}
                    />
                    <div>
                      <p className="text-sm font-medium">{mod.label}{!mod.built && ' (coming soon)'}</p>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
