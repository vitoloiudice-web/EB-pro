
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Client, AdminProfile } from '../types';

export const syncCodingSchemaFamilies = async (sandboxClientId: string, prodClientId: string) => {
  console.log(`Syncing families from ${sandboxClientId} to ${prodClientId}...`);
  
  try {
    // 1. Get Sandbox Profile
    const sandboxDocRef = doc(db, 'clients', sandboxClientId, 'settings', 'profile');
    const sandboxSnap = await getDoc(sandboxDocRef);
    
    if (!sandboxSnap.exists()) {
      throw new Error(`Sandbox profile not found for client ${sandboxClientId}`);
    }
    
    const sandboxData = sandboxSnap.data() as AdminProfile;
    const sandboxFamilies = sandboxData.codingSchema?.diretto?.families;
    
    if (!sandboxFamilies || sandboxFamilies.length === 0) {
      console.warn("No families found in Sandbox. Sync aborted to prevent clearing Production.");
      return { success: false, message: "Sandbox families list is empty." };
    }
    
    console.log(`Found ${sandboxFamilies.length} families in Sandbox.`);

    // 2. Get Production Profile
    const prodDocRef = doc(db, 'clients', prodClientId, 'settings', 'profile');
    const prodSnap = await getDoc(prodDocRef);
    
    let prodData: AdminProfile;
    if (prodSnap.exists()) {
      prodData = prodSnap.data() as AdminProfile;
    } else {
      prodData = { companyName: 'Centrale Acquisti' }; // Minimal profile
    }

    // 3. Update families in Production data
    if (!prodData.codingSchema) {
      prodData.codingSchema = {
        categories: [
          { name: 'DIRETTO', code: 'D' },
          { name: 'INDIRETTO', code: 'I' }
        ],
        diretto: { groups: [], macroFamilies: [], families: [], variants: [], revisions: [] },
        indiretto: { groups: [], macroFamilies: [], families: [], variants: [], revisions: [] }
      };
    }
    
    if (!prodData.codingSchema.diretto) {
      prodData.codingSchema.diretto = { groups: [], macroFamilies: [], families: [], variants: [], revisions: [] };
    }

    prodData.codingSchema.diretto.families = sandboxFamilies;
    
    // 4. Save to Production
    await setDoc(prodDocRef, { 
      ...prodData, 
      updated_at: serverTimestamp() 
    }, { merge: true });
    
    console.log("Production profile updated successfully.");
    return { success: true, message: `Successfully synced ${sandboxFamilies.length} families.` };
    
  } catch (error: any) {
    console.error("Migration error:", error);
    return { success: false, message: error.message };
  }
};
