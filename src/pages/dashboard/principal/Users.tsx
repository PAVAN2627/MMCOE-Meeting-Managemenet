import { useState, useEffect } from "react";
import DashboardLayout, { principalNav } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Users as UsersIcon, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import { collection, query, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { User, UserRole } from "@/types/user.types";
import { AddUserDialog } from "@/components/forms/AddUserDialog";
import { EditUserDialog } from "@/components/forms/EditUserDialog";
import { useToast } from "@/hooks/use-toast";
import { deleteAuthUser } from "@/lib/firebaseAdmin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PrincipalUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | UserRole>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(user => !(user as any).isDeleted); // Filter out deleted users
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.role === filter);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.PRINCIPAL:
        return 'bg-purple-100 text-purple-800';
      case UserRole.HOD:
        return 'bg-blue-100 text-blue-800';
      case UserRole.ADMIN_STAFF:
        return 'bg-green-100 text-green-800';
      case UserRole.GENERAL_STAFF:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRole = (role: UserRole) => {
    return role.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await deleteAuthUser(deletingUser.id);
      await deleteDoc(doc(db, "users", deletingUser.id));
      toast({ title: "User deleted", description: `${deletingUser.name} has been permanently removed.` });
      setDeletingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="Principal Dashboard" navItems={principalNav}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">Manage all institutional users</p>
        </div>
        <AddUserDialog onUserAdded={fetchUsers} allowedRoles={[UserRole.HOD, UserRole.ADMIN_STAFF]} />
      </div>

      <div className="mb-6 flex gap-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All
        </Button>
        <Button 
          variant={filter === UserRole.PRINCIPAL ? 'default' : 'outline'}
          onClick={() => setFilter(UserRole.PRINCIPAL)}
          size="sm"
        >
          Principal
        </Button>
        <Button 
          variant={filter === UserRole.HOD ? 'default' : 'outline'}
          onClick={() => setFilter(UserRole.HOD)}
          size="sm"
        >
          HOD
        </Button>
        <Button 
          variant={filter === UserRole.ADMIN_STAFF ? 'default' : 'outline'}
          onClick={() => setFilter(UserRole.ADMIN_STAFF)}
          size="sm"
        >
          Admin Staff
        </Button>
        <Button 
          variant={filter === UserRole.GENERAL_STAFF ? 'default' : 'outline'}
          onClick={() => setFilter(UserRole.GENERAL_STAFF)}
          size="sm"
        >
          General Staff
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid gap-4">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {formatRole(user.role)}
                    </span>
                    {!user.isActive && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                    {user.phoneNumber && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {user.phoneNumber}
                      </div>
                    )}
                    {user.department && (
                      <div className="text-sm">
                        Department: {user.department}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingUser(user)}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDeletingUser(user)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No users found</h3>
          <p className="text-muted-foreground mb-4">
            {filter === 'all' ? 'Add your first user to get started' : `No ${formatRole(filter as UserRole)} users`}
          </p>
          <AddUserDialog onUserAdded={fetchUsers} allowedRoles={[UserRole.HOD, UserRole.ADMIN_STAFF]} />
        </div>
      )}

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onUserUpdated={fetchUsers}
        />
      )}

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {deletingUser?.name}? This will remove them from the system and revoke their login access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default PrincipalUsers;
