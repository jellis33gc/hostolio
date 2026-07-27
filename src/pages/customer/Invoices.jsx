import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Invoice } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';

const STATUS_VARIANT = { draft: 'outline', sent: 'default', paid: 'secondary', overdue: 'destructive', cancelled: 'outline' };

export default function CustomerInvoices() {
  const { user } = useAuth();
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['my-customer-invoices', user?.linked_customer_id],
    queryFn: () => Invoice.filter({ customer_id: user.linked_customer_id }),
    enabled: !!user?.linked_customer_id,
  });

  return (
    <CustomerLayout>
      <h1 className="text-2xl font-heading font-semibold tracking-tight mb-1">Invoices</h1>
      <p className="text-sm text-muted-foreground mb-6">Your billing history.</p>
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
        {invoices.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">£{Number(inv.amount_total || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    Issued {inv.issued_at ? format(new Date(inv.issued_at), 'd MMM yyyy') : '—'}
                    {inv.due_date && ` · Due ${format(new Date(inv.due_date), 'd MMM yyyy')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[inv.status]} className="capitalize">{inv.status}</Badge>
                <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline">Download</a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </CustomerLayout>
  );
}
