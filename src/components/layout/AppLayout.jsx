import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LayoutDashboard, ClipboardList, Users, Building2, LogOut, UserCog, CalendarClock, Plane, FolderLock, AlertTriangle, Receipt, Wrench } from 'lucide-react';
import { useModuleAccess } from '@/lib/useModuleAccess';
import { moduleForPath } from '@/lib/modules';

const ADMIN_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', path: '/jobs', icon: ClipboardList },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Properties', path: '/properties', icon: Building2 },
  { label: 'Services', path: '/services', icon: Wrench },
  { label: 'Staff', path: '/staff', icon: UserCog },
  { label: 'Leave requests', path: '/leave', icon: Plane },
  { label: 'Documents', path: '/documents', icon: FolderLock },
  { label: 'Disputes', path: '/disputes', icon: AlertTriangle },
  { label: 'Invoices', path: '/invoices', icon: Receipt },
];

const STAFF_NAV = [
  { label: 'My Jobs', path: '/my-jobs', icon: ClipboardList },
  { label: 'Availability', path: '/availability', icon: CalendarClock },
  { label: 'My Leave', path: '/leave', icon: Plane },
  { label: 'My Documents', path: '/documents', icon: FolderLock },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isEnabled } = useModuleAccess();
  const role = user?.role;
  const navItems = (role === 'staff' ? STAFF_NAV : ADMIN_NAV).filter((item) => {
    const mod = moduleForPath(item.path);
    return !mod || isEnabled(mod.key);
  });
  const initials = (user?.full_name || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-60 shrink-0 border-r bg-background flex flex-col">
        <div className="h-16 flex items-center px-5 border-b">
          <span className="font-heading font-semibold text-lg tracking-tight">Hostolio</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.full_name || user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
