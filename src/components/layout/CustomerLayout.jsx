import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { CalendarPlus, Home, LogOut } from 'lucide-react';

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'My Visits', path: '/portal', icon: Home },
    { label: 'Request a booking', path: '/portal/request', icon: CalendarPlus },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="h-16 border-b bg-background flex items-center justify-between px-6">
        <span className="font-heading font-semibold text-lg tracking-tight">Hostolio</span>
        <nav className="flex items-center gap-1">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
          <span className="text-sm text-muted-foreground ml-3 mr-1">{user?.full_name || user?.email}</span>
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
