import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Property, Customer } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const emptyForm = {
  customer_id: '', address_line1: '', address_line2: '', city: '', postcode: '',
  key_code: '', key_reference: '', access_notes: '', room_template: '',
};

export default function Properties() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', user?.company_id],
    queryFn: () => Property.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', user?.company_id],
    queryFn: () => Customer.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });

  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—';

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await Property.create({
        ...form,
        company_id: user.company_id,
        room_template: form.room_template.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast({ title: 'Property added' });
      setForm(emptyForm);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    } catch (err) {
      toast({ title: 'Could not add property', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground">Addresses jobs get booked against.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" />Add property</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add property</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select required value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Address line 1</Label>
                <Input required value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Address line 2</Label>
                <Input value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Postcode</Label>
                  <Input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Key code</Label>
                  <Input value={form.key_code} onChange={(e) => setForm({ ...form, key_code: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Key reference</Label>
                  <Input value={form.key_reference} onChange={(e) => setForm({ ...form, key_reference: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Access notes</Label>
                <Textarea value={form.access_notes} onChange={(e) => setForm({ ...form, access_notes: e.target.value })} placeholder="Alarm codes, pets, parking…" />
              </div>
              <div className="space-y-1.5">
                <Label>Room/area template (comma separated)</Label>
                <Input value={form.room_template} onChange={(e) => setForm({ ...form, room_template: e.target.value })} placeholder="Kitchen, Living room, Bathroom, Bedroom 1" />
              </div>
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Rooms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {!isLoading && properties.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No properties yet.</TableCell></TableRow>
            )}
            {properties.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{[p.address_line1, p.city, p.postcode].filter(Boolean).join(', ')}</TableCell>
                <TableCell>{customerName(p.customer_id)}</TableCell>
                <TableCell className="text-muted-foreground">{(p.room_template || []).join(', ') || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
