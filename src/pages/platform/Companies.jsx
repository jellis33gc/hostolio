import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Company, AppUser, Subscription } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Link2, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const BUSINESS_TYPES = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'holiday_let_management', label: 'Holiday let management' },
  { value: 'companionship_care', label: 'Companionship care' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

const emptyForm = { name: '', subdomain: '', business_types: [], admin_email: '' };

export default function Companies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [linkingId, setLinkingId] = useState(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['all-companies'],
    queryFn: () => Company.filter({}),
    enabled: !!user?.is_platform_owner,
  });
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: () => Subscription.filter({}),
    enabled: !!user?.is_platform_owner,
  });
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-companies', companies.map((c) => c.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(companies.map((c) => AppUser.filter({ company_id: c.id })));
      return results.flat();
    },
    enabled: !!user?.is_platform_owner && companies.length > 0,
  });

  const adminFor = (companyId) => allUsers.find((u) => u.company_id === companyId && u.role === 'admin');
  const moduleCountFor = (companyId) => (subscriptions.find((s) => s.company_id === companyId)?.enabled_modules || []).length;

  const toggleBusinessType = (val) => {
    setForm((prev) => ({
      ...prev,
      business_types: prev.business_types.includes(val)
        ? prev.business_types.filter((v) => v !== val)
        : [...prev.business_types, val],
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const matches = form.admin_email ? await AppUser.filter({ email: form.admin_email }) : [];
      const matchedUser = matches[0];
      const company = await Company.create({
        name: form.name,
        subdomain: form.subdomain || undefined,
        business_types: form.business_types,
        admin_invite_email: matchedUser || !form.admin_email ? undefined : form.admin_email,
      });
      if (matchedUser) {
        await AppUser.update(matchedUser.id, { role: matchedUser.role === 'admin' ? 'admin' : 'admin', company_id: company.id });
      }
      toast({
        title: 'Company created',
        description: matchedUser ? `${form.admin_email} linked as admin.` : (form.admin_email ? `${form.admin_email} needs to register first — link them from here once they have.` : undefined),
      });
      setForm(emptyForm);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['all-companies'] });
      queryClient.invalidateQueries({ queryKey: ['all-users-for-companies'] });
    } catch (err) {
      toast({ title: 'Could not create company', description: err.message, variant: 'destructive' });
    }
  };

  const handleLinkAdmin = async (company) => {
    setLinkingId(company.id);
    try {
      const matches = await AppUser.filter({ email: company.admin_invite_email });
      const matchedUser = matches[0];
      if (!matchedUser) {
        toast({ title: 'No matching account yet', description: `${company.admin_invite_email} hasn't registered.` });
        return;
      }
      await AppUser.update(matchedUser.id, { role: 'admin', company_id: company.id });
      await Company.update(company.id, { admin_invite_email: undefined });
      toast({ title: 'Admin linked' });
      queryClient.invalidateQueries({ queryKey: ['all-companies'] });
      queryClient.invalidateQueries({ queryKey: ['all-users-for-companies'] });
    } catch (err) {
      toast({ title: 'Could not link', description: err.message, variant: 'destructive' });
    } finally {
      setLinkingId(null);
    }
  };

  if (!user?.is_platform_owner) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Platform administration is not available on this account.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Every tenant on the platform. Create a company, then assign its admin and modules.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" />New company</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New company</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Subdomain (optional)</Label>
                <Input value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} placeholder="acme-cleaning" />
              </div>
              <div className="space-y-1.5">
                <Label>Business type(s)</Label>
                <div className="space-y-2">
                  {BUSINESS_TYPES.map((t) => (
                    <div key={t.value} className="flex items-center gap-2">
                      <Checkbox checked={form.business_types.includes(t.value)} onCheckedChange={() => toggleBusinessType(t.value)} />
                      <span className="text-sm">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Admin's email (optional — can add later)</Label>
                <Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="owner@acmecleaning.com" />
                <p className="text-xs text-muted-foreground">If they haven't registered yet, they'll need to sign up with this email — you can link them from this page afterwards.</p>
              </div>
              <DialogFooter>
                <Button type="submit">Create company</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && companies.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No companies yet — create the first one.</CardContent></Card>
        )}
        {companies.map((company) => {
          const admin = adminFor(company.id);
          return (
            <Card key={company.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> {company.name}
                </CardTitle>
                <Badge variant="outline">{moduleCountFor(company.id)} module{moduleCountFor(company.id) === 1 ? '' : 's'} enabled</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {admin ? (
                    <span>Admin: <span className="text-foreground font-medium">{admin.full_name || admin.email}</span></span>
                  ) : company.admin_invite_email ? (
                    <span>Pending admin: {company.admin_invite_email}</span>
                  ) : (
                    <span>No admin assigned yet</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!admin && company.admin_invite_email && (
                    <Button size="sm" variant="outline" onClick={() => handleLinkAdmin(company)} disabled={linkingId === company.id}>
                      <Link2 className="h-3.5 w-3.5 mr-1" /> Link admin
                    </Button>
                  )}
                  <Link to="/platform/modules"><Button size="sm" variant="ghost">Manage modules</Button></Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
