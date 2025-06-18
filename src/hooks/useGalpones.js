// src/hooks/useGalpones.js
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../components/firebase';

export const useGalpones = () => {
  const [galpones, setGalpones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGalpones = async () => {
      try {
        const galponesSnapshot = await getDocs(collection(db, 'galpones'));
        const galponesData = galponesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGalpones(galponesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGalpones();
  }, []);

  return { galpones, loading, error };
};