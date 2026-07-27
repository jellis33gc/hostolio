import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Dispute, AppUser } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const STATUS_VARIANT = { open: 'destructive', investigating: 'outline', resolved: 'secondary', rejected: 'secondary' };

export default function Disputes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(null);

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes', user?.company_id],
    queryFn: () => Dispute.filter({ company_id: user.company_id }, '-created_date'),
    enabled: !!user?.company_id,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['company-users', user?.company_id],
    queryFn: () => AppUser.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });

  const staffName = (id) => users.find((u) => u.id === id)?.full_name || users.find((u) => u.id === id)?.email || id;

  const updateStatus = async (dispute, status) => {
    setSaving(dispute.id);
    try {
      await Dispute.update(dispute.id, { status, resolution_notes: notes[dispute.id] ?? dispute.resolution_notes });
      toast({ title: 'Dispute updated' });
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    } catch (err) {
      toast({ title: 'Could not update', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <AppLayout>
      <h1 className="text-2xl font-heading font-semibold tracking-tight mb-1">Disputes</h1>
      <p className="text-sm text-muted-foreground mb-6">Customer-reported issues needing a resolution.</p>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && disputes.length === 0 && <p className="text-sm text-muted-foreground">No disputes on record.</p>}
        {disputes.map((d) => (
          <Card key={d.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base capitalize">{d.category?.replace(/_/g, ' ')}</CardTitle>
              <Badge variant={STATUS_VARIANT[d.status]} className="capitalize">{d.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{d.description}</p>
              <p className="text-xs text-muted-foreground">
                Raised by {staffName(d.raised_by)}
                {d.job_id && <> — <Link to={`/jobs/${d.job_id}`} className="text-primary hover:underline">view job</Link></>}
              </p>
              {d.evidence_urls?.length > 0 && (
                <div className="flex gap-2">
                  {d.evidence_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" className="w-16 h-16 rounded-md object-cover border" />
                    </a>
                  ))}
                </div>
              )}
              <div className="space-y-1.5">
                <Textarea
                  placeholder="Resolution notes…"
                  defaultValue={d.resolution_notes}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={d.status} onValueChange={(v) => updateStatus(d, v)} disabled={saving === d.id}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => updateStatus(d, d.status)} disabled={saving === d.id}>Save notes</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
