import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Job, Property } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const JOB_TYPES = ['clean', 'deep_clean', 'checkin_prep', 'checkout_turnover', 'companionship_visit', 'maintenance', 'other'];

const emptyForm = { property_id: '', job_type: 'clean', preferred_start: '', notes: '' };

export default function RequestBooking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['my-properties', user?.linked_customer_id],
    queryFn: () => Property.filter({ customer_id: user.linked_customer_id }),
    enabled: !!user?.linked_customer_id,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await Job.create({
        company_id: properties.find((p) => p.id === form.property_id)?.company_id,
        customer_id: user.linked_customer_id,
        property_id: form.property_id,
        job_type: form.job_type,
        scheduled_start: new Date(form.preferred_start).toISOString(),
        special_instructions: form.notes,
        status: 'draft',
        requested_by_customer: true,
      });
      toast({ title: 'Request sent', description: "We'll confirm your booking shortly." });
      queryClient.invalidateQueries({ queryKey: ['my-customer-jobs'] });
      navigate('/portal');
    } catch (err) {
      toast({ title: 'Could not submit request', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <h1 className="text-2xl font-heading font-semibold tracking-tight mb-1">Request a booking</h1>
      <p className="text-sm text-muted-foreground mb-6">Tell us what you need — we'll confirm the exact time with you.</p>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Property</Label>
              <Select required value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.address_line1}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service type</Label>
              <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred date & time</Label>
              <Input required type="datetime-local" value={form.preferred_start} onChange={(e) => setForm({ ...form, preferred_start: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything we should know…" />
            </div>
            <Button type="submit" disabled={submitting || !properties.length}>Send request</Button>
            {!properties.length && <p className="text-xs text-muted-foreground">No properties on file yet — contact us to get set up.</p>}
          </form>
        </CardContent>
      </Card>
    </CustomerLayout>
  );
}
