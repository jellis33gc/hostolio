import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Job } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const STATUS_VARIANT = {
  draft: 'secondary', scheduled: 'outline', assigned: 'outline', en_route: 'default',
  in_progress: 'default', completed: 'secondary', reviewed: 'secondary', invoiced: 'secondary', cancelled: 'destructive',
};

export default function MyJobs() {
  const { user } = useAuth();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['my-jobs', user?.id],
    queryFn: () => Job.filter({ assigned_staff_id: user.id }, '-scheduled_start'),
    enabled: !!user?.id,
  });

  return (
    <AppLayout>
      <h1 className="text-2xl font-heading font-semibold tracking-tight mb-1">My Jobs</h1>
      <p className="text-sm text-muted-foreground mb-6">Your assigned visits.</p>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && jobs.length === 0 && (
          <p className="text-sm text-muted-foreground">No jobs assigned to you yet.</p>
        )}
        {jobs.map((j) => (
          <Card key={j.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base capitalize">{j.job_type?.replace(/_/g, ' ')}</CardTitle>
              <Badge variant={STATUS_VARIANT[j.status] || 'outline'} className="capitalize">{j.status?.replace(/_/g, ' ')}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {j.scheduled_start ? format(new Date(j.scheduled_start), 'EEE d MMM, HH:mm') : 'Unscheduled'}
              </p>
              {j.special_instructions && <p className="text-sm mt-2">{j.special_instructions}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
