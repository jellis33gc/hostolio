import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Customer, AppUser } from '@/api/entities';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Customers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', preferred_contact_method: 'email' });
  const [linkingId, setLinkingId] = useState(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', user?.company_id],
    queryFn: () => Customer.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['company-users', user?.company_id],
    queryFn: () => AppUser.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      let invitedUser = null;
      if (form.email) {
        // Actually creates the account and emails them a portal invite — role
        // must be 'user'/'admin' at invite time, we re-role to 'customer' after.
        await base44.users.inviteUser(form.email, 'user');
        const matches = await AppUser.filter({ email: form.email });
        invitedUser = matches[0];
      }
      const created = await Customer.create({
        ...form,
        company_id: user.company_id,
        user_id: invitedUser?.id,
        invite_email: invitedUser ? undefined : (form.email || undefined),
      });
      if (invitedUser) {
        await AppUser.update(invitedUser.id, { role: 'customer', linked_customer_id: created.id });
      }
      toast({ title: 'Customer added', description: form.email ? `${form.email} will get an email to set up portal access.` : undefined });
      setForm({ name: '', email: '', phone: '', preferred_contact_method: 'email' });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err) {
      toast({ title: 'Could not add customer', description: err.message, variant: 'destructive' });
    }
  };

  const handleLink = async (customerRecord) => {
    setLinkingId(customerRecord.id);
    try {
      await base44.users.inviteUser(customerRecord.invite_email, 'user');
      const matches = await AppUser.filter({ email: customerRecord.invite_email });
      const matchedUser = matches[0];
      if (!matchedUser) {
        toast({ title: 'Invite re-sent', description: `${customerRecord.invite_email} hasn't completed sign-up yet.` });
        return;
      }
      await Customer.update(customerRecord.id, { user_id: matchedUser.id, invite_email: undefined });
      await AppUser.update(matchedUser.id, { role: 'customer', linked_customer_id: customerRecord.id });
      toast({ title: 'Linked' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err) {
      toast({ title: 'Could not link', description: err.message, variant: 'destructive' });
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Everyone you do work for.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" />Add customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add customer</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred contact</Label>
                <Select value={form.preferred_contact_method} onValueChange={(v) => setForm({ ...form, preferred_contact_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Preferred contact</TableHead>
              <TableHead>Portal access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {!isLoading && customers.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No customers yet.</TableCell></TableRow>
            )}
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.email || '—'}</TableCell>
                <TableCell>{c.phone || '—'}</TableCell>
                <TableCell className="capitalize">{c.preferred_contact_method}</TableCell>
                <TableCell>
                  {c.user_id ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : c.invite_email ? (
                    <Button size="sm" variant="outline" onClick={() => handleLink(c)} disabled={linkingId === c.id}>
                      <Link2 className="h-3.5 w-3.5 mr-1" /> Link account
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">No portal access</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
