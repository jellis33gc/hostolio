import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Staff, AppUser } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const emptyForm = { email: '', employment_type: 'employee', hourly_rate: '', skills: '', dbs_status: 'not_required' };

export default function StaffPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [linkingId, setLinkingId] = useState(null);

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff-list', user?.company_id],
    queryFn: () => Staff.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['company-users', user?.company_id],
    queryFn: () => AppUser.filter({ company_id: user.company_id }),
    enabled: !!user?.company_id,
  });

  const userFor = (userId) => users.find((u) => u.id === userId);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const matchedUser = users.find((u) => u.email?.toLowerCase() === form.email.toLowerCase());
      await Staff.create({
        company_id: user.company_id,
        user_id: matchedUser?.id,
        invite_email: matchedUser ? undefined : form.email,
        employment_type: form.employment_type,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        dbs_status: form.dbs_status,
      });
      if (matchedUser && matchedUser.role !== 'staff') {
        await AppUser.update(matchedUser.id, { role: 'staff', company_id: user.company_id });
      }
      toast({
        title: 'Staff added',
        description: matchedUser ? undefined : `${form.email} needs to register — link them once they've signed up.`,
      });
      setForm(emptyForm);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
    } catch (err) {
      toast({ title: 'Could not add staff', description: err.message, variant: 'destructive' });
    }
  };

  const handleLink = async (staffRecord) => {
    setLinkingId(staffRecord.id);
    try {
      const matchedUser = users.find((u) => u.email?.toLowerCase() === staffRecord.invite_email?.toLowerCase());
      if (!matchedUser) {
        toast({ title: 'No matching account yet', description: `${staffRecord.invite_email} hasn't registered.` });
        return;
      }
      await Staff.update(staffRecord.id, { user_id: matchedUser.id, invite_email: undefined });
      if (matchedUser.role !== 'staff') {
        await AppUser.update(matchedUser.id, { role: 'staff', company_id: user.company_id });
      }
      toast({ title: 'Linked' });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
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
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">Your team, their skills, and login access.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" />Add staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add staff member</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <p className="text-xs text-muted-foreground">If they haven't registered yet, they'll need to sign up with this email — you can link the account afterwards.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Employment type</Label>
                <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hourly rate</Label>
                <Input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Skills / tags (comma separated)</Label>
                <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="key_holder_trained, pet_friendly" />
              </div>
              <div className="space-y-1.5">
                <Label>DBS / background check status</Label>
                <Select value={form.dbs_status} onValueChange={(v) => setForm({ ...form, dbs_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_required">Not required</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
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
              <TableHead>Name / email</TableHead>
              <TableHead>Employment</TableHead>
              <TableHead>Skills</TableHead>
              <TableHead>DBS</TableHead>
              <TableHead>Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {!isLoading && staffList.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No staff yet.</TableCell></TableRow>
            )}
            {staffList.map((s) => {
              const linkedUser = userFor(s.user_id);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{linkedUser?.full_name || linkedUser?.email || s.invite_email || '—'}</TableCell>
                  <TableCell className="capitalize">{s.employment_type?.replace('_', ' ') || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{(s.skills || []).join(', ') || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={s.dbs_status === 'cleared' ? 'secondary' : s.dbs_status === 'expired' ? 'destructive' : 'outline'} className="capitalize">
                      {s.dbs_status?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.user_id ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleLink(s)} disabled={linkingId === s.id}>
                        <Link2 className="h-3.5 w-3.5 mr-1" /> Link account
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
