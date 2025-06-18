import { db } from '../components/firebase';
import { collection, getDocs } from 'firebase/firestore';

let cachedReportsData = null;

export const preloadReportsData = async () => {
  if (cachedReportsData) return cachedReportsData;
  
  try {
    const galponesSnapshot = await getDocs(collection(db, 'galpones'));
    const mantenimientosPromises = galponesSnapshot.docs.map(async galponDoc => {
      const mantenimientosRef = collection(db, `galpones/${galponDoc.id}/mantenimientos`);
      const snapshot = await getDocs(mantenimientosRef);
      return snapshot.docs.map(doc => ({ id: doc.id, galponId: galponDoc.id, ...doc.data() }));
    });

    cachedReportsData = (await Promise.all(mantenimientosPromises)).flat();
    return cachedReportsData;
  } catch (error) {
    console.error("Error en precarga:", error);
    return null;
  }
};

export const getCachedReportsData = () => cachedReportsData;