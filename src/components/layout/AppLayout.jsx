import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LayoutDashboard, ClipboardList, Users, Building2, LogOut, UserCog, CalendarClock, Plane, FolderLock, AlertTriangle, Receipt, Wrench, ShieldCheck } from 'lucide-react';
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

const PLATFORM_NAV = [
  { label: 'Companies', path: '/platform/companies', icon: Building2 },
  { label: 'Module Manager', path: '/platform/modules', icon: ShieldCheck },
];

function NavLink({ label, path, icon: Icon, active }) {
  return (
    <Link
      to={path}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isEnabled } = useModuleAccess();
  const role = user?.role;
  const isPlatformOwner = !!user?.is_platform_owner;
  // A platform owner isn't necessarily running a tenant themselves — only
  // show operational nav once their account is actually linked to a company.
  const hasTenant = !!user?.company_id;

  const tenantNavItems = hasTenant
    ? (role === 'staff' ? STAFF_NAV : ADMIN_NAV).filter((item) => {
        const mod = moduleForPath(item.path);
        return !mod || isEnabled(mod.key);
      })
    : [];

  const initials = (user?.full_name || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-60 shrink-0 border-r bg-background flex flex-col">
        <div className="h-16 flex items-center px-5 border-b">
          <span className="font-heading font-semibold text-lg tracking-tight">Hostolio</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {isPlatformOwner && (
            <div>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Platform</p>
              <div className="space-y-1">
                {PLATFORM_NAV.map((item) => (
                  <NavLink key={item.path} {...item} active={location.pathname.startsWith(item.path)} />
                ))}
              </div>
            </div>
          )}
          {tenantNavItems.length > 0 && (
            <div>
              {isPlatformOwner && (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Your Company</p>
              )}
              <div className="space-y-1">
                {tenantNavItems.map((item) => (
                  <NavLink key={item.path} {...item} active={location.pathname.startsWith(item.path)} />
                ))}
              </div>
            </div>
          )}
          {isPlatformOwner && !hasTenant && (
            <p className="px-3 text-xs text-muted-foreground">
              Not linked to a company of your own yet — create one under Companies if you want to run a tenant here too.
            </p>
          )}
        </nav>
        <div className="border-t p-3 flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.full_name || user?.email}</p>
            <p className="text-xs text-muted-foreground">
              {isPlatformOwner ? 'Platform owner' : role}
            </p>
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
