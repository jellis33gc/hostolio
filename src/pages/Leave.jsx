import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { LeaveRequest, AppUser } from '@/api/entities';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Plus, Check, X, Loader2 } from 'lucide-react';

const STATUS_VARIANT = { pending: 'outline', approved: 'secondary', rejected: 'destructive' };

const emptyForm = { leave_type: 'holiday', start_date: '', end_date: '', reason: '' };

export default function Leave() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploadingFitNote, setUploadingFitNote] = useState(false);
  const [fitNoteUrl, setFitNoteUrl] = useState(null);
  const [decidingId, setDecidingId] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: isAdmin ? ['leave-company', user?.company_id] : ['leave-mine', user?.id],
    queryFn: () => (isAdmin ? LeaveRequest.filter({ company_id: user.company_id }, '-start_date') : LeaveRequest.filter({ staff_id: user.id }, '-start_date')),
    enabled: !!user,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['company-users', user?.company_id],
    queryFn: () => AppUser.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id && isAdmin,
  });
  const staffName = (id) => users.find((u) => u.id === id)?.full_name || users.find((u) => u.id === id)?.email || id;

  const handleFitNote = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFitNote(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setFitNoteUrl(res?.file_url || res?.url);
      toast({ title: 'Fit note uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingFitNote(false);
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    try {
      await LeaveRequest.create({
        company_id: user.company_id,
        staff_id: user.id,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        fit_note_url: fitNoteUrl || undefined,
      });
      toast({ title: 'Request submitted' });
      setForm(emptyForm);
      setFitNoteUrl(null);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['leave-mine'] });
    } catch (err) {
      toast({ title: 'Could not submit request', description: err.message, variant: 'destructive' });
    }
  };

  const decide = async (req, status) => {
    setDecidingId(req.id);
    try {
      await LeaveRequest.update(req.id, { status });
      toast({ title: status === 'approved' ? 'Approved' : 'Rejected' });
      queryClient.invalidateQueries({ queryKey: ['leave-company'] });
    } catch (err) {
      toast({ title: 'Could not update request', description: err.message, variant: 'destructive' });
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">{isAdmin ? 'Leave requests' : 'My leave'}</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? 'Holiday and sickness requests across the team.' : 'Request holiday or report sickness.'}</p>
        </div>
        {!isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1.5" />New request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New leave request</DialogTitle></DialogHeader>
              <form onSubmit={submitRequest} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="sickness">Sickness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start date</Label>
                    <Input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End date</Label>
                    <Input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{form.leave_type === 'sickness' ? 'Details (self-certify)' : 'Reason (optional)'}</Label>
                  <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </div>
                {form.leave_type === 'sickness' && (
                  <div className="space-y-1.5">
                    <Label>Fit note (if longer absence)</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={handleFitNote} disabled={uploadingFitNote} />
                    {uploadingFitNote && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
                    {fitNoteUrl && <p className="text-xs text-emerald-600">Fit note attached</p>}
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit">Submit request</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && requests.length === 0 && <p className="text-sm text-muted-foreground">No leave requests.</p>}
        {requests.map((req) => (
          <Card key={req.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base capitalize">
                {req.leave_type} {isAdmin && <span className="text-muted-foreground font-normal">— {staffName(req.staff_id)}</span>}
              </CardTitle>
              <Badge variant={STATUS_VARIANT[req.status]} className="capitalize">{req.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {format(new Date(req.start_date), 'd MMM yyyy')} – {format(new Date(req.end_date), 'd MMM yyyy')}
              </p>
              {req.reason && <p className="text-sm mt-1.5">{req.reason}</p>}
              {req.fit_note_url && (
                <a href={req.fit_note_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline mt-1.5 inline-block">
                  View fit note
                </a>
              )}
              {isAdmin && req.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => decide(req, 'approved')} disabled={decidingId === req.id}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(req, 'rejected')} disabled={decidingId === req.id}>
                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
