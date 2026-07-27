import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Job, Property, Report } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isFuture } from 'date-fns';
import { FileText, MapPin } from 'lucide-react';

const STATUS_VARIANT = {
  draft: 'outline', scheduled: 'outline', assigned: 'outline', en_route: 'default',
  in_progress: 'default', completed: 'secondary', reviewed: 'secondary', invoiced: 'secondary', cancelled: 'destructive',
};

export default function CustomerPortal() {
  const { user } = useAuth();

  const { data: properties = [] } = useQuery({
    queryKey: ['my-properties', user?.linked_customer_id],
    queryFn: () => Property.filter({ customer_id: user.linked_customer_id }),
    enabled: !!user?.linked_customer_id,
  });
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['my-customer-jobs', user?.linked_customer_id],
    queryFn: () => Job.filter({ customer_id: user.linked_customer_id }, '-scheduled_start'),
    enabled: !!user?.linked_customer_id,
  });
  const { data: reports = [] } = useQuery({
    queryKey: ['my-customer-reports', user?.linked_customer_id],
    queryFn: () => Report.filter({ customer_id: user.linked_customer_id }),
    enabled: !!user?.linked_customer_id,
  });

  const addressFor = (propertyId) => {
    const p = properties.find((p) => p.id === propertyId);
    return p ? [p.address_line1, p.city].filter(Boolean).join(', ') : '';
  };
  const reportFor = (jobId) => reports.find((r) => r.job_id === jobId);

  const upcoming = jobs.filter((j) => j.scheduled_start && isFuture(new Date(j.scheduled_start)));
  const past = jobs.filter((j) => !upcoming.includes(j));

  const JobRow = ({ job }) => {
    const report = reportFor(job.id);
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium capitalize">{job.job_type?.replace(/_/g, ' ')}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {addressFor(job.property_id)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {job.scheduled_start ? format(new Date(job.scheduled_start), 'EEE d MMM yyyy, HH:mm') : 'Awaiting confirmation'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_VARIANT[job.status] || 'outline'} className="capitalize">{job.status?.replace(/_/g, ' ')}</Badge>
            {report && (
              <a href={report.pdf_url} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Report
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <CustomerLayout>
      <h1 className="text-2xl font-heading font-semibold tracking-tight mb-1">My Visits</h1>
      <p className="text-sm text-muted-foreground mb-6">Upcoming and past visits to your properties.</p>

      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming</h2>
          <div className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
            {upcoming.map((j) => <JobRow key={j.id} job={j} />)}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Past</h2>
          <div className="space-y-3">
            {!isLoading && past.length === 0 && <p className="text-sm text-muted-foreground">No past visits yet.</p>}
            {past.map((j) => <JobRow key={j.id} job={j} />)}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
