import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Document, AppUser } from '@/api/entities';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInCalendarDays } from 'date-fns';
import { Plus, Trash2, Loader2, AlertTriangle, FileText } from 'lucide-react';

const DOC_TYPES = [
  { value: 'id', label: 'Photo ID' },
  { value: 'dbs_certificate', label: 'DBS certificate' },
  { value: 'right_to_work', label: 'Right to work' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'other', label: 'Other' },
];

function expiryStatus(expiry_date) {
  if (!expiry_date) return null;
  const days = differenceInCalendarDays(new Date(expiry_date), new Date());
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'valid';
}

const STATUS_BADGE = {
  expired: <Badge variant="destructive">Expired</Badge>,
  expiring_soon: <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-500">Expiring soon</Badge>,
  valid: <Badge variant="secondary">Valid</Badge>,
};

const emptyForm = { doc_type: 'dbs_certificate', label: '', expiry_date: '' };

export default function Documents() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: isAdmin ? ['documents-company', user?.company_id] : ['documents-mine', user?.id],
    queryFn: () => (isAdmin ? Document.filter({ company_id: user.company_id }) : Document.filter({ staff_id: user.id })),
    enabled: !!user,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['company-users', user?.company_id],
    queryFn: () => AppUser.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id && isAdmin,
  });
  const staffName = (id) => users.find((u) => u.id === id)?.full_name || users.find((u) => u.id === id)?.email || id;

  const alerts = documents.filter((d) => ['expired', 'expiring_soon'].includes(expiryStatus(d.expiry_date)));

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast({ title: 'Choose a file first', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      await Document.create({
        company_id: user.company_id,
        staff_id: user.id,
        doc_type: form.doc_type,
        label: form.label || undefined,
        expiry_date: form.expiry_date || undefined,
        file_url: res?.file_url || res?.url,
        uploaded_at: new Date().toISOString(),
      });
      toast({ title: 'Document uploaded' });
      setForm(emptyForm);
      setFile(null);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['documents-mine'] });
      queryClient.invalidateQueries({ queryKey: ['documents-company'] });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (doc) => {
    try {
      await Document.delete(doc.id);
      queryClient.invalidateQueries({ queryKey: ['documents-mine'] });
      queryClient.invalidateQueries({ queryKey: ['documents-company'] });
    } catch (err) {
      toast({ title: 'Could not remove', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">{isAdmin ? 'Document vault' : 'My documents'}</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? 'Compliance documents across the team, with expiry tracking.' : 'ID, certifications, and insurance on file.'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" />Upload document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload a document</DialogTitle></DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.doc_type === 'other' && (
                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>File</Label>
                <Input type="file" accept="image/*,.pdf" required onChange={(e) => setFile(e.target.files?.[0])} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry date (if applicable)</Label>
                <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isAdmin && alerts.length > 0 && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 mb-1">{alerts.length} document{alerts.length > 1 ? 's' : ''} need attention</p>
                <ul className="space-y-0.5 text-amber-700">
                  {alerts.map((d) => (
                    <li key={d.id}>
                      {staffName(d.staff_id)} — {DOC_TYPES.find((t) => t.value === d.doc_type)?.label || d.label}
                      {' '}({expiryStatus(d.expiry_date) === 'expired' ? 'expired' : 'expiring'} {format(new Date(d.expiry_date), 'd MMM yyyy')})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border bg-background divide-y">
        {isLoading && <p className="text-sm text-muted-foreground p-6 text-center">Loading…</p>}
        {!isLoading && documents.length === 0 && <p className="text-sm text-muted-foreground p-6 text-center">No documents yet.</p>}
        {documents.map((d) => {
          const status = expiryStatus(d.expiry_date);
          return (
            <div key={d.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {isAdmin && <span className="text-muted-foreground font-normal">{staffName(d.staff_id)} — </span>}
                    {DOC_TYPES.find((t) => t.value === d.doc_type)?.label || d.label || 'Document'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.expiry_date ? `Expires ${format(new Date(d.expiry_date), 'd MMM yyyy')}` : 'No expiry'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {status && STATUS_BADGE[status]}
                <a href={d.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View</a>
                {(isAdmin || d.staff_id === user.id) && (
                  <Button size="icon" variant="ghost" onClick={() => remove(d)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
