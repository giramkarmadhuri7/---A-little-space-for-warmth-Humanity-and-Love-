import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface AdminProfile {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  authLoading: boolean;
  adminProfile: AdminProfile | null;
  adminSessionToken: string | null;
  signInWithGoogle: () => Promise<User>;
  signOutAll: () => Promise<void>;
  setAdminSession: (profile: AdminProfile, sessionToken: string) => void;
  clearAdminSession: () => void;
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  adminUpload: (
    url: string,
    formData: FormData,
    onProgress?: (percent: number) => void
  ) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setAdminProfile(null);
        setAdminSessionToken(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleAuthProvider);
    setFirebaseUser(result.user);
    return result.user;
  }, []);

  const setAdminSession = useCallback(
    (profile: AdminProfile, sessionToken: string) => {
      setAdminProfile(profile);
      setAdminSessionToken(sessionToken);
    },
    []
  );

  const clearAdminSession = useCallback(() => {
    setAdminProfile(null);
    setAdminSessionToken(null);
  }, []);

  const signOutAll = useCallback(async () => {
    setAdminProfile(null);
    setAdminSessionToken(null);
    await firebaseSignOut(auth);
  }, []);

  const adminFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not signed in with Google');
      }
      const idToken = await currentUser.getIdToken();
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${idToken}`);
      if (adminSessionToken) {
        headers.set('X-Admin-Session', adminSessionToken);
      }
      const res = await fetch(url, { ...init, headers });
      if (res.status === 401 || res.status === 403) {
        if (res.status === 403) {
          // Session expired or invalid
          const cloned = res.clone();
          const data = await cloned.json().catch(() => ({}));
          if (
            typeof data?.error === 'string' &&
            data.error.toLowerCase().includes('session')
          ) {
            setAdminSessionToken(null);
            setAdminProfile(null);
          }
        }
      }
      return res;
    },
    [adminSessionToken]
  );

  const adminUpload = useCallback(
    async (
      url: string,
      formData: FormData,
      onProgress?: (percent: number) => void
    ) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not signed in with Google');
      }
      const idToken = await currentUser.getIdToken();

      return await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.timeout = 90000;
        xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
        if (adminSessionToken) {
          xhr.setRequestHeader('X-Admin-Session', adminSessionToken);
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
            onProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status > 599) {
            reject(
              new Error(
                'Upload could not reach the server. Please check your internet connection and try again.'
              )
            );
            return;
          }
          if (onProgress && xhr.status >= 200 && xhr.status < 300) {
            onProgress(100);
          }
          if (xhr.status === 403) {
            try {
              const data = JSON.parse(xhr.responseText || '{}');
              if (
                typeof data?.error === 'string' &&
                data.error.toLowerCase().includes('session')
              ) {
                setAdminSessionToken(null);
                setAdminProfile(null);
              }
            } catch {
              // ignore non-JSON response
            }
          }
          const contentType =
            xhr.getResponseHeader('Content-Type') || 'application/json';
          resolve(
            new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText || 'OK',
              headers: { 'Content-Type': contentType },
            })
          );
        };

        xhr.ontimeout = () => {
          reject(
            new Error(
              'Image upload timed out. Please try a smaller photograph or stronger connection.'
            )
          );
        };

        xhr.onerror = () => {
          reject(new Error('Network error while uploading image. Please try again.'));
        };

        xhr.onabort = () => {
          reject(new Error('Image upload was cancelled.'));
        };

        xhr.send(formData);
      });
    },
    [adminSessionToken]
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        authLoading,
        adminProfile,
        adminSessionToken,
        signInWithGoogle,
        signOutAll,
        setAdminSession,
        clearAdminSession,
        adminFetch,
        adminUpload,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
