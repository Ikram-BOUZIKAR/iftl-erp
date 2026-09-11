import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingAccount, setPendingAccount] = useState(false);

  useEffect(() => {
    setPersistence(auth, browserSessionPersistence);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // block PrivateRoute while we load the profile
      try {
        if (!firebaseUser) {
          setUser(null);
          setUserProfile(null);
          setPendingAccount(false);
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profile = userDocSnap.data();
          // Block pending accounts — sign out immediately
          if (profile.statut === 'pending') {
            setPendingAccount(true);
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            return;
          }
          setUser(firebaseUser);
          setUserProfile(profile);
          setPendingAccount(false);
        } else {
          setUser(firebaseUser);
          setUserProfile({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'apprenant' });
          setPendingAccount(false);
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    setError(null);
    setPendingAccount(false);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setPendingAccount(false);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    user,
    userProfile,
    loading,
    error,
    pendingAccount,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole: (role) => userProfile?.role === role,
    hasAnyRole: (roles) => roles?.includes(userProfile?.role),
  };
}



