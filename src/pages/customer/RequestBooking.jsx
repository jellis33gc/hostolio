import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Job, Property, Service } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const emptyForm = { property_id: '', service_id: '', preferred_start: '', notes: '' };

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

  const selectedProperty = properties.find((p) => p.id === form.property_id);

  const { data: services = [] } = useQuery({
    queryKey: ['booking-services', selectedProperty?.company_id],
    queryFn: () => Service.filter({ company_id: selectedProperty.company_id }),
    enabled: !!selectedProperty?.company_id,
  });
  const activeServices = services.filter((s) => s.active !== false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const service = services.find((s) => s.id === form.service_id);
      await Job.create({
        company_id: selectedProperty.company_id,
        customer_id: user.linked_customer_id,
        property_id: form.property_id,
        service_id: form.service_id || undefined,
        job_type: service?.category || 'other',
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
              <Select required value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v, service_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.address_line1}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Select required value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })} disabled={!form.property_id}>
                <SelectTrigger><SelectValue placeholder={form.property_id ? 'Select a service' : 'Choose a property first'} /></SelectTrigger>
                <SelectContent>
                  {activeServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.default_price != null ? ` — £${Number(s.default_price).toFixed(2)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.property_id && activeServices.length === 0 && (
                <p className="text-xs text-muted-foreground">No services published yet — contact us directly.</p>
              )}
              {form.service_id && services.find((s) => s.id === form.service_id)?.description && (
                <p className="text-xs text-muted-foreground">{services.find((s) => s.id === form.service_id).description}</p>
              )}
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
