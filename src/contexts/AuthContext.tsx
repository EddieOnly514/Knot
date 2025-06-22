
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface AuthContextType {
  user: User | null;
  login: (provider: 'apple' | 'google' | 'email', credentials?: any) => Promise<void>;
  logout: () => void;
  updateLocation: (lat: number, lng: number) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for existing session
    const savedUser = localStorage.getItem('knot_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (provider: 'apple' | 'google' | 'email', credentials?: any) => {
    setIsLoading(true);
    
    // Simulate authentication
    const mockUser: User = {
      id: `user_${Date.now()}`,
      name: credentials?.name || 'John Doe',
      email: credentials?.email || 'john@example.com',
    };
    
    setUser(mockUser);
    localStorage.setItem('knot_user', JSON.stringify(mockUser));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('knot_user');
  };

  const updateLocation = (lat: number, lng: number) => {
    if (user) {
      const updatedUser = { ...user, location: { lat, lng } };
      setUser(updatedUser);
      localStorage.setItem('knot_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateLocation, isLoading }}>
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
