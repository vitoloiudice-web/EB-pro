import React, { useState, useEffect } from 'react';
import { AdminProfile, Company } from '../types';
import { googleSheetsService } from '../services/googleSheetsService';

interface AdminProfileViewProps {
  company: Company;
}

const AdminProfileView: React.FC<AdminProfileViewProps> = ({ company }) => {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await googleSheetsService.getAdminProfile(company);
        setProfile(data);
        setFormData(data);
      } catch (error) {
        console.error("Failed to fetch admin profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (formData) {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSave = () => {
    setProfile(formData);
    setIsEditing(false);
    alert("Dati aziendali aggiornati con successo!");
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Caricamento profilo...</div>;
  if (!formData) return <div className="p-10 text-center text-red-500">Errore caricamento dati.</div>;

  const InputField = ({ label, name, value, className = "" }: any) => (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 pl-1">{label}</label>
      <input 
        type="text" 
        name={name} 
        value={value} 
        onChange={handleChange} 
        disabled={!isEditing}
        className={`w-full neu-input py-3 px-4 text-sm font-medium text-slate-700 transition-all ${!isEditing ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-100'}`}
      />
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
        <div>
          <h2 className="text-2xl font-bold text-slate-700">Impostazioni Azienda</h2>
          <p className="text-sm text-slate-500 font-medium">Configurazione dati legali e fiscali</p>
        </div>
        <div>
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
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Modifica
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Company Identity */}
        <div className="neu-flat p-8">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-xs">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </span>
            Identità Aziendale
          </h3>
          <div className="space-y-6">
            <InputField label="Ragione Sociale" name="companyName" value={formData.companyName} />
            <div className="grid grid-cols-2 gap-6">
              <InputField label="Partita IVA" name="vatNumber" value={formData.vatNumber} />
              <InputField label="Codice Fiscale" name="taxId" value={formData.taxId} />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="neu-flat p-8">
           <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center">
             <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
             </span>
            Contatti
          </h3>
          <div className="space-y-6">
            <InputField label="Email Ufficiale" name="email" value={formData.email} />
            <InputField label="Telefono" name="phone" value={formData.phone} />
            <InputField label="Sito Web" name="website" value={formData.website} />
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
             <InputField label="Indirizzo" name="address" value={formData.address} />
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <InputField label="CAP" name="zipCode" value={formData.zipCode} />
              </div>
              <div className="col-span-3">
                <InputField label="Città" name="city" value={formData.city} />
              </div>
              <div className="col-span-1">
                <InputField label="PR" name="province" value={formData.province} />
              </div>
            </div>
             <InputField label="Nazione" name="country" value={formData.country} />
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
            <InputField label="Banca" name="bankName" value={formData.bankName} />
            <InputField label="IBAN" name="iban" value={formData.iban} />
            <InputField label="SWIFT / BIC" name="swift" value={formData.swift} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminProfileView;