'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const [loading, setLoading] = useState(true);
  const { verifyToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
          toast.error('Authentication failed. Please try again.');
          router.push('/login');
          return;
        }

        if (token) {
          const success = await verifyToken(token);
          if (success) {
            toast.success('Successfully logged in!');
            router.push('/');
          } else {
            toast.error('Invalid authentication token.');
            router.push('/login');
          }
        } else {
          toast.error('No authentication token received.');
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, verifyToken, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return null;
}
