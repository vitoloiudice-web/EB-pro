import React, { useState, useEffect } from 'react';
import { AdminProfile, Client } from '../types';
import { dataService } from '../services/dataService';
import LogoUploadModal from './LogoUploadModal';

interface AdminProfileViewProps {
  client: Client;
}

interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  className?: string;
}

const InputField = ({ label, name, value, onChange, disabled, className = "" }: InputFieldProps) => (
  <div className={className}>
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 pl-1">{label}</label>
    <input 
      type="text" 
      name={name} 
      value={value} 
      onChange={onChange} 
      disabled={disabled}
      className={`w-full neu-input py-3 px-4 text-sm font-medium text-slate-700 transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-100'}`}
    />
  </div>
);

const AdminProfileView: React.FC<AdminProfileViewProps> = ({ client }) => {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AdminProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!client) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await dataService.getAdminProfile(client);
        if (data) {
          const adminData = data as AdminProfile;
          setProfile(adminData);
          setFormData(adminData);
          if (adminData.logoUrl) setLogoPreview(adminData.logoUrl);
        } else {
          // Initialize empty profile if none exists
          const emptyProfile: AdminProfile = {
            companyName: client.name || '',
            vatNumber: '',
            taxId: '',
            email: '',
            phone: '',
            website: '',
            address: '',
            zipCode: '',
            city: '',
            province: '',
            country: 'Italia',
            bankName: '',
            iban: '',
            swift: '',
            logoUrl: ''
          };
          setProfile(emptyProfile);
          setFormData(emptyProfile);
        }
      } catch (error: any) {
        console.error("Failed to fetch admin profile", error);
        
        // Handle offline error gracefully by initializing an empty profile
        let isOfflineError = false;
        try {
          const errInfo = JSON.parse(error.message);
          if (errInfo.error && errInfo.error.includes('client is offline')) isOfflineError = true;
        } catch {
          if (error.message && error.message.includes('client is offline')) isOfflineError = true;
        }

        if (isOfflineError) {
          const emptyProfile: AdminProfile = {
            companyName: client.name || '',
            vatNumber: '',
            taxId: '',
            email: '',
            phone: '',
            website: '',
            address: '',
            zipCode: '',
            city: '',
            province: '',
            country: 'Italia',
            bankName: '',
            iban: '',
            swift: '',
            logoUrl: ''
          };
          setProfile(emptyProfile);
          setFormData(emptyProfile);
        } else {
          setError("Impossibile caricare il profilo. Riprova più tardi.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (formData) {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        if (formData) {
          setFormData({ ...formData, logoUrl: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoSave = (base64String: string) => {
    setLogoPreview(base64String);
    if (formData) {
      setFormData({ ...formData, logoUrl: base64String });
    }
    // Auto-save if not in edit mode
    if (!isEditing && client && formData) {
      const updatedData = { ...formData, logoUrl: base64String };
      dataService.saveAdminProfile(client, updatedData).then(() => {
        setProfile(updatedData);
        setSuccess("Logo aggiornato con successo!");
        setTimeout(() => setSuccess(null), 3000);
      }).catch(err => {
        setError(`Errore salvataggio logo: ${err.message}`);
        setTimeout(() => setError(null), 5000);
      });
    }
  };

  const handleSave = async () => {
    if (!client || !formData) return;
    try {
      await dataService.saveAdminProfile(client, formData);
      setProfile(formData);
      setIsEditing(false);
      setSuccess("Dati aziendali aggiornati con successo!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Errore salvataggio profilo: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setLogoPreview(profile?.logoUrl || null);
    setIsEditing(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!client) return (
    <div className="p-10 text-center max-w-md mx-auto">
      <div className="neu-flat p-8 rounded-3xl">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
        <h3 className="text-xl font-bold text-slate-700 mb-2">Nessuna Azienda Selezionata</h3>
        <p className="text-sm text-slate-500 mb-6">
          Per configurare il profilo aziendale, devi prima selezionare un'azienda dal menu in alto o crearne una nuova nella sezione Anagrafiche.
        </p>
      </div>
    </div>
  );

  if (!formData) return (
    <div className="p-10 text-center">
      <div className="neu-flat p-8 rounded-3xl inline-block">
        <p className="text-red-500 font-bold">Errore critico nel caricamento dei dati.</p>
        <button onClick={() => window.location.reload()} className="mt-4 neu-btn px-4 py-2 text-xs">Ricarica Pagina</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10 relative">
      {error && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-red-50 border border-red-200 rounded-xl shadow-xl text-red-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-green-50 border border-green-200 rounded-xl shadow-xl text-green-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}

      <LogoUploadModal 
        isOpen={isLogoModalOpen} 
        onClose={() => setIsLogoModalOpen(false)} 
        onSave={handleLogoSave} 
        currentLogo={logoPreview} 
      />

      <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
        <div>
          <h2 className="text-2xl font-bold text-slate-700">Impostazioni Centrale Acquisti</h2>
          <p className="text-sm text-slate-500 font-medium">Configurazione dati legali e fiscali dell'amministratore</p>
        </div>
        <div className="flex items-center space-x-4">
          {client.id === 'sandbox-test' && (
            <button 
              onClick={async () => {
                if (window.confirm("Sei sicuro di voler sincronizzare la Sandbox con i dati di Produzione? I dati attuali della Sandbox verranno sovrascritti.")) {
                  setLoading(true);
                  try {
                    const { seedingService } = await import('../services/seedingService');
                    const prodClient = { id: 'centrale-acquisti', name: 'Centrale Acquisti', spreadsheetId: 'default' };
                    await seedingService.syncFromProduction(client, prodClient);
                    setSuccess("Sandbox sincronizzata con successo!");
                    setTimeout(() => {
                      setSuccess(null);
                      window.location.reload(); // Reload to fetch new data
                    }, 2000);
                  } catch (err: any) {
                    setError(`Errore durante la sincronizzazione: ${err.message}`);
                    setTimeout(() => setError(null), 5000);
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="neu-btn px-6 py-2 text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Sincronizza da Produzione
            </button>
          )}
          {isEditing ? (
            <div className="flex space-x-4">
              <button onClick={handleCancel} className="neu-btn px-6 py-2 text-slate-600">
                Annulla
              </button>
              <button onClick={handleSave} className="neu-btn px-6 py-2 text-blue-600">
                Salva
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="neu-btn px-6 py-2 text-slate-600">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Modifica
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Company Identity */}
        <div className="neu-flat p-8">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-bold text-slate-700 flex items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-xs">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </span>
              Identità Aziendale
            </h3>
            
            {/* Logo Upload */}
            <div className="relative group">
              <div className="w-20 h-20 neu-pressed rounded-2xl overflow-hidden flex items-center justify-center bg-white/50 border-2 border-dashed border-slate-200 group-hover:border-blue-400 transition-colors">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                )}
              </div>
              <button 
                onClick={() => setIsLogoModalOpen(true)}
                className="absolute inset-0 cursor-pointer flex items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl border-0"
              >
                <span className="text-[10px] font-bold text-white uppercase">Cambia</span>
              </button>
            </div>
          </div>
          <div className="space-y-6">
            <InputField label="Ragione Sociale (Centrale Acquisti)" name="companyName" value={formData.companyName} onChange={handleChange} disabled={!isEditing} />
            <div className="grid grid-cols-2 gap-6">
              <InputField label="Partita IVA" name="vatNumber" value={formData.vatNumber} onChange={handleChange} disabled={!isEditing} />
              <InputField label="Codice Fiscale" name="taxId" value={formData.taxId} onChange={handleChange} disabled={!isEditing} />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="neu-flat p-8">
           <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center">
             <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
             </span>
            Contatti
          </h3>
          <div className="space-y-6">
            <InputField label="Email Ufficiale" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing} />
            <InputField label="Telefono" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} />
            <InputField label="Sito Web" name="website" value={formData.website} onChange={handleChange} disabled={!isEditing} />
          </div>
        </div>

        {/* Address */}
        <div className="neu-flat p-8">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </span>
            Sede Legale
          </h3>
          <div className="space-y-6">
             <InputField label="Indirizzo" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} />
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <InputField label="CAP" name="zipCode" value={formData.zipCode} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="col-span-3">
                <InputField label="Città" name="city" value={formData.city} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="col-span-1">
                <InputField label="PR" name="province" value={formData.province} onChange={handleChange} disabled={!isEditing} />
              </div>
            </div>
             <InputField label="Nazione" name="country" value={formData.country} onChange={handleChange} disabled={!isEditing} />
          </div>
        </div>

        {/* Bank Details */}
        <div className="neu-flat p-8">
           <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            Coordinate Bancarie
          </h3>
          <div className="space-y-6">
            <InputField label="Banca" name="bankName" value={formData.bankName} onChange={handleChange} disabled={!isEditing} />
            <InputField label="IBAN" name="iban" value={formData.iban} onChange={handleChange} disabled={!isEditing} />
            <InputField label="SWIFT / BIC" name="swift" value={formData.swift} onChange={handleChange} disabled={!isEditing} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileView;