import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session, User, supabase } from '../services/supabase';
import { Tables } from '@multi-tenant-platform/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userDetails: Tables<'users'> | null;
  loading: boolean;
  role: string | null;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: Error | null;
    data: { user: User | null; session: Session | null } | null;
  }>;
  signOut: () => Promise<void>;
  isSuperuser: () => boolean;
  isSchoolAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userDetails, setUserDetails] = useState<Tables<'users'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      
      // If user exists, try to fetch their details including role
      if (session?.user) {
        fetchUserDetails(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      
      // If user exists, try to fetch their details including role
      if (session?.user) {
        fetchUserDetails(session.user.id);
      } else {
        setUserDetails(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Fetch user details directly from Supabase
  const fetchUserDetails = async (userId: string) => {
    try {
      // Use Supabase directly to get user data
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setUserDetails(data as Tables<'users'>);
        setRole(data.role);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (response.error) {
      return { error: response.error, data: null };
    }

    return { error: null, data: response.data };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserDetails(null);
    setRole(null);
  };
  
  // Helper functions to check user roles
  const isSuperuser = () => {
    return role === 'superuser';
  };
  
  const isSchoolAdmin = () => {
    return role === 'school_admin';
  };

  const value = {
    session,
    user,
    userDetails,
    loading,
    role,
    signIn,
    signOut,
    isSuperuser,
    isSchoolAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
