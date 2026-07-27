import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Job, Property, Report, Dispute } from '@/api/entities';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format, isFuture } from 'date-fns';
import { FileText, MapPin, AlertTriangle, Loader2 } from 'lucide-react';

const DISPUTE_DONE_STATUSES = ['completed', 'reviewed', 'invoiced'];

const STATUS_VARIANT = {
  draft: 'outline', scheduled: 'outline', assigned: 'outline', en_route: 'default',
  in_progress: 'default', completed: 'secondary', reviewed: 'secondary', invoiced: 'secondary', cancelled: 'destructive',
};

export default function CustomerPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [disputeJob, setDisputeJob] = useState(null);
  const [disputeForm, setDisputeForm] = useState({ category: 'quality', description: '' });
  const [evidenceUrl, setEvidenceUrl] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);

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

  const handleEvidence = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEvidence(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setEvidenceUrl(res?.file_url || res?.url);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingEvidence(false);
    }
  };

  const submitDispute = async (e) => {
    e.preventDefault();
    setSubmittingDispute(true);
    try {
      await Dispute.create({
        company_id: disputeJob.company_id,
        customer_id: user.linked_customer_id,
        job_id: disputeJob.id,
        category: disputeForm.category,
        description: disputeForm.description,
        raised_by: user.id,
        evidence_urls: evidenceUrl ? [evidenceUrl] : undefined,
      });
      toast({ title: 'Issue reported', description: "We'll get back to you shortly." });
      setDisputeJob(null);
      setDisputeForm({ category: 'quality', description: '' });
      setEvidenceUrl(null);
      queryClient.invalidateQueries({ queryKey: ['my-customer-jobs'] });
    } catch (err) {
      toast({ title: 'Could not submit', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingDispute(false);
    }
  };

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
            {DISPUTE_DONE_STATUSES.includes(job.status) && (
              <Button size="sm" variant="ghost" onClick={() => setDisputeJob(job)}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Report an issue
              </Button>
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

      <Dialog open={!!disputeJob} onOpenChange={(v) => !v && setDisputeJob(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report an issue</DialogTitle></DialogHeader>
          <form onSubmit={submitDispute} className="space-y-4">
            <div className="space-y-1.5">
              <Label>What's the issue?</Label>
              <Select value={disputeForm.category} onValueChange={(v) => setDisputeForm({ ...disputeForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quality">Quality of work</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="missed_visit">Missed visit</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Details</Label>
              <Textarea required value={disputeForm.description} onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })} rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label>Photo (optional)</Label>
              <Input type="file" accept="image/*" onChange={handleEvidence} disabled={uploadingEvidence} />
              {uploadingEvidence && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submittingDispute}>Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
