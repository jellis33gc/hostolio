import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useModuleAccess } from '@/lib/useModuleAccess';
import { moduleForPath } from '@/lib/modules';

/**
 * Wraps a route element so direct URL navigation to a module the company
 * hasn't purchased is blocked, not just hidden from the nav. The nav
 * filtering in AppLayout stops casual discovery; this stops someone typing
 * the URL directly.
 */
export default function ModuleGate({ children }) {
  const location = useLocation();
  const { isEnabled, isLoading } = useModuleAccess();
  const mod = moduleForPath(location.pathname);

  if (isLoading) return null;
  if (mod && !isEnabled(mod.key)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
