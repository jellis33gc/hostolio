import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Job, Property, Customer, Staff } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

const JOB_TYPES = ['clean', 'deep_clean', 'checkin_prep', 'checkout_turnover', 'companionship_visit', 'maintenance', 'other'];

const STATUS_VARIANT = {
  draft: 'secondary', scheduled: 'outline', assigned: 'outline', en_route: 'default',
  in_progress: 'default', completed: 'secondary', reviewed: 'secondary', invoiced: 'secondary', cancelled: 'destructive',
};

const emptyForm = {
  property_id: '', job_type: 'clean', scheduled_start: '', scheduled_end: '',
  assigned_staff_id: '', special_instructions: '',
};

export default function Jobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [confirmingJob, setConfirmingJob] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ scheduled_start: '', assigned_staff_id: '' });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', user?.company_id],
    queryFn: () => Job.filter({ company_id: user.company_id }, '-scheduled_start'),
    enabled: !!user?.company_id,
  });
  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.company_id],
    queryFn: () => Property.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', user?.company_id],
    queryFn: () => Customer.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', user?.company_id],
    queryFn: () => Staff.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });

  const propertyLabel = (id) => {
    const p = properties.find((p) => p.id === id);
    if (!p) return '—';
    const cust = customers.find((c) => c.id === p.customer_id);
    return `${p.address_line1}${cust ? ` (${cust.name})` : ''}`;
  };
  const staffLabel = (userId) => staff.find((s) => s.user_id === userId)?.user_id ? userId : '—';

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const property = properties.find((p) => p.id === form.property_id);
      await Job.create({
        company_id: user.company_id,
        property_id: form.property_id,
        customer_id: property?.customer_id,
        job_type: form.job_type,
        scheduled_start: new Date(form.scheduled_start).toISOString(),
        scheduled_end: form.scheduled_end ? new Date(form.scheduled_end).toISOString() : undefined,
        assigned_staff_id: form.assigned_staff_id || undefined,
        status: form.assigned_staff_id ? 'assigned' : 'scheduled',
        special_instructions: form.special_instructions,
        key_code_snapshot: property?.key_code,
        key_reference_snapshot: property?.key_reference,
        access_notes_snapshot: property?.access_notes,
      });
      toast({ title: 'Job created' });
      setForm(emptyForm);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (err) {
      toast({ title: 'Could not create job', description: err.message, variant: 'destructive' });
    }
  };

  const openConfirm = (job) => {
    setConfirmingJob(job);
    setConfirmForm({
      scheduled_start: job.scheduled_start ? job.scheduled_start.slice(0, 16) : '',
      assigned_staff_id: job.assigned_staff_id || '',
    });
  };

  const submitConfirm = async (e) => {
    e.preventDefault();
    try {
      await Job.update(confirmingJob.id, {
        scheduled_start: new Date(confirmForm.scheduled_start).toISOString(),
        assigned_staff_id: confirmForm.assigned_staff_id || undefined,
        status: confirmForm.assigned_staff_id ? 'assigned' : 'scheduled',
      });
      toast({ title: 'Booking confirmed' });
      setConfirmingJob(null);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (err) {
      toast({ title: 'Could not confirm booking', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">Every visit, scheduled or in progress.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" />New job</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New job</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <Label>Property</Label>
                <Select required value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.address_line1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Job type</Label>
                <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input required type="datetime-local" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input type="datetime-local" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Assign staff</Label>
                <Select value={form.assigned_staff_id} onValueChange={(v) => setForm({ ...form, assigned_staff_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => <SelectItem key={s.id} value={s.user_id}>{s.user_id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Special instructions</Label>
                <Textarea value={form.special_instructions} onChange={(e) => setForm({ ...form, special_instructions: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit">Create job</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {!isLoading && jobs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No jobs yet.</TableCell></TableRow>
            )}
            {jobs.map((j) => (
              <TableRow key={j.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/jobs/${j.id}`)}>
                <TableCell className="font-medium">
                  <Link to={`/jobs/${j.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{propertyLabel(j.property_id)}</Link>
                </TableCell>
                <TableCell className="capitalize">{j.job_type?.replace(/_/g, ' ')}</TableCell>
                <TableCell>{j.scheduled_start ? format(new Date(j.scheduled_start), 'd MMM, HH:mm') : '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{staffLabel(j.assigned_staff_id)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[j.status] || 'outline'} className="capitalize">{j.status?.replace(/_/g, ' ')}</Badge>
                  {j.requested_by_customer && j.status === 'draft' && (
                    <Badge variant="outline" className="ml-1.5 border-amber-400 text-amber-700">Customer request</Badge>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {j.status === 'draft' && (
                    <Button size="sm" variant="outline" onClick={() => openConfirm(j)}>Confirm</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirmingJob} onOpenChange={(v) => !v && setConfirmingJob(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm booking</DialogTitle></DialogHeader>
          <form onSubmit={submitConfirm} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Confirmed date & time</Label>
              <Input required type="datetime-local" value={confirmForm.scheduled_start} onChange={(e) => setConfirmForm({ ...confirmForm, scheduled_start: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Assign staff</Label>
              <Select value={confirmForm.assigned_staff_id} onValueChange={(v) => setConfirmForm({ ...confirmForm, assigned_staff_id: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => <SelectItem key={s.id} value={s.user_id}>{s.user_id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {confirmingJob?.special_instructions && (
              <p className="text-sm text-muted-foreground border rounded-md p-2">{confirmingJob.special_instructions}</p>
            )}
            <DialogFooter>
              <Button type="submit">Confirm booking</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
