import { useState } from "react";
import DashboardLayout, { staffNav } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { auth } from "@/integrations/firebase/config";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { User, Lock } from "lucide-react";

const StaffSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phoneNumber: (user as any)?.phoneNumber || "",
  });

  const [pwData, setPwData] = useState({ current: "", newPw: "", confirm: "" });

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setProfileLoading(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        name: profileData.name,
        phoneNumber: profileData.phoneNumber,
      });
      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwData.newPw !== pwData.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (pwData.newPw.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !user?.email) return;
    setPwLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, pwData.current);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, pwData.newPw);
      setPwData({ current: "", newPw: "", confirm: "" });
      toast({ title: "Password changed successfully" });
    } catch (err: any) {
      const msg = err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
        ? "Current password is incorrect"
        : "Failed to change password";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <DashboardLayout role="Department Staff Dashboard" navItems={staffNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Profile Information</h2>
              <p className="text-sm text-muted-foreground">Update your personal details</p>
            </div>
          </div>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profileData.phoneNumber}
                onChange={e => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value="Department Staff" disabled className="bg-muted" />
            </div>
            {(user as any)?.designation && (
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={(user as any).designation} disabled className="bg-muted" />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={profileLoading} className="bg-accent hover:bg-accent/90">
                {profileLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setProfileData({ name: user?.name || "", phoneNumber: (user as any)?.phoneNumber || "" })}>
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Change Password</h2>
              <p className="text-sm text-muted-foreground">Update your password to keep your account secure</p>
            </div>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current Password</Label>
              <Input id="current" type="password" value={pwData.current} onChange={e => setPwData({ ...pwData, current: e.target.value })} placeholder="Enter current password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPw">New Password</Label>
              <Input id="newPw" type="password" value={pwData.newPw} onChange={e => setPwData({ ...pwData, newPw: e.target.value })} placeholder="Enter new password (min 6 chars)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm New Password</Label>
              <Input id="confirm" type="password" value={pwData.confirm} onChange={e => setPwData({ ...pwData, confirm: e.target.value })} placeholder="Re-enter new password" />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={pwLoading || !pwData.current || !pwData.newPw || !pwData.confirm}>
                {pwLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffSettings;
