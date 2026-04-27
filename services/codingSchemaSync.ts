
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Client, AdminProfile } from '../types';

export const syncCodingSchemaFamilies = async (sourceClientId: string, targetClientId: string) => {
  console.log(`Syncing families from ${sourceClientId} to ${targetClientId}...`);
  
  try {
    // 1. Get Source Profile
    const sourceDocRef = doc(db, 'clients', sourceClientId, 'settings', 'profile');
    const sourceSnap = await getDoc(sourceDocRef);
    
    if (!sourceSnap.exists()) {
      throw new Error(`Source profile not found for client ${sourceClientId}`);
    }
    
    const sourceData = sourceSnap.data() as AdminProfile;
    const sourceFamilies = sourceData.codingSchema?.diretto?.families;
    
    if (!sourceFamilies || sourceFamilies.length === 0) {
      console.warn("No families found in Source. Sync aborted to prevent clearing Target.");
      return { success: false, message: "Source families list is empty." };
    }
    
    console.log(`Found ${sourceFamilies.length} families in Source.`);

    // 2. Get Target Profile
    const targetDocRef = doc(db, 'clients', targetClientId, 'settings', 'profile');
    const targetSnap = await getDoc(targetDocRef);
    
    let targetData: AdminProfile;
    if (targetSnap.exists()) {
      targetData = targetSnap.data() as AdminProfile;
    } else {
      targetData = { companyName: 'Sandbox Client' } as AdminProfile; // Minimal profile
    }

    // 3. Update families in Target data
    if (!targetData.codingSchema) {
      targetData.codingSchema = {
        categories: [
          { name: 'DIRETTO', code: 'D' },
          { name: 'INDIRETTO', code: 'I' }
        ],
        diretto: { groups: [], macroFamilies: [], families: [], variants: [], revisions: [] },
        indiretto: { groups: [], macroFamilies: [], families: [], variants: [], revisions: [] }
      };
    }
    
    if (!targetData.codingSchema.diretto) {
      targetData.codingSchema.diretto = { groups: [], macroFamilies: [], families: [], variants: [], revisions: [] };
    }

    targetData.codingSchema.diretto.families = sourceFamilies;
    
    // 4. Save to Target
    await setDoc(targetDocRef, { 
      ...targetData, 
      updated_at: serverTimestamp() 
    }, { merge: true });
    
    console.log("Target profile updated successfully.");
    return { success: true, message: `Successfully synced ${sourceFamilies.length} families.` };
    
  } catch (error: any) {
    console.error("Migration error:", error);
    return { success: false, message: error.message };
  }
};
