import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast.error('Failed to load users');
      return;
    }

    // Fetch roles for each user
    const usersWithRoles = await Promise.all(
      (profilesData || []).map(async (profile) => {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id);

        return {
          ...profile,
          roles: rolesData?.map(r => r.role) || []
        };
      })
    );

    setUsers(usersWithRoles);
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
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.display_name}</TableCell>
                <TableCell>{user.age}</TableCell>
                <TableCell>{user.location}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {user.roles.map((role: string) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{user.rating}</TableCell>
                <TableCell>
                  <Badge variant={user.is_online ? 'default' : 'secondary'}>
                    {user.is_online ? 'Online' : 'Offline'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No users yet</p>
        )}
      </CardContent>
    </Card>
  );
}
