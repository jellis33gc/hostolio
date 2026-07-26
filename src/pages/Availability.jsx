import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Availability } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState(DAYS.map((_, i) => ({ day_of_week: i, enabled: false, start_time: '09:00', end_time: '17:00', recordId: null })));
  const [saving, setSaving] = useState(false);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({ date: '', available: false, note: '' });

  const { data: availability = [], isLoading } = useQuery({
    queryKey: ['availability', user?.id],
    queryFn: () => Availability.filter({ staff_id: user.id }),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (isLoading) return;
    const recurring = availability.filter((a) => a.kind === 'recurring');
    setRows(DAYS.map((_, i) => {
      const existing = recurring.find((r) => r.day_of_week === i);
      return existing
        ? { day_of_week: i, enabled: true, start_time: existing.start_time || '09:00', end_time: existing.end_time || '17:00', recordId: existing.id }
        : { day_of_week: i, enabled: false, start_time: '09:00', end_time: '17:00', recordId: null };
    }));
  }, [availability, isLoading]);

  const exceptions = availability.filter((a) => a.kind === 'exception').sort((a, b) => (a.date > b.date ? 1 : -1));

  const updateRow = (i, fields) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...fields } : r)));

  const saveWeek = async () => {
    setSaving(true);
    try {
      await Promise.all(rows.map(async (row) => {
        if (row.enabled) {
          const payload = {
            company_id: user.company_id, staff_id: user.id, kind: 'recurring',
            day_of_week: row.day_of_week, start_time: row.start_time, end_time: row.end_time,
          };
          if (row.recordId) await Availability.update(row.recordId, payload);
          else await Availability.create(payload);
        } else if (row.recordId) {
          await Availability.delete(row.recordId);
        }
      }));
      toast({ title: 'Availability saved' });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    } catch (err) {
      toast({ title: 'Could not save availability', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addException = async (e) => {
    e.preventDefault();
    try {
      await Availability.create({
        company_id: user.company_id, staff_id: user.id, kind: 'exception',
        date: exceptionForm.date, available: exceptionForm.available, note: exceptionForm.note,
      });
      toast({ title: 'Exception added' });
      setExceptionForm({ date: '', available: false, note: '' });
      setExceptionOpen(false);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    } catch (err) {
      toast({ title: 'Could not add exception', description: err.message, variant: 'destructive' });
    }
  };

  const removeException = async (id) => {
    try {
      await Availability.delete(id);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    } catch (err) {
      toast({ title: 'Could not remove', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <h1 className="text-2xl font-heading font-semibold tracking-tight mb-1">Availability</h1>
      <p className="text-sm text-muted-foreground mb-6">Your recurring weekly pattern, plus one-off exceptions.</p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Weekly pattern</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row, i) => (
            <div key={row.day_of_week} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-36">
                <Switch checked={row.enabled} onCheckedChange={(v) => updateRow(i, { enabled: v })} />
                <span className="text-sm font-medium">{DAYS[row.day_of_week]}</span>
              </div>
              {row.enabled && (
                <div className="flex items-center gap-2">
                  <Input type="time" className="w-32" value={row.start_time} onChange={(e) => updateRow(i, { start_time: e.target.value })} />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input type="time" className="w-32" value={row.end_time} onChange={(e) => updateRow(i, { end_time: e.target.value })} />
                </div>
              )}
            </div>
          ))}
          <Button onClick={saveWeek} disabled={saving} className="mt-2">Save weekly pattern</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Exceptions</CardTitle>
          <Dialog open={exceptionOpen} onOpenChange={setExceptionOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Add exception</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a one-off exception</DialogTitle></DialogHeader>
              <form onSubmit={addException} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input required type="date" value={exceptionForm.date} onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={exceptionForm.available} onCheckedChange={(v) => setExceptionForm({ ...exceptionForm, available: v })} />
                  <span className="text-sm">{exceptionForm.available ? 'Extra availability' : "I'm unavailable this day"}</span>
                </div>
                <div className="space-y-1.5">
                  <Label>Note</Label>
                  <Textarea value={exceptionForm.note} onChange={(e) => setExceptionForm({ ...exceptionForm, note: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No exceptions on record.</p>}
          <div className="space-y-2">
            {exceptions.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{format(new Date(ex.date), 'EEE d MMM yyyy')}</span>
                  <Badge variant={ex.available ? 'secondary' : 'destructive'} className="ml-2">{ex.available ? 'Available' : 'Unavailable'}</Badge>
                  {ex.note && <p className="text-xs text-muted-foreground mt-0.5">{ex.note}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeException(ex.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
