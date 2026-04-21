import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  runTransaction, 
  addDoc, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { DocumentType, GeneratedDocument } from '../types';

/**
 * Generates the next progressive number for a specific document type
 * @param type The document type (e.g., 'ORDINE_ACQUISTO')
 * @returns The next number as a string (e.g., '001', '002'...)
 */
export const getNextDocumentNumber = async (type: DocumentType): Promise<string> => {
  const counterRef = doc(db, 'document_counters', type);
  
  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    
    let newValue = 1;
    if (counterDoc.exists()) {
      newValue = counterDoc.data().current_value + 1;
    }
    
    transaction.set(counterRef, {
      doc_tipo: type,
      current_value: newValue,
      updated_at: serverTimestamp()
    });
    
    // Return padded number (e.g., 001)
    return newValue.toString().padStart(3, '0');
  });
};

/**
 * Persists document metadata to Firestore
 * @param document Data to persist
 * @returns The inserted document ID
 */
export const persistGeneratedDocument = async (document: GeneratedDocument): Promise<string> => {
  const docData = {
    ...document,
    created_by: auth.currentUser?.uid || 'anonymous',
    created_at: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, 'generated_documents'), docData);
  return docRef.id;
};

/**
 * Combines number generation and persistence
 */
export const generateAndPersistDocument = async (
  type: DocumentType,
  refId: string,
  refType: 'CLIENT' | 'SUPPLIER',
  prefix: string = '',
  pdfBase64?: string
): Promise<{ docNumber: string; id: string }> => {
  const nextNum = await getNextDocumentNumber(type);
  const fullDocNum = prefix ? `${prefix}-${nextNum}` : nextNum;
  
  const id = await persistGeneratedDocument({
    doc_tipo: type,
    doc_num: fullDocNum,
    doc_data: new Date().toISOString(),
    doc_ref_id: refId,
    doc_ref_type: refType,
    pdf_backup_url: pdfBase64 // Storing base64 as backup in Firestore for now
  });
  
  return { docNumber: fullDocNum, id };
};
