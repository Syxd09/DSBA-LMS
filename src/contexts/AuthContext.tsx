import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'teacher' | 'student';
  email?: string;
  class?: string;
  subject?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: 'teacher' | 'student') => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users database
const demoUsers: Record<string, User & { password: string }> = {
  // Teachers
  'teacher1': {
    id: 'T001',
    username: 'teacher1',
    password: 'teacher123',
    name: 'Dr. Rajesh Kumar',
    role: 'teacher',
    email: 'rajesh.kumar@dsba.edu.in',
    subject: 'Computer Science'
  },
  'teacher2': {
    id: 'T002', 
    username: 'teacher2',
    password: 'teacher123',
    name: 'Prof. Priya Sharma',
    role: 'teacher',
    email: 'priya.sharma@dsba.edu.in',
    subject: 'Mathematics'
  },
  // Students
  'student1': {
    id: 'S001',
    username: 'student1', 
    password: 'student123',
    name: 'Arjun Patel',
    role: 'student',
    email: 'arjun.patel@dsba.edu.in',
    class: 'MCA 2nd Year'
  },
  'student2': {
    id: 'S002',
    username: 'student2',
    password: 'student123', 
    name: 'Sneha Reddy',
    role: 'student',
    email: 'sneha.reddy@dsba.edu.in',
    class: 'MBA 1st Year'
  },
  'student3': {
    id: 'S003',
    username: 'student3',
    password: 'student123',
    name: 'Vikram Singh', 
    role: 'student',
    email: 'vikram.singh@dsba.edu.in',
    class: 'BCA 3rd Year'
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('dsba_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('dsba_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string, role: 'teacher' | 'student'): Promise<boolean> => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const demoUser = demoUsers[username];
    
    if (demoUser && demoUser.password === password && demoUser.role === role) {
      const { password: _, ...userWithoutPassword } = demoUser;
      setUser(userWithoutPassword);
      localStorage.setItem('dsba_user', JSON.stringify(userWithoutPassword));
      toast.success(`Welcome ${demoUser.name}!`);
      setLoading(false);
      return true;
    } else {
      toast.error('Invalid credentials or role mismatch');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dsba_user');
    toast.success('Logged out successfully');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};