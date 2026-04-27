import React, { useState, useEffect } from 'react';
import { Client, AdminProfile, CodingSchema, CodingMapping, CodingSchemaBranch } from '../types';
import { dataService } from '../services/dataService';
import { syncCodingSchemaFamilies } from '../services/codingSchemaSync';
import { syncCodingSchemaFamilies } from '../services/codingSchemaSync';

interface CodingSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSchemaUpdated: (schema: CodingSchema) => void;
}

const defaultBranch: CodingSchemaBranch = {
  groups: [],
  macroFamilies: [],
  families: [],
  variants: [],
  revisions: []
};

const defaultSchema: CodingSchema = {
  categories: [
    { name: 'DIRETTO', code: 'D' },
    { name: 'INDIRETTO', code: 'I' }
  ],
  diretto: {
    groups: [
      { name: 'CABINA', code: 'CAB' },
      { name: 'TELAIO', code: 'TEL' },
      { name: 'CONTROTELAIO', code: 'CTR' },
      { name: 'VASCA/CASSA', code: 'VAS' },
      { name: 'PALA-CARRELLO', code: 'PAL' },
      { name: 'COMPATTAZIONE', code: 'COM' },
      { name: 'PARATIA', code: 'PAR' },
      { name: 'ALZA-VOLTA-CONTENITORE', code: 'AVC' },
      { name: 'CUFFIA/PORTELLONE', code: 'CUF' }
    ],
    macroFamilies: [
      { name: 'ELETTRICO', code: 'ELE' },
      { name: 'OLEODINAMICO', code: 'OLE' },
      { name: 'PNEUMATICO', code: 'PNE' },
      { name: 'VITERIA-BULLONERIA', code: 'VIT' },
      { name: 'GOMMA/PLASTICA', code: 'GOM' },
      { name: 'MECCANICO/CARPENTERIA', code: 'MEC' },
      { name: 'VERNICIATURA', code: 'VER' },
      { name: 'FINITURE ESTETICHE', code: 'FIN' }
    ],
    families: [
      { name: 'ACCIAIO ALTO RESISTENZIALE', code: 'HAR' },
      { name: 'ACCIAIO INOX', code: 'INO' },
      { name: 'TUBO FLESSIBILE', code: 'TUB' },
      { name: 'RACCORDO', code: 'RAC' },
      { name: 'VALVOLA', code: 'VAL' },
      { name: 'POMPA', code: 'POM' },
      { name: 'PTO', code: 'PTO' },
      { name: 'CILINDRO', code: 'CIL' },
      { name: 'CANBUS', code: 'CAN' },
      { name: 'PLC', code: 'PLC' },
      { name: 'CAVO', code: 'CAV' },
      { name: 'CONNETTORE', code: 'CNN' },
      { name: 'SCATOLA', code: 'SCA' },
      { name: 'PRESSACAVO', code: 'PRE' },
      { name: 'GUARNIZIONI E TENUTE', code: 'GUA' },
      { name: 'SMALTO', code: 'SMA' },
      { name: 'STUCCO', code: 'STU' },
      { name: 'DILUENTE', code: 'DIL' },
      { name: 'CATALIZZATORE', code: 'CAT' },
      { name: 'SENSORISTICA/IOT', code: 'IOT' },
      { name: 'FILTRI E ACCESSORI', code: 'FIL' },
      { name: 'REGOLATORI E MANOMETRI', code: 'MAN' },
      { name: 'BULLONERIA STRUTTURALE', code: 'BUL' },
      { name: 'SISTEMI PARASPRUZZI', code: 'PAR' },
      { name: 'CARPENTERIA STRUTTURALE', code: 'CAR' },
      { name: 'PANNELLATURE DI PROT', code: 'PAN' },
      { name: 'SISTEMI DI CHIUSURA', code: 'CHI' },
      { name: 'PATTINI E SLITTE', code: 'PAT' },
      { name: 'SUPPORTI E PERNI', code: 'PER' },
      { name: 'PULSANTIERE', code: 'PUL' },
      { name: 'ATTACCHI A PETTINE / D', code: 'ATT' },
      { name: 'LUCI E INDICATORI', code: 'LUC' },
      { name: 'TAMPONI DI BATTUTA', code: 'TAM' }
    ],
    variants: [
      { name: 'A', code: 'A' },
      { name: 'B', code: 'B' },
      { name: 'C', code: 'C' }
    ],
    revisions: [
      { name: '0', code: '0' },
      { name: '1', code: '1' },
      { name: '2', code: '2' }
    ]
  },
  indiretto: {
    groups: [
      { name: 'CONSUMO', code: 'CON' },
      { name: 'SERVIZI', code: 'SER' }
    ],
    macroFamilies: [
      { name: 'CANCELLERIA', code: 'CAN' },
      { name: 'MANUTENZIONE', code: 'MAN' }
    ],
    families: [
      { name: 'CARTA', code: 'CAR' },
      { name: 'RICAMBI', code: 'RIC' }
    ],
    variants: [
      { name: 'A', code: 'A' }
    ],
    revisions: [
      { name: '0', code: '0' }
    ]
  }
};

const CodingSchemaModal: React.FC<CodingSchemaModalProps> = ({ isOpen, onClose, client, onSchemaUpdated }) => {
  const [schema, setSchema] = useState<CodingSchema>(defaultSchema);
  const [activeCategory, setActiveCategory] = useState<'DIRETTO' | 'INDIRETTO'>('DIRETTO');
  const [activeTab, setActiveTab] = useState<keyof CodingSchemaBranch>('groups');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && client) {
      setLoading(true);
      dataService.getAdminProfile(client).then(profile => {
        if (profile && (profile as AdminProfile).codingSchema) {
          const loadedSchema = (profile as AdminProfile).codingSchema!;
          // Ensure branches exist for backward compatibility
          if (!loadedSchema.diretto) loadedSchema.diretto = defaultSchema.diretto;
          if (!loadedSchema.indiretto) loadedSchema.indiretto = defaultSchema.indiretto;
          setSchema(loadedSchema);
        } else {
          setSchema(defaultSchema);
        }
      }).catch(err => {
        console.error("Failed to fetch schema", err);
        try {
          const errInfo = JSON.parse(err.message);
          if (errInfo.error && errInfo.error.includes('client is offline')) {
            // If offline and not in cache, fallback to default gracefully
            setSchema(defaultSchema);
          } else {
            setError(`Errore: ${errInfo.error} (Op: ${errInfo.operationType}, Path: ${errInfo.path})`);
          }
        } catch {
          if (err.message && err.message.includes('client is offline')) {
            setSchema(defaultSchema);
          } else {
            setError("Errore nel caricamento dello schema: " + err.message);
          }
        }
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, client]);

  if (!isOpen) return null;

  const branchKey = activeCategory === 'DIRETTO' ? 'diretto' : 'indiretto';

  const handleAddMapping = () => {
    setSchema(prev => ({
      ...prev,
      [branchKey]: {
        ...prev[branchKey],
        [activeTab]: [...prev[branchKey][activeTab], { name: '', code: '' }]
      }
    }));
  };

  const handleUpdateMapping = (index: number, field: 'name' | 'code', value: string) => {
    setSchema(prev => {
      const newArray = [...prev[branchKey][activeTab]];
      newArray[index] = { ...newArray[index], [field]: value };
      return {
        ...prev,
        [branchKey]: {
          ...prev[branchKey],
          [activeTab]: newArray
        }
      };
    });
  };

  const handleRemoveMapping = (index: number) => {
    setSchema(prev => {
      const newArray = [...prev[branchKey][activeTab]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [branchKey]: {
          ...prev[branchKey],
          [activeTab]: newArray
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const profile = await dataService.getAdminProfile(client) as AdminProfile;
      const updatedProfile = { ...profile, codingSchema: schema };
      await dataService.saveAdminProfile(client, updatedProfile);
      onSchemaUpdated(schema);
      onClose();
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const tabLabels: Record<keyof CodingSchemaBranch, string> = {
    groups: 'Gruppi',
    macroFamilies: 'Macrofamiglie',
    families: 'Famiglie',
    variants: 'Varianti',
    revisions: 'Revisioni'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="neu-flat w-full max-w-3xl p-6 flex flex-col max-h-[90vh] animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-700">Configurazione Schema di Codifica</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Category Switch */}
            <div className="flex flex-shrink-0 bg-slate-100 p-1 rounded-xl mb-4">
              <button
                onClick={() => setActiveCategory('DIRETTO')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeCategory === 'DIRETTO' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                DIRETTO (D)
              </button>
              <button
                onClick={() => setActiveCategory('INDIRETTO')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeCategory === 'INDIRETTO' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                INDIRETTO (I)
              </button>
            </div>

            <div className="flex flex-shrink-0 overflow-x-auto border-b border-slate-200 mb-3 pb-2 gap-2 custom-scrollbar">
              {(Object.keys(tabLabels) as Array<keyof CodingSchemaBranch>).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              <div className="grid grid-cols-12 gap-3 mb-1 px-2">
                <div className={`text-[10px] font-bold text-slate-400 uppercase ${activeTab === 'families' ? 'col-span-5' : 'col-span-7'}`}>Nome (Descrizione)</div>
                <div className={`text-[10px] font-bold text-slate-400 uppercase ${activeTab === 'families' ? 'col-span-3' : 'col-span-4'}`}>Codice Abbreviato</div>
                {activeTab === 'families' && <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase">Macrofamiglie</div>}
                <div className="col-span-1"></div>
              </div>
              
              {schema[branchKey][activeTab].map((mapping, idx) => (
                <div key={idx} className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col gap-2">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className={activeTab === 'families' ? 'col-span-5' : 'col-span-7'}>
                      <input
                        type="text"
                        value={mapping.name || ''}
                        onChange={(e) => handleUpdateMapping(idx, 'name', e.target.value)}
                        className="w-full neu-input px-3 py-1.5 text-xs"
                        placeholder="Es. CABINA"
                      />
                    </div>
                    <div className={activeTab === 'families' ? 'col-span-3' : 'col-span-4'}>
                      <input
                        type="text"
                        value={mapping.code || ''}
                        onChange={(e) => handleUpdateMapping(idx, 'code', e.target.value)}
                        className="w-full neu-input px-3 py-1.5 text-xs font-mono uppercase"
                        placeholder="Es. CA"
                      />
                    </div>
                    {activeTab === 'families' && (
                      <div className="col-span-3 relative">
                        <button 
                          onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)}
                          className="w-full flex items-center justify-between neu-input px-3 py-1.5 text-xs bg-white text-slate-600 text-left"
                        >
                          <span className="truncate mr-2">
                            {mapping.parentCodes?.length 
                              ? `${mapping.parentCodes.length} selezionat${mapping.parentCodes.length === 1 ? 'a' : 'e'}` 
                              : 'Seleziona...'}
                          </span>
                          <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {openDropdown === idx && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)}></div>
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 max-h-48 overflow-y-auto">
                              {schema[branchKey].macroFamilies.map(mf => {
                                if (!mf.code) return null;
                                const isSelected = mapping.parentCodes?.includes(mf.code);
                                return (
                                  <label key={mf.code} className="flex items-start gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!isSelected}
                                      onChange={() => {
                                        const currentParents = mapping.parentCodes || [];
                                        const newParents = isSelected 
                                          ? currentParents.filter(c => c !== mf.code)
                                          : [...currentParents, mf.code];
                                        setSchema(prev => {
                                          const newArray = [...prev[branchKey][activeTab]];
                                          newArray[idx] = { ...newArray[idx], parentCodes: newParents };
                                          return { ...prev, [branchKey]: { ...prev[branchKey], [activeTab]: newArray } };
                                        });
                                      }}
                                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white"
                                    />
                                    <span className="text-xs text-slate-700 leading-tight block">{mf.code} - {mf.name}</span>
                                  </label>
                                );
                              })}
                              {schema[branchKey].macroFamilies.filter(mf => mf.code).length === 0 && (
                                <div className="px-3 py-1.5 text-[10px] text-slate-400 italic">Nessuna macrofamiglia definita.</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => handleRemoveMapping(idx)} className="text-red-400 hover:text-red-600 p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddMapping}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 mt-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Aggiungi Nuova Voce
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-3 pt-3 border-t border-slate-200">
          <button onClick={onClose} className="neu-btn px-4 py-1.5 text-sm text-slate-600 font-bold" disabled={saving}>
            Annulla
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="neu-btn px-4 py-1.5 text-sm text-blue-600 font-bold flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Salvataggio...
              </>
            ) : (
              'Salva Schema'
            )}
          </button>
        </div>

        {client.id === 'centrale-acquisti' && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Sincronizzazione Dati</p>
                <p className="text-xs text-amber-600">Copia le Famiglie salvate nell'ambiente Sandbox in Produzione.</p>
              </div>
            </div>
            <button 
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await syncCodingSchemaFamilies('sandbox-test', 'centrale-acquisti');
                  if (res.success) {
                    // Reload schema after sync
                    const profile = await dataService.getAdminProfile(client) as AdminProfile;
                    if (profile && profile.codingSchema) {
                      setSchema(profile.codingSchema);
                    }
                    setError(null);
                    alert("Sincronizzazione completata con successo!");
                  } else {
                    setError(res.message);
                  }
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-black border border-amber-200 hover:bg-amber-200 transition-colors"
            >
              SINCRONIZZA ORA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodingSchemaModal;
