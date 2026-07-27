import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Invoice, Customer, Job, Company } from '@/api/entities';
import { base44 } from '@/api/base44Client';
import { buildInvoicePdf } from '@/lib/pdfInvoice';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Plus, Loader2 } from 'lucide-react';

const STATUS_VARIANT = { draft: 'outline', sent: 'default', paid: 'secondary', overdue: 'destructive', cancelled: 'outline' };
const INVOICEABLE_STATUSES = ['completed', 'reviewed'];

export default function Invoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [dueDate, setDueDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', user?.company_id],
    queryFn: () => Invoice.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', user?.company_id],
    queryFn: () => Customer.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', user?.company_id],
    queryFn: () => Job.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });
  const { data: company } = useQuery({
    queryKey: ['company', user?.company_id],
    queryFn: async () => (await Company.filter({ id: user.company_id }))[0],
    enabled: !!user?.company_id,
  });

  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—';

  const alreadyInvoicedJobIds = useMemo(
    () => new Set(invoices.flatMap((inv) => inv.job_ids || [])),
    [invoices]
  );

  const invoiceableJobs = jobs.filter(
    (j) => j.customer_id === customerId && INVOICEABLE_STATUSES.includes(j.status) && !alreadyInvoicedJobIds.has(j.id)
  );

  const toggleJob = (job) => {
    setSelectedJobIds((prev) => (prev.includes(job.id) ? prev.filter((id) => id !== job.id) : [...prev, job.id]));
    if (!amounts[job.id]) setAmounts((prev) => ({ ...prev, [job.id]: '' }));
  };

  const total = selectedJobIds.reduce((sum, id) => sum + (Number(amounts[id]) || 0), 0);

  const resetForm = () => {
    setCustomerId('');
    setSelectedJobIds([]);
    setAmounts({});
    setDueDate('');
  };

  const generateInvoice = async () => {
    setGenerating(true);
    try {
      const customer = customers.find((c) => c.id === customerId);
      const lineItems = selectedJobIds.map((id) => {
        const job = jobs.find((j) => j.id === id);
        return {
          description: `${(job.job_type || '').replace(/_/g, ' ')} — ${job.scheduled_start ? format(new Date(job.scheduled_start), 'd MMM yyyy') : ''}`,
          amount: Number(amounts[id]) || 0,
        };
      });
      const issuedAt = new Date().toISOString();
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
      const pdfBlob = buildInvoicePdf({ company, customer, lineItems, issuedAt, dueDate, invoiceNumber });
      const file = new File([pdfBlob], `${invoiceNumber}.pdf`, { type: 'application/pdf' });
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      await Invoice.create({
        company_id: user.company_id,
        customer_id: customerId,
        job_ids: selectedJobIds,
        line_items: lineItems,
        amount_total: total,
        issued_at: issuedAt,
        due_date: dueDate || undefined,
        pdf_url: uploadRes?.file_url || uploadRes?.url,
        status: 'sent',
      });
      await Promise.all(selectedJobIds.map((id) => Job.update(id, { status: 'invoiced' })));
      toast({ title: 'Invoice generated' });
      resetForm();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (err) {
      toast({ title: 'Could not generate invoice', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Bill customers for completed work.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" />New invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setSelectedJobIds([]); setAmounts({}); }}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {customerId && (
                <div className="space-y-1.5">
                  <Label>Completed jobs to invoice</Label>
                  {invoiceableJobs.length === 0 && <p className="text-sm text-muted-foreground">No uninvoiced completed jobs for this customer.</p>}
                  <div className="space-y-2">
                    {invoiceableJobs.map((job) => (
                      <div key={job.id} className="flex items-center gap-2 border rounded-md p-2">
                        <Checkbox checked={selectedJobIds.includes(job.id)} onCheckedChange={() => toggleJob(job)} />
                        <span className="text-sm flex-1 capitalize">
                          {job.job_type?.replace(/_/g, ' ')} — {job.scheduled_start ? format(new Date(job.scheduled_start), 'd MMM yyyy') : ''}
                        </span>
                        {selectedJobIds.includes(job.id) && (
                          <Input
                            type="number" step="0.01" placeholder="£" className="w-24"
                            value={amounts[job.id] || ''}
                            onChange={(e) => setAmounts((prev) => ({ ...prev, [job.id]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJobIds.length > 0 && (
                <>
                  <div className="space-y-1.5">
                    <Label>Due date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                  <p className="text-sm font-medium">Total: £{total.toFixed(2)}</p>
                </>
              )}
            </div>
            <DialogFooter>
              <Button onClick={generateInvoice} disabled={generating || selectedJobIds.length === 0}>
                {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                Generate invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {!isLoading && invoices.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No invoices yet.</TableCell></TableRow>
            )}
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{customerName(inv.customer_id)}</TableCell>
                <TableCell>{inv.issued_at ? format(new Date(inv.issued_at), 'd MMM yyyy') : '—'}</TableCell>
                <TableCell>{inv.due_date ? format(new Date(inv.due_date), 'd MMM yyyy') : '—'}</TableCell>
                <TableCell>£{Number(inv.amount_total || 0).toFixed(2)}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[inv.status]} className="capitalize">{inv.status}</Badge></TableCell>
                <TableCell>
                  <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline">View PDF</a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
