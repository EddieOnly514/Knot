
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Login = () => {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleLogin = async (provider: 'apple' | 'google' | 'email') => {
    try {
      await login(provider);
      // After login, request location permission
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Location access granted');
            navigate('/home');
          },
          (error) => {
            console.log('Location access denied');
            navigate('/home');
          }
        );
      } else {
        navigate('/home');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-knot-blue rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <Card className="w-full max-w-sm p-8 shadow-lg border-0 bg-white animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-knot-blue mb-2">Knot</h1>
          <p className="text-gray-600 text-sm">Connect with fellow travelers</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => handleLogin('apple')}
            className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 rounded-xl transition-all duration-200"
          >
            Continue with Apple
          </Button>
          
          <Button
            onClick={() => handleLogin('google')}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 rounded-xl transition-all duration-200"
          >
            Continue with Google
          </Button>
          
          <Button
            onClick={() => handleLogin('email')}
            className="w-full bg-knot-blue hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-all duration-200"
          >
            Continue with Email
          </Button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
