import { useState, useEffect } from "react";
import DashboardLayout, { hodNav } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, User as UserIcon, Mail, Phone, Trash2 } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { User } from "@/types/user.types";
import { AddUserDialog } from "@/components/forms/AddUserDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/user.types";
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

const HODUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // HOD can only see staff in their department
      const q = query(
        collection(db, "users"),
        where("department", "==", currentUser?.department),
        where("role", "==", UserRole.GENERAL_STAFF)
      );
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(u => !(u as any).isDeleted);
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      // Delete from Firebase Auth first
      await deleteAuthUser(deletingUser.id);
      // Then delete the Firestore document
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
    <DashboardLayout role="HOD Dashboard" navItems={hodNav}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Department Staff</h1>
          <p className="text-muted-foreground">Manage staff members in your department</p>
        </div>
        <AddUserDialog onUserAdded={fetchUsers} allowedRoles={[UserRole.GENERAL_STAFF]} defaultDepartment={currentUser?.department} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : users.length > 0 ? (
        <div className="grid gap-4">
          {users.map(user => (
            <div key={user.id} className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                    <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                      {user.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {user.phoneNumber}
                        </div>
                      )}
                      <div className="mt-1">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {user.department}
                        </span>
                        {(user as any).designation && (
                          <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {(user as any).designation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDeletingUser(user)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <UserIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No staff members yet</h3>
          <p className="text-muted-foreground mb-4">Add your first staff member to get started</p>
          <AddUserDialog onUserAdded={fetchUsers} allowedRoles={[UserRole.GENERAL_STAFF]} defaultDepartment={currentUser?.department} />
        </div>
      )}

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{deletingUser?.name}"? This will remove them from the system and revoke their login access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default HODUsers;
