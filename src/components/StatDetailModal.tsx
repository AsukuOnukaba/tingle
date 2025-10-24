import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: LucideIcon;
  data: any[];
  type: 'users' | 'creators' | 'transactions' | 'uploads' | 'earnings' | 'sales' | 'balance';
}

export const StatDetailModal = ({ isOpen, onClose, title, icon: Icon, data, type }: StatDetailModalProps) => {
  const renderContent = () => {
    switch (type) {
      case 'users':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.user_id}>
                  <TableCell className="font-mono text-xs">
                    {item.user_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="font-semibold">${item.balance?.toFixed(2)}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'creators':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Bio</TableHead>
                <TableHead>Uploads</TableHead>
                <TableHead>Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant={item.status === 'approved' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{item.bio || 'No bio'}</TableCell>
                  <TableCell>{item.total_uploads}</TableCell>
                  <TableCell className="font-semibold">${item.earnings?.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'transactions':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant={item.type === 'credit' ? 'default' : 'secondary'}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">${item.amount?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'uploads':
      case 'sales':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title || 'Untitled'}</TableCell>
                  <TableCell>
                    <Badge>{item.type}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">${item.price?.toFixed(2)}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'earnings':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-500">
                    ${data.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Transactions</div>
                  <div className="text-2xl font-bold">{data.length}</div>
                </CardContent>
              </Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-semibold text-green-500">
                      +${item.amount?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.type || 'Purchase'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case 'balance':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Available</div>
                  <div className="text-xl font-bold text-green-500">
                    ${data[0]?.balance?.toFixed(2) || '0.00'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Credits</div>
                  <div className="text-xl font-bold text-blue-500">
                    ${data.filter((t: any) => t.type === 'credit').reduce((sum: number, t: any) => sum + Number(t.amount), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Debits</div>
                  <div className="text-xl font-bold text-red-500">
                    ${data.filter((t: any) => t.type === 'debit').reduce((sum: number, t: any) => sum + Number(t.amount), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 10).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === 'credit' ? 'default' : 'secondary'}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={item.type === 'credit' ? 'text-green-500' : 'text-red-500'}>
                      {item.type === 'credit' ? '+' : '-'}${item.amount?.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${item.balance_after?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      default:
        return <div className="text-center text-muted-foreground py-8">No data available</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Icon className="w-5 h-5" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {data.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No data available</div>
          ) : (
            renderContent()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
