import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  KeyRound,
  User,
  Mail,
  Shield,
  Calendar,
  Search
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.role === 'superadmin',
  });

  // Filter users based on search query
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return await apiRequest('POST', '/api/auth/reset-password', { userId, newPassword });
    },
    onSuccess: (data) => {
      setIsResetDialogOpen(false);
      setSelectedUser(null);
      setNewPassword("");
      toast({
        title: "Password Reset Successfully",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Reset Failed",
        description: error.message || "An error occurred while resetting the password",
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = (user: UserType) => {
    setSelectedUser(user);
    setIsResetDialogOpen(true);
    setNewPassword("");
  };

  const handleConfirmReset = () => {
    if (!selectedUser || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({
      userId: selectedUser.id,
      newPassword
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'trainer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'client':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getUserDisplayName = (user: UserType) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.username;
  };

  const getUserInitials = (user: UserType) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    }
    return user.username[0]?.toUpperCase() || 'U';
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage user accounts and reset passwords</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <User className="h-6 w-6 mr-2" />
              All Users ({filteredUsers.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  data-testid="input-search-users"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${getUserDisplayName(u)}`} />
                          <AvatarFallback>{getUserInitials(u)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {getUserDisplayName(u)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(u.role)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        data-testid={`button-reset-password-${u.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(u)}
                        disabled={resetPasswordMutation.isPending}
                        className="flex items-center"
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && !usersLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {searchQuery ? "No users found matching your search" : "No users found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser ? getUserDisplayName(selectedUser) : 'user'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedUser && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${getUserDisplayName(selectedUser)}`} />
                    <AvatarFallback>{getUserInitials(selectedUser)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{getUserDisplayName(selectedUser)}</div>
                    <div className="text-sm text-gray-500">{selectedUser.email}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                data-testid="input-new-password"
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                The user will need to use this password to log in.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              data-testid="button-cancel-reset"
              variant="outline"
              onClick={() => setIsResetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-testid="button-confirm-reset"
              onClick={handleConfirmReset}
              disabled={!newPassword || newPassword.length < 6 || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}