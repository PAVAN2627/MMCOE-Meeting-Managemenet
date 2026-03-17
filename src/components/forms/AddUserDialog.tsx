import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { secondaryAuth, db } from "@/integrations/firebase/config";
import { UserRole, StaffDesignation } from "@/types/user.types";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus } from "lucide-react";

interface AddUserDialogProps {
  onUserAdded?: () => void;
  /** When provided, this is the HOD flow — department is locked, role is fixed to general_staff, designation is shown */
  defaultDepartment?: string;
  /** When provided (principal flow), only these roles are shown */
  allowedRoles?: UserRole[];
}

export const AddUserDialog = ({ onUserAdded, defaultDepartment, allowedRoles }: AddUserDialogProps) => {
  const isHodFlow = !!defaultDepartment;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const emptyForm = {
    name: "",
    email: "",
    password: "",
    designation: "" as StaffDesignation | "",
    // principal flow fields
    role: "" as UserRole | "",
    department: "",
    phoneNumber: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  const resetForm = () => setFormData(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (isHodFlow && !formData.designation) {
      toast({ title: "Validation Error", description: "Please select a designation", variant: "destructive" });
      return;
    }

    if (!isHodFlow && !formData.role) {
      toast({ title: "Validation Error", description: "Please select a role", variant: "destructive" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const userId = userCredential.user.uid;

      await setDoc(doc(db, "users", userId), {
        email: formData.email,
        name: formData.name,
        role: isHodFlow ? UserRole.GENERAL_STAFF : formData.role,
        ...(isHodFlow
          ? { designation: formData.designation, department: defaultDepartment }
          : { department: formData.role === UserRole.ADMIN_STAFF ? null : (formData.department || null) }),
        phoneNumber: formData.phoneNumber || null,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await firebaseSignOut(secondaryAuth);

      toast({ title: "Success", description: `${formData.name} has been created successfully` });

      if (import.meta.env.VITE_EMAIL_SERVICE_URL) {
        try {
          await notificationService.sendWelcomeEmail({
            email: formData.email,
            name: formData.name,
            password: formData.password,
            role: isHodFlow
              ? (formData.designation as string)
              : formData.role === UserRole.HOD ? 'Head of Department' : 'Administrative Staff',
            createdBy: currentUser?.name || 'Administrator',
          });
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
        }
      }

      resetForm();
      setOpen(false);
      onUserAdded?.();
    } catch (error: any) {
      console.error("Error creating user:", error);
      let errorMessage = "Failed to create user";
      if (error.code === "auth/email-already-in-use") errorMessage = "This email is already registered";
      else if (error.code === "auth/invalid-email") errorMessage = "Invalid email address";
      else if (error.code === "auth/weak-password") errorMessage = "Password is too weak";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-accent hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" />
          Add {isHodFlow ? "Staff" : "User"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isHodFlow ? "Add Department Staff" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isHodFlow
              ? `Adding staff to ${defaultDepartment}`
              : "Create a new user account for your institution"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@institution.edu"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              disabled={loading}
              required
            />
          </div>

          {isHodFlow ? (
            /* HOD flow: show designation picker, department is locked */
            <>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation *</Label>
                <Select
                  value={formData.designation}
                  onValueChange={(v) => setFormData({ ...formData, designation: v as StaffDesignation })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(StaffDesignation).map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={defaultDepartment} disabled className="bg-muted" />
              </div>
            </>
          ) : (
            /* Principal flow: role (HOD / Admin Staff) + department */
            <>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({
                    ...formData,
                    role: v as UserRole,
                    // clear department when switching to admin staff
                    department: v === UserRole.ADMIN_STAFF ? "" : formData.department,
                  })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(!allowedRoles || allowedRoles.includes(UserRole.HOD)) && (
                      <SelectItem value={UserRole.HOD}>Head of Department</SelectItem>
                    )}
                    {(!allowedRoles || allowedRoles.includes(UserRole.ADMIN_STAFF)) && (
                      <SelectItem value={UserRole.ADMIN_STAFF}>Administrative Staff</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {formData.role !== UserRole.ADMIN_STAFF && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(v) => setFormData({ ...formData, department: v })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Engineering">Computer Engineering</SelectItem>
                      <SelectItem value="Information Technology">Information Technology</SelectItem>
                      <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                      <SelectItem value="Electronics and Telecommunication">Electronics and Telecommunication</SelectItem>
                      <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                      <SelectItem value="AIDS">AIDS</SelectItem>
                      <SelectItem value="Engineering Science and Humanities">Engineering Science and Humanities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+1234567890"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create User"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
