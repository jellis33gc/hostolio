import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, MapPin, FileText, Users, CalendarClock, Receipt, ShieldCheck } from 'lucide-react';

const FEATURES = [
  { icon: ClipboardList, title: 'Job scheduling & assignment', desc: 'Book visits, assign staff, and track status from draft to invoiced.' },
  { icon: MapPin, title: 'GPS clock in/out', desc: 'Staff clock in on-site; location is checked and flagged for review if something looks off — never blocking the job.' },
  { icon: FileText, title: 'Auto-generated reports', desc: 'Before/after photos, notes, and timing are compiled into a branded PDF the moment a job is completed.' },
  { icon: Users, title: 'Customer self-service portal', desc: 'Customers can view visit history, download reports, request bookings, and raise issues themselves.' },
  { icon: CalendarClock, title: 'Availability & leave', desc: 'Staff set their own weekly availability and request holiday or sickness leave for approval.' },
  { icon: Receipt, title: 'Invoicing built in', desc: 'Turn completed jobs into a branded invoice in a couple of clicks.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="font-heading font-semibold text-lg tracking-tight">Hostolio</span>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost">Log in</Button></Link>
          <Link to="/register"><Button>Get started</Button></Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-20">
        <h1 className="text-4xl md:text-5xl font-heading font-semibold tracking-tight mb-5">
          Run your cleaning & property maintenance business from one place
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Scheduling, staff, customer bookings, reports, and invoicing — built for teams who look after other people's properties.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/register"><Button size="lg">Get started</Button></Link>
          <Link to="/login"><Button size="lg" variant="outline">Log in</Button></Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="pt-6">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="font-medium text-sm mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Hostolio</span>
          <span>© {new Date().getFullYear()} Hostolio. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
