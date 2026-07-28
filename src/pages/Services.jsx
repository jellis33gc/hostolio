import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Service } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil } from 'lucide-react';

const CATEGORIES = ['clean', 'deep_clean', 'checkin_prep', 'checkout_turnover', 'companionship_visit', 'maintenance', 'other'];

const emptyForm = { name: '', category: 'clean', description: '', default_duration_minutes: '', default_price: '', active: true };

export default function Services() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', user?.company_id],
    queryFn: () => Service.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name, category: s.category, description: s.description || '',
      default_duration_minutes: s.default_duration_minutes ?? '', default_price: s.default_price ?? '',
      active: s.active !== false,
    });
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description,
        default_duration_minutes: form.default_duration_minutes ? Number(form.default_duration_minutes) : undefined,
        default_price: form.default_price ? Number(form.default_price) : undefined,
        active: form.active,
      };
      if (editing) {
        await Service.update(editing.id, payload);
        toast({ title: 'Service updated' });
      } else {
        await Service.create({ ...payload, company_id: user.company_id });
        toast({ title: 'Service added' });
      }
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['services'] });
    } catch (err) {
      toast({ title: 'Could not save service', description: err.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (s) => {
    try {
      await Service.update(s.id, { active: !s.active });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    } catch (err) {
      toast({ title: 'Could not update', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">Your service catalog — pricing and durations customers and staff see.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit service' : 'Add service'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Standard clean" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Maps to the job type used for scheduling.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Default duration (mins)</Label>
                  <Input type="number" value={form.default_duration_minutes} onChange={(e) => setForm({ ...form, default_duration_minutes: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Default price (£)</Label>
                  <Input type="number" step="0.01" value={form.default_price} onChange={(e) => setForm({ ...form, default_price: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's included, shown to customers booking online" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <span className="text-sm">Active — bookable now</span>
              </div>
              <DialogFooter>
                <Button type="submit">{editing ? 'Save changes' : 'Add service'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {!isLoading && services.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No services yet — add your first one.</TableCell></TableRow>
            )}
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{s.category?.replace(/_/g, ' ')}</TableCell>
                <TableCell>{s.default_duration_minutes ? `${s.default_duration_minutes} min` : '—'}</TableCell>
                <TableCell>{s.default_price != null ? `£${Number(s.default_price).toFixed(2)}` : '—'}</TableCell>
                <TableCell>
                  <button onClick={() => toggleActive(s)}>
                    <Badge variant={s.active !== false ? 'secondary' : 'outline'}>{s.active !== false ? 'Active' : 'Inactive'}</Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
