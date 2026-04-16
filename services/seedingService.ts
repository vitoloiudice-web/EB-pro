import { Client, Item, Supplier, Customer, AdminProfile } from '../types';
import { db } from '../firebase';
import { collection, writeBatch, doc, getDocs, getDoc } from 'firebase/firestore';

export const seedingService = {
  syncFromProduction: async (sandboxClient: Client, prodClient: Client) => {
    if (sandboxClient.id !== 'sandbox-test') {
      throw new Error("La sincronizzazione è permessa solo verso l'ambiente Sandbox.");
    }

    const batch = writeBatch(db);

    // 1. Clear existing data in sandbox
    const collectionsToSync = ['items', 'suppliers', 'customers'];
    for (const collName of collectionsToSync) {
      const sandboxCollRef = collection(db, `clients/${sandboxClient.id}/${collName}`);
      const snapshot = await getDocs(sandboxCollRef);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
    }

    // 2. Copy data from production
    for (const collName of collectionsToSync) {
      const prodCollRef = collection(db, `clients/${prodClient.id}/${collName}`);
      const prodSnapshot = await getDocs(prodCollRef);
      
      prodSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        // Update client_id to sandbox
        data.client_id = sandboxClient.id;
        
        const sandboxDocRef = doc(db, `clients/${sandboxClient.id}/${collName}`, docSnap.id);
        batch.set(sandboxDocRef, data);
      });
    }

    // 3. Copy Admin Profile (Settings)
    const prodProfileRef = doc(db, 'clients', prodClient.id, 'settings', 'profile');
    const prodProfileSnap = await getDoc(prodProfileRef);
    if (prodProfileSnap.exists()) {
      const profileData = prodProfileSnap.data();
      const sandboxProfileRef = doc(db, 'clients', sandboxClient.id, 'settings', 'profile');
      batch.set(sandboxProfileRef, profileData);
    }

    // Commit the batch
    await batch.commit();
  }
};
