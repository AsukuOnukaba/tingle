import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel('admin-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error('Failed to load transactions');
      return;
    }

    setTransactions(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>
                  {new Date(tx.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="capitalize">{tx.type}</TableCell>
                <TableCell className="font-medium">${tx.amount}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      tx.status === 'completed' ? 'default' :
                      tx.status === 'failed' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {tx.status}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{tx.payment_provider || '-'}</TableCell>
                <TableCell className="text-xs">{tx.reference || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {transactions.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No transactions yet</p>
        )}
      </CardContent>
    </Card>
  );
}
