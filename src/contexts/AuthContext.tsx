import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/integrations/firebase/config";
import { authService } from "@/services/auth.service";
import { User, UserRole, Permission, AuthContextValue } from "@/types/user.types";
import { hasPermission as checkPermission } from "@/utils/permissions";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const userProfile = await authService.getUserProfile(userId);
      if (userProfile) {
        setUser(userProfile);
        setRole(userProfile.role);
      } else {
        setUser(null);
        setRole(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser(null);
      setRole(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authService.signIn(email, password);
      
      if (result.error) {
        console.error("Sign in error:", result.error);
        return { error: result.error };
      }
      
      if (result.user) {
        // Wait for the user profile to be fetched
        await fetchUserProfile(result.user.uid);
      }
      
      return { error: null };
    } catch (error) {
      console.error("Unexpected sign in error:", error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setRole(null);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return checkPermission(role, permission);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
