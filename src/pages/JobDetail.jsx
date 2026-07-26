import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Job, Property, Customer, Room, ClockEvent, Report, Company } from '@/api/entities';
import { base44 } from '@/api/base44Client';
import { buildJobReportPdf } from '@/lib/pdfReport';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { MapPin, Clock, LogIn, LogOut, AlertTriangle, CheckCircle2, Camera, Loader2, FileText } from 'lucide-react';

const GEOFENCE_FLAG_METERS = 250; // flagged for review, never blocks clock-in

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not available on this device'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });
}

function PhotoStrip({ urls = [], onAdd, onRemove, uploading, label }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div key={url + i} className="relative w-16 h-16 rounded-md overflow-hidden border group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Remove
            </button>
          </div>
        ))}
        <label className="w-16 h-16 rounded-md border border-dashed flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-muted">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onAdd} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

function RoomCard({ room, canEdit, onSaved }) {
  const { toast } = useToast();
  const [local, setLocal] = useState(room);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => setLocal(room), [room]);

  const patch = (fields) => {
    setLocal((prev) => ({ ...prev, ...fields }));
    setDirty(true);
  };

  const uploadPhoto = async (e, key, setUploading) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      const url = res?.file_url || res?.url;
      patch({ [key]: [...(local[key] || []), url] });
    } catch (err) {
      toast({ title: 'Photo upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (key, i) => {
    patch({ [key]: local[key].filter((_, idx) => idx !== i) });
  };

  const save = async () => {
    try {
      await Room.update(room.id, {
        before_photos: local.before_photos,
        after_photos: local.after_photos,
        initial_notes: local.initial_notes,
        completion_notes: local.completion_notes,
        severity_flag: local.severity_flag,
      });
      setDirty(false);
      toast({ title: `${room.name} saved` });
      onSaved();
    } catch (err) {
      toast({ title: 'Could not save room', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{room.name}</CardTitle>
        {local.severity_flag && local.severity_flag !== 'ok' && (
          <Badge variant="destructive" className="capitalize">{local.severity_flag.replace(/_/g, ' ')}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <PhotoStrip
          label="Before photos"
          urls={local.before_photos || []}
          uploading={uploadingBefore}
          onAdd={(e) => uploadPhoto(e, 'before_photos', setUploadingBefore)}
          onRemove={(i) => removePhoto('before_photos', i)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Condition</p>
            <Select value={local.severity_flag || 'ok'} onValueChange={(v) => patch({ severity_flag: v })} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="pre_existing_damage">Pre-existing damage</SelectItem>
                <SelectItem value="needs_attention">Needs attention</SelectItem>
                <SelectItem value="damage_occurred">Damage occurred</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Initial notes</p>
          <Textarea disabled={!canEdit} value={local.initial_notes || ''} onChange={(e) => patch({ initial_notes: e.target.value })} rows={2} />
        </div>
        <PhotoStrip
          label="After photos"
          urls={local.after_photos || []}
          uploading={uploadingAfter}
          onAdd={(e) => uploadPhoto(e, 'after_photos', setUploadingAfter)}
          onRemove={(i) => removePhoto('after_photos', i)}
        />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Completion notes</p>
          <Textarea disabled={!canEdit} value={local.completion_notes || ''} onChange={(e) => patch({ completion_notes: e.target.value })} rows={2} />
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={save} disabled={!dirty}>Save room</Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clocking, setClocking] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueText, setIssueText] = useState('');

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => (await Job.filter({ id }))[0],
  });
  const { data: property } = useQuery({
    queryKey: ['property', job?.property_id],
    queryFn: async () => (await Property.filter({ id: job.property_id }))[0],
    enabled: !!job?.property_id,
  });
  const { data: customer } = useQuery({
    queryKey: ['customer', job?.customer_id],
    queryFn: async () => (await Customer.filter({ id: job.customer_id }))[0],
    enabled: !!job?.customer_id,
  });
  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['rooms', id],
    queryFn: () => Room.filter({ job_id: id }, 'order'),
    enabled: !!job,
  });
  const { data: clockEvents = [] } = useQuery({
    queryKey: ['clock-events', id],
    queryFn: () => ClockEvent.filter({ job_id: id }),
    enabled: !!job,
  });
  const { data: company } = useQuery({
    queryKey: ['company', job?.company_id],
    queryFn: async () => (await Company.filter({ id: job.company_id }))[0],
    enabled: !!job?.company_id,
  });
  const { data: reports = [], refetch: refetchReports } = useQuery({
    queryKey: ['reports', id],
    queryFn: () => Report.filter({ job_id: id }, '-generated_at'),
    enabled: !!job,
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const latestReport = reports[0];

  const clockedIn = clockEvents.some((c) => c.event_type === 'clock_in');
  const clockedOut = clockEvents.some((c) => c.event_type === 'clock_out');
  const isAssignedStaff = job && user && job.assigned_staff_id === user.id;
  const canEdit = isAssignedStaff && clockedIn && !clockedOut;

  // Lazily create Room records from the property's room template the first
  // time the job is opened, so admins previewing an unstarted job don't
  // trigger this — only do it once staff actually clocks in.
  const ensureRooms = async () => {
    if (rooms.length > 0 || !property?.room_template?.length) return;
    await Promise.all(
      property.room_template.map((name, order) =>
        Room.create({
          company_id: job.company_id,
          job_id: job.id,
          assigned_staff_id: job.assigned_staff_id,
          name,
          order,
          severity_flag: 'ok',
        })
      )
    );
    refetchRooms();
  };

  const generateReport = async (freshClockEvents) => {
    setGeneratingReport(true);
    try {
      const pdfBlob = await buildJobReportPdf({
        job, property, customer, company, rooms,
        clockEvents: freshClockEvents || clockEvents,
      });
      const file = new File([pdfBlob], `job-report-${job.id}.pdf`, { type: 'application/pdf' });
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const pdf_url = uploadRes?.file_url || uploadRes?.url;
      await Report.create({
        company_id: job.company_id,
        job_id: job.id,
        pdf_url,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
      });
      refetchReports();
      toast({ title: 'Job report generated' });
    } catch (err) {
      toast({ title: 'Report generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleClock = async (eventType) => {
    setClocking(true);
    try {
      const pos = await getPosition();
      const { latitude, longitude, accuracy } = pos.coords;
      let flagged = false;
      let flagReason;
      if (property?.lat && property?.lng) {
        const dist = haversineMeters(latitude, longitude, property.lat, property.lng);
        if (dist > GEOFENCE_FLAG_METERS) {
          flagged = true;
          flagReason = `${Math.round(dist)}m from job address at ${eventType.replace('_', ' ')}`;
        }
      }
      await ClockEvent.create({
        company_id: job.company_id,
        job_id: job.id,
        staff_id: user.id,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        lat: latitude,
        lng: longitude,
        accuracy_meters: accuracy,
        flagged,
        flag_reason: flagReason,
      });
      if (eventType === 'clock_in') {
        await Job.update(job.id, { status: 'in_progress', actual_clock_in_at: new Date().toISOString() });
        await ensureRooms();
      } else {
        await Job.update(job.id, { status: 'completed', actual_clock_out_at: new Date().toISOString() });
      }
      toast({ title: eventType === 'clock_in' ? 'Clocked in' : 'Clocked out', description: flagged ? 'Location flagged for admin review — this will not block your job.' : undefined });
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['clock-events', id] });
      if (eventType === 'clock_out') {
        const freshEvents = [...clockEvents, { event_type: 'clock_out', timestamp: new Date().toISOString(), flagged }];
        generateReport(freshEvents);
      }
    } catch (err) {
      toast({ title: 'Could not record clock event', description: err.message, variant: 'destructive' });
    } finally {
      setClocking(false);
    }
  };

  const submitIssue = async () => {
    try {
      await Job.update(job.id, {
        special_instructions: `${job.special_instructions ? job.special_instructions + '\n\n' : ''}[Issue flagged ${format(new Date(), 'HH:mm')}] ${issueText}`,
      });
      toast({ title: 'Issue flagged — admin notified' });
      setIssueText('');
      setIssueOpen(false);
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    } catch (err) {
      toast({ title: 'Could not flag issue', description: err.message, variant: 'destructive' });
    }
  };

  if (jobLoading || !job) {
    return <AppLayout><p className="text-sm text-muted-foreground">Loading…</p></AppLayout>;
  }

  const address = property ? [property.address_line1, property.city, property.postcode].filter(Boolean).join(', ') : '';

  return (
    <AppLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/my-jobs" className="hover:underline">My Jobs</Link> / Job detail
          </p>
          <h1 className="text-2xl font-heading font-semibold tracking-tight capitalize mt-1">{job.job_type?.replace(/_/g, ' ')}</h1>
          <p className="text-sm text-muted-foreground">{customer?.name}</p>
        </div>
        <Badge variant="outline" className="capitalize text-sm">{job.status?.replace(/_/g, ' ')}</Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p>{address}</p>
                  {address && (
                    <a
                      className="text-primary text-xs hover:underline"
                      target="_blank" rel="noreferrer"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                    >
                      Get directions
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p>{job.scheduled_start ? format(new Date(job.scheduled_start), 'EEE d MMM, HH:mm') : 'Unscheduled'}</p>
              </div>
              {property?.key_code && <p><span className="text-muted-foreground">Key code:</span> {property.key_code}</p>}
              {property?.key_reference && <p><span className="text-muted-foreground">Key:</span> {property.key_reference}</p>}
              {property?.access_notes && <p className="text-muted-foreground">{property.access_notes}</p>}
              {job.special_instructions && (
                <div className="whitespace-pre-wrap border-t pt-2 mt-2">{job.special_instructions}</div>
              )}
            </CardContent>
          </Card>

          {isAssignedStaff && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                {!clockedIn && (
                  <Button className="w-full" onClick={() => handleClock('clock_in')} disabled={clocking}>
                    <LogIn className="h-4 w-4 mr-1.5" /> Clock in
                  </Button>
                )}
                {clockedIn && !clockedOut && (
                  <>
                    <Button className="w-full" variant="outline" onClick={() => setIssueOpen(true)}>
                      <AlertTriangle className="h-4 w-4 mr-1.5" /> Flag an issue
                    </Button>
                    <Button className="w-full" onClick={() => handleClock('clock_out')} disabled={clocking}>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Complete & clock out
                    </Button>
                  </>
                )}
                {clockedOut && (
                  <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-1.5">
                    <LogOut className="h-4 w-4" /> Job completed
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              {latestReport ? (
                <a href={latestReport.pdf_url} target="_blank" rel="noreferrer">
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-1.5" /> Download job report
                  </Button>
                </a>
              ) : (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={generatingReport || rooms.length === 0}
                  onClick={() => generateReport()}
                >
                  {generatingReport ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
                  {rooms.length === 0 ? 'No report yet' : 'Generate report'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          {!clockedIn && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Clock in to start the room checklist.</CardContent></Card>
          )}
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} canEdit={canEdit} onSaved={refetchRooms} />
          ))}
        </div>
      </div>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Flag an issue</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Breakage, missing item, access problem…"
            value={issueText}
            onChange={(e) => setIssueText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button onClick={submitIssue} disabled={!issueText.trim()}>Send to admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
