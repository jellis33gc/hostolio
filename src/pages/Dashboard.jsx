import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Job, Customer, Property } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isToday } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', user?.company_id],
    queryFn: () => Job.filter({ company_id: user.company_id }, '-scheduled_start'),
    enabled: !!user?.company_id,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', user?.company_id],
    queryFn: () => Customer.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });
  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.company_id],
    queryFn: () => Property.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });

  const todaysJobs = jobs.filter((j) => j.scheduled_start && isToday(new Date(j.scheduled_start)));
  const inProgress = jobs.filter((j) => ['en_route', 'in_progress'].includes(j.status));
  const flaggedIssues = jobs.filter((j) => j.status === 'draft').length;

  const stats = [
    { label: "Today's jobs", value: todaysJobs.length },
    { label: 'In progress now', value: inProgress.length },
    { label: 'Customers', value: customers.length },
    { label: 'Properties', value: properties.length },
  ];

  return (
    <AppLayout>
      <h1 className="text-2xl font-heading font-semibold tracking-tight mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">Today's operations at a glance.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today's schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysJobs.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No jobs scheduled for today.</p>
          )}
          <div className="space-y-3">
            {todaysJobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                <div>
                  <p className="text-sm font-medium capitalize">{j.job_type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(j.scheduled_start), 'HH:mm')}</p>
                </div>
                <Badge variant="outline" className="capitalize">{j.status?.replace(/_/g, ' ')}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
