
import React, { useState, useEffect } from 'react';
import { Item, Supplier, Customer, ItemSupplierRelation, Client, AdminProfile, CodingSchema, CodingMapping, Address } from '../types';
import { dataService } from '../services/dataService';
import ConfirmModal from './common/ConfirmModal';
import CodingSchemaModal from './CodingSchemaModal';
import Tooltip from './common/Tooltip';

type EntityType = 'ITEMS' | 'SUPPLIERS' | 'CUSTOMERS' | 'CLIENTS';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: EntityType;
  initialData: any | null;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
  client: Client;
}

// --- Helper Components ---

interface InputGroupProps {
  label: string;
  value: any;
  onChange: (val: any) => void;
  type?: string;
  placeholder?: string;
  width?: string;
  readOnly?: boolean;
  tooltip?: { title: string; description: string; usage: string };
}

const InputGroup: React.FC<InputGroupProps> = ({ label, value, onChange, type = "text", placeholder = "", width = "w-full", readOnly = false, tooltip }) => {
  const input = (
    <div className={`mb-1.5 ${width}`}>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 pl-1">{label}</label>
      <input 
        type={type}
        value={value === undefined || value === null ? '' : value}
        onChange={(e) => !readOnly && onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        className={`w-full neu-input px-3 py-1.5 text-sm font-medium text-slate-700 placeholder-slate-300 ${readOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );

  return tooltip ? <Tooltip content={tooltip} className={width}>{input}</Tooltip> : input;
};

interface SelectGroupProps {
  label: string;
  value: any;
  onChange: (val: any) => void;
  options: (string | { label: string; value: any })[];
  tooltip?: { title: string; description: string; usage: string };
}

const SelectGroup: React.FC<SelectGroupProps> = ({ label, value, onChange, options, tooltip }) => {
  const select = (
    <div className="mb-1.5 w-full">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 pl-1">{label}</label>
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full neu-input px-3 py-1.5 text-sm font-medium text-slate-700 bg-transparent"
      >
        <option value="" disabled>Seleziona...</option>
        {options.map((opt) => {
          const label = typeof opt === 'string' ? opt : opt.label;
          const val = typeof opt === 'string' ? opt : opt.value;
          return <option key={val} value={val}>{label}</option>;
        })}
      </select>
    </div>
  );

  return tooltip ? <Tooltip content={tooltip} className="w-full">{select}</Tooltip> : select;
};

// --- ENTERPRISE ITEM FORM (TABS) ---

const EnterpriseItemForm: React.FC<{ 
    item: Item; 
    onChange: (i: Item) => void; 
    setError: (msg: string | null) => void;
    client: Client;
}> = ({ item, onChange, setError, client }) => {
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'TECHNICAL' | 'CUSTOMER_CODE' | 'MANUFACTURER' | 'SUPPLIERS' | 'ESOLVER_ADVANCED' | 'DOCUMENTAL'>('GENERAL');
    const [newSup, setNewSup] = useState<Partial<ItemSupplierRelation>>({});
    const [codingSchema, setCodingSchema] = useState<CodingSchema | null>(null); // Will be set in useEffect
    const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    // CRYSTALLIZED: Default Schema to ensure UI consistency even if not configured in settings
    const DEFAULT_SCHEMA: CodingSchema = {
        categories: [{ name: 'DIRETTO', code: 'D' }, { name: 'INDIRETTO', code: 'I' }],
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
                { name: 'PANNELLATURE DI PROTEZIONE', code: 'PAN' },
                { name: 'SISTEMI DI CHIUSURA', code: 'CHI' },
                { name: 'PATTINI E SLITTE', code: 'PAT' },
                { name: 'SUPPORTI E PERNI', code: 'PER' },
                { name: 'PULSANTIERE', code: 'PUL' },
                { name: 'ATTACCHI A PETTINE / DIN', code: 'ATT' },
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

    // Initialize with default if null to avoid UI flickers or empty inputs
    const currentSchema = codingSchema || DEFAULT_SCHEMA;

    useEffect(() => {
        const fetchProfileAndCustomers = async () => {
            if (client) {
                try {
                    const profile = await dataService.getAdminProfile(client) as AdminProfile;
                    if (profile && profile.codingSchema) {
                        setCodingSchema(profile.codingSchema);
                    } else {
                        setCodingSchema(DEFAULT_SCHEMA);
                    }
                } catch (err) {
                    console.error("Error fetching coding schema:", err);
                    setCodingSchema(DEFAULT_SCHEMA);
                }

                try {
                    const res = await dataService.getCustomers(client);
                    setCustomers(res.data);
                } catch (err) {
                    console.error("Error fetching customers:", err);
                }
            }
        };
        fetchProfileAndCustomers();
    }, [client]);

    const generateSku = (currentItem: Item, schema: CodingSchema) => {
        const getCode = (list: CodingMapping[], name: string) => list.find(x => x.name === name)?.code || name || '';

        const catCode = getCode(schema.categories, currentItem.category);
        
        const isDiretto = currentItem.category === 'DIRETTO';
        const branch = isDiretto ? schema.diretto : schema.indiretto;
        const safeBranch = branch || { groups: [], macroFamilies: [], families: [], variants: [], revisions: [] };

        const groupCode = getCode(safeBranch.groups, currentItem.group);
        const macroFamCode = getCode(safeBranch.macroFamilies, currentItem.macroFamily);
        const famCode = getCode(safeBranch.families, currentItem.family);
        const prog = currentItem.progressive || '001';
        const variant = getCode(safeBranch.variants, currentItem.variant) || currentItem.variant || 'A';
        const rev = getCode(safeBranch.revisions, currentItem.revision) || currentItem.revision || '0';
        const orgCode = currentItem.skuPrefix || '';

        // CRYSTALLIZED COMPOSITION: 1° Cat, 2° Group, 3° Org, 4° Macro, 5° Fam, 6° Prog, 7° Var, 8° Rev
        // CRYSTALLIZED SEPARATOR: "."
        const parts = [
            catCode,
            groupCode,
            orgCode,
            macroFamCode,
            famCode,
            prog,
            variant,
            rev
        ].filter(p => p !== '');

        return parts.join('.');
    };

    const handleFieldChange = (updates: Partial<Item>) => {
        const updatedItem = { ...item, ...updates };
        const schemaToUse = codingSchema || DEFAULT_SCHEMA;
        updatedItem.sku = generateSku(updatedItem, schemaToUse);
        onChange(updatedItem);
    };

    const handleNestedChange = (parent: keyof Item, field: string, value: any) => {
        onChange({
            ...item,
            [parent]: {
                ...(item[parent] as any),
                [field]: value
            }
        });
    };

    const handleAddSupplier = () => {
        if(!newSup.supplierName || !newSup.price) {
            setError("Inserisci almeno Nome e Prezzo per il fornitore.");
            return;
        }
        
        const newRel: ItemSupplierRelation = {
            supplierId: newSup.supplierId || `SUP-${Date.now()}`, // Mock ID generation
            supplierName: newSup.supplierName || '',
            supplierSku: newSup.supplierSku || '',
            currency: 'EUR',
            price: Number(newSup.price),
            minOrderQty: Number(newSup.minOrderQty || 1),
            leadTimeDays: Number(newSup.leadTimeDays || 7),
            isPreferred: item.suppliers?.length === 0, // First one is preferred by default
            paymentTerms: newSup.paymentTerms || '30 DF'
        };

        const updatedSuppliers = [...(item.suppliers || []), newRel];
        onChange({
            ...item,
            suppliers: updatedSuppliers,
            // Auto update preferred fields if this is the first one or marked preferred
            cost: newRel.isPreferred ? newRel.price : item.cost,
            supplierId: newRel.isPreferred ? newRel.supplierId : item.supplierId,
            leadTimeDays: newRel.isPreferred ? newRel.leadTimeDays : item.leadTimeDays
        });
        setNewSup({});
    };

    const handleRemoveSupplier = (idx: number) => {
        const updated = (item.suppliers || []).filter((_, i) => i !== idx);
        onChange({ ...item, suppliers: updated });
    };

    const handleSetPreferred = (idx: number) => {
         const updated = (item.suppliers || []).map((s, i) => ({ ...s, isPreferred: i === idx }));
         const preferred = updated[idx];
         onChange({ 
             ...item, 
             suppliers: updated,
             cost: preferred.price,
             supplierId: preferred.supplierId,
             leadTimeDays: preferred.leadTimeDays
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 mb-4 bg-slate-50 rounded-t-xl overflow-x-auto custom-scrollbar whitespace-nowrap">
                {(['GENERAL', 'TECHNICAL', 'ESOLVER_ADVANCED', 'DOCUMENTAL', 'CUSTOMER_CODE', 'MANUFACTURER', 'SUPPLIERS'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 text-xs font-bold transition-colors flex-shrink-0 ${
                            activeTab === tab 
                            ? 'bg-blue-600 text-white' 
                            : 'text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        {tab === 'GENERAL' && 'Generale & Codifica'}
                        {tab === 'TECHNICAL' && 'Dati Tecnici'}
                        {tab === 'ESOLVER_ADVANCED' && 'Logistica eSOLVER'}
                        {tab === 'DOCUMENTAL' && 'Documentale'}
                        {tab === 'CUSTOMER_CODE' && 'Codice Cliente'}
                        {tab === 'MANUFACTURER' && 'Produttore'}
                        {tab === 'SUPPLIERS' && 'Fornitori & Acquisti'}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar px-1">
                
                {activeTab === 'GENERAL' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-1">
                             <div className="flex justify-between items-center mb-2">
                                 <h4 className="text-xs font-black text-blue-800 uppercase">Tassonomia Organizzativa & Tecnica</h4>
                             </div>
                             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <SelectGroup 
                                    label="Prefisso (Org)" 
                                    value={item.skuPrefix} 
                                    onChange={(val) => handleFieldChange({skuPrefix: val})} 
                                    options={[
                                        { value: 'MP', label: 'MP - Materie Prime' },
                                        { value: 'SL', label: 'SL - Semilavorati' },
                                        { value: 'PF', label: 'PF - Prodotti Finiti' },
                                        { value: 'MO', label: 'MO - Materiali di Consumo' },
                                        { value: 'CE', label: 'CE - Cespiti' }
                                    ]}
                                    tooltip={{
                                        title: "Tassonomia Organizzativa",
                                        description: "Prefissi parlanti che governano l'ereditarietà dei parametri fiscali e contabili.",
                                        usage: "MP=Materie Prime, SL=Semilavorati, PF=Prodotti Finiti, MO=Consumo, CE=Cespiti."
                                    }}
                                />
                                <InputGroup 
                                    label="Classe (Tecnica)" 
                                    value={item.technicalClass} 
                                    onChange={(val) => handleFieldChange({technicalClass: val})} 
                                    placeholder="Es. Trattamento"
                                    tooltip={{
                                        title: "Tassonomia Tecnica",
                                        description: "Permette analisi multidimensionali parallele (es. per tipo di materiale).",
                                        usage: "Inserisci la classe tecnica di appartenenza per la BI."
                                    }}
                                />
                                <InputGroup 
                                    label="Sottoclasse" 
                                    value={item.technicalSubclass} 
                                    onChange={(val) => handleFieldChange({technicalSubclass: val})} 
                                    placeholder="Es. Zincatura"
                                />
                             </div>
                        </div>

                        <div className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2">
                             <div className="flex justify-between items-center mb-2">
                                 <h4 className="text-xs font-black text-slate-500 uppercase">Schema di Codifica</h4>
                             </div>
                             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {(() => {
                                    const isDiretto = item.category === 'DIRETTO';
                                    const branch = isDiretto ? currentSchema.diretto : currentSchema.indiretto;
                                    const safeBranch = branch || { groups: [], macroFamilies: [], families: [], variants: [], revisions: [] };
                                    
                                    return (
                                        <>
                                            <SelectGroup 
                                                label="Categoria" 
                                                value={item.category} 
                                                onChange={(val) => handleFieldChange({category: val, group: '', macroFamily: '', family: '', variant: '', revision: ''})} 
                                                options={currentSchema.categories.map(c => ({ label: `${c.code} - ${c.name}`, value: c.name }))}
                                                tooltip={{
                                                    title: "Categoria e-Solver",
                                                    description: "Definisce il ramo di codifica (Diretto/Indiretto) e le logiche di ricalcolo.",
                                                    usage: "Seleziona D per componenti a bordo veicolo, I per sussidiari."
                                                }}
                                            />
                                            <SelectGroup 
                                                label="Gruppo" 
                                                value={item.group} 
                                                onChange={(val) => handleFieldChange({group: val})} 
                                                options={safeBranch.groups.map(g => ({ label: `${g.code} - ${g.name}`, value: g.name }))}
                                            />
                                            <SelectGroup 
                                                label="Macrofamiglia" 
                                                value={item.macroFamily} 
                                                onChange={(val) => handleFieldChange({macroFamily: val})} 
                                                options={safeBranch.macroFamilies.map(m => ({ label: `${m.code} - ${m.name}`, value: m.name }))}
                                            />
                                            <SelectGroup 
                                                label="Famiglia" 
                                                value={item.family} 
                                                onChange={(val) => handleFieldChange({family: val})} 
                                                options={safeBranch.families.map(f => ({ label: `${f.code} - ${f.name}`, value: f.name }))}
                                            />
                                            <SelectGroup 
                                                label="Progressivo" 
                                                value={item.progressive} 
                                                onChange={(val) => handleFieldChange({progressive: val})} 
                                                options={['001', '002', '003', '004', '005', '006', '007', '008', '009', '010']} 
                                            />
                                            <SelectGroup 
                                                label="Variante" 
                                                value={item.variant} 
                                                onChange={(val) => handleFieldChange({variant: val})} 
                                                options={safeBranch.variants.map(v => ({ label: `${v.code} - ${v.name}`, value: v.name }))}
                                            />
                                            <SelectGroup 
                                                label="Revisione" 
                                                value={item.revision} 
                                                onChange={(val) => handleFieldChange({revision: val})} 
                                                options={safeBranch.revisions.map(r => ({ label: `${r.code} - ${r.name}`, value: r.name }))}
                                            />
                                        </>
                                    );
                                })()}
                             </div>
                        </div>

                        <InputGroup 
                            label="Codice SKU (Univoco)" 
                            value={item.sku} 
                            onChange={(val) => onChange({...item, sku: val})} 
                            placeholder="AUTO-GEN o Manuale" 
                            tooltip={{
                                title: "Codice SKU",
                                description: "Identificativo univoco dell'articolo generato automaticamente dallo schema.",
                                usage: "Non modificare manualmente se lo schema è attivo."
                            }}
                        />
                        <InputGroup label="Unità Misura" value={item.unit} onChange={(val) => onChange({...item, unit: val})} placeholder="pz, kg, m" />
                        
                        <div className="col-span-2">
                            <InputGroup label="Descrizione Articolo" value={item.name} onChange={(val) => onChange({...item, name: val})} />
                        </div>
                        
                        <div className="col-span-2">
                             <h4 className="text-xs font-bold text-slate-400 uppercase mt-2 mb-2">Giacenze</h4>
                             <div className="grid grid-cols-2 gap-4">
                                <InputGroup 
                                    label="Giacenza Attuale" 
                                    value={item.stock} 
                                    onChange={(val) => onChange({...item, stock: val})} 
                                    type="number" 
                                    tooltip={{
                                        title: "Giacenza di Magazzino",
                                        description: "Quantità fisica attualmente disponibile a scaffale.",
                                        usage: "Aggiornato automaticamente dai movimenti di carico/scarico."
                                    }}
                                />
                                <InputGroup 
                                    label="Scorta Sicurezza (ROP)" 
                                    value={item.safetyStock} 
                                    onChange={(val) => onChange({...item, safetyStock: val})} 
                                    type="number" 
                                    tooltip={{
                                        title: "Scorta di Sicurezza",
                                        description: "Livello minimo sotto il quale scatta l'alert di riordino (Semaforo Giallo).",
                                        usage: "Imposta un valore basato sul consumo medio e lead time."
                                    }}
                                />
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'TECHNICAL' && (
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Peso Unitario (Kg)" value={item.weightKg} onChange={(val) => onChange({...item, weightKg: val})} type="number" />
                        </div>
                        
                        <div className="neu-flat p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Specifiche Tecniche (Chiave: Valore)</h4>
                            {/* Simple dynamic list simulator */}
                            <p className="text-xs text-slate-400 italic">La gestione dinamica delle specifiche sarà abilitata nella prossima versione. I dati attuali sono salvati come JSON.</p>
                            <textarea 
                                className="w-full neu-input p-3 text-xs font-mono mt-2"
                                rows={5}
                                value={JSON.stringify(item.technicalSpecs || {}, null, 2)}
                                onChange={(e) => {
                                    try {
                                        onChange({...item, technicalSpecs: JSON.parse(e.target.value)})
                                    } catch {}
                                }}
                                placeholder='{"Materiale": "Acciaio", "Colore": "Nero"}'
                            ></textarea>
                        </div>
                     </div>
                )}

                {activeTab === 'ESOLVER_ADVANCED' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <h4 className="text-sm font-bold text-indigo-800 mb-2">Configurazione Avanzata eSOLVER</h4>
                            <p className="text-xs text-indigo-600 mb-4">
                                Definisci logiche di consumo e pianificazione evolute per l'integrazione con il sistema ERP.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                        <div>
                                            <span className="text-xs font-bold text-slate-700 block">Componente Fantasma (Phantom)</span>
                                            <span className="text-[10px] text-slate-400">Esplosione MRP diretta sui figli</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={item.isPhantom} 
                                            onChange={(e) => onChange({...item, isPhantom: e.target.checked})}
                                            className="w-5 h-5 accent-indigo-600"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                        <div>
                                            <span className="text-xs font-bold text-slate-700 block">Materiale in Conto Lavoro</span>
                                            <span className="text-[10px] text-slate-400">Fabbisogno d'acquisto zero (Terzi/Clienti)</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={item.isSubcontracting} 
                                            onChange={(e) => onChange({...item, isSubcontracting: e.target.checked})}
                                            className="w-5 h-5 accent-indigo-600"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <InputGroup 
                                        label="Lead Time Offset (Giorni)" 
                                        value={item.leadTimeOffset} 
                                        onChange={(val) => onChange({...item, leadTimeOffset: val})} 
                                        type="number"
                                        placeholder="0"
                                        tooltip={{
                                            title: "Lead Time Offsetting",
                                            description: "Sfasamento temporale aggiuntivo per la pianificazione degli ordini.",
                                            usage: "Inserisci i giorni di anticipo necessari rispetto alla data di fabbisogno."
                                        }}
                                    />
                                    <SelectGroup 
                                        label="Politica di Lotto" 
                                        value={item.lotPolicy} 
                                        onChange={(val) => onChange({...item, lotPolicy: val})} 
                                        options={['LFL', 'MLS']}
                                        tooltip={{
                                            title: "Politica di Lottizzazione",
                                            description: "Determina come l'MRP raggruppa i fabbisogni in ordini.",
                                            usage: "LFL = Lotto per Lotto (esatto), MLS = Lotto Minimo (arrotondato)."
                                        }}
                                    />
                                    {item.lotPolicy === 'MLS' && (
                                        <InputGroup 
                                            label="Lotto Minimo" 
                                            value={item.minLotSize} 
                                            onChange={(val) => onChange({...item, minLotSize: val})} 
                                            type="number"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <h4 className="text-sm font-bold text-slate-700 mb-4">Multi-Unità di Misura (Conversione Dinamica)</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <InputGroup 
                                    label="UM Acquisto" 
                                    value={item.multiUM?.purchase} 
                                    onChange={(val) => handleNestedChange('multiUM', 'purchase', val)} 
                                    placeholder="kg"
                                    tooltip={{
                                        title: "Unità di Misura Acquisto",
                                        description: "Unità utilizzata negli ordini a fornitore (es. kg di acciaio).",
                                        usage: "Inserisci l'abbreviazione dell'unità (es. kg, m, bar)."
                                    }}
                                />
                                <InputGroup 
                                    label="UM Stoccaggio" 
                                    value={item.multiUM?.storage} 
                                    onChange={(val) => handleNestedChange('multiUM', 'storage', val)} 
                                    placeholder="pz"
                                />
                                <InputGroup 
                                    label="UM Consumo" 
                                    value={item.multiUM?.consumption} 
                                    onChange={(val) => handleNestedChange('multiUM', 'consumption', val)} 
                                    placeholder="m"
                                />
                                <InputGroup 
                                    label="Fattore Conversione" 
                                    value={item.multiUM?.conversionFactor} 
                                    onChange={(val) => handleNestedChange('multiUM', 'conversionFactor', val)} 
                                    type="number"
                                    placeholder="1.0"
                                    tooltip={{
                                        title: "Coefficiente di Ricalcolo",
                                        description: "Fattore moltiplicativo per convertire l'UM Acquisto in UM Consumo.",
                                        usage: "Es. se 1 barra = 6 metri, il fattore è 6."
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'DOCUMENTAL' && (
                    <div className="space-y-6">
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <h4 className="text-sm font-bold text-emerald-800 mb-2">Documental Linking (Asset Digitali)</h4>
                            <p className="text-xs text-emerald-600 mb-4">
                                Correlazione nativa tra codice articolo e asset digitali per l'accesso immediato in officina.
                            </p>
                            
                            <div className="space-y-4">
                                <InputGroup 
                                    label="URL Disegno CAD / PLM" 
                                    value={item.attachments?.cadUrl} 
                                    onChange={(val) => handleNestedChange('attachments', 'cadUrl', val)} 
                                    placeholder="https://..."
                                    tooltip={{
                                        title: "Digital Thread: CAD",
                                        description: "Link diretto al disegno tecnico o al sistema PLM.",
                                        usage: "Incolla l'URL del file o della cartella di progetto."
                                    }}
                                />
                                <InputGroup 
                                    label="URL Scheda Tecnica" 
                                    value={item.attachments?.specsUrl} 
                                    onChange={(val) => handleNestedChange('attachments', 'specsUrl', val)} 
                                    placeholder="https://..."
                                />
                                <InputGroup 
                                    label="URL Istruzioni Operative" 
                                    value={item.attachments?.manualUrl} 
                                    onChange={(val) => handleNestedChange('attachments', 'manualUrl', val)} 
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'CUSTOMER_CODE' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">Codici Articolo Cliente (Multi-Cliente)</h4>
                            <p className="text-xs text-blue-600 mb-4">
                                Seleziona i clienti e inserisci il codice interno utilizzato da ciascuno per identificare questo articolo nelle loro distinte base o magazzini.
                            </p>
                            
                            {/* Legacy Field for backward compatibility */}
                            <div className="mb-6 pb-4 border-b border-blue-200">
                                <InputGroup 
                                    label="Codice Cliente Principale (Legacy)" 
                                    value={item.customerCode || ''} 
                                    onChange={(val) => onChange({...item, customerCode: val})} 
                                    placeholder="Es. CL-12345" 
                                />
                            </div>

                            {/* Dropdown Multi-Select */}
                            <div className="relative mb-4">
                                <button 
                                    onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                                    className="w-full text-left neu-input px-3 py-2 text-sm font-medium text-slate-700 bg-white flex justify-between items-center"
                                >
                                    <span>Seleziona Clienti ({item.customerCodes?.length || 0})</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                
                                {isCustomerDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {customers.length === 0 ? (
                                            <div className="p-3 text-xs text-slate-500">Nessun cliente trovato in anagrafica.</div>
                                        ) : (
                                            customers.map(cust => {
                                                const isSelected = (item.customerCodes || []).some(c => c.customerId === cust.id);
                                                return (
                                                    <label key={cust.id} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                                                        <input 
                                                            type="checkbox" 
                                                            className="mr-2 accent-blue-600"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                let newCodes = [...(item.customerCodes || [])];
                                                                if (e.target.checked) {
                                                                    newCodes.push({ customerId: cust.id, customerName: cust.name, code: '' });
                                                                } else {
                                                                    newCodes = newCodes.filter(c => c.customerId !== cust.id);
                                                                }
                                                                onChange({...item, customerCodes: newCodes});
                                                            }}
                                                        />
                                                        <span className="text-sm text-slate-700">{cust.name}</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Multi-Customer Codes List */}
                            <div className="space-y-2 mb-4">
                                <h5 className="text-xs font-bold text-slate-600 uppercase">Mappatura Clienti Selezionati</h5>
                                {(item.customerCodes || []).map((cc, idx) => (
                                    <div key={cc.customerId || idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-blue-100">
                                        <div className="col-span-5">
                                            <div className="text-xs font-bold text-slate-700 px-1 truncate" title={cc.customerName}>
                                                {cc.customerName}
                                            </div>
                                        </div>
                                        <div className="col-span-6">
                                            <input 
                                                type="text" 
                                                value={cc.code} 
                                                onChange={(e) => {
                                                    const newCodes = [...(item.customerCodes || [])];
                                                    newCodes[idx].code = e.target.value;
                                                    onChange({...item, customerCodes: newCodes});
                                                }}
                                                placeholder="Codice Articolo"
                                                className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                            <button 
                                                onClick={() => {
                                                    const newCodes = [...(item.customerCodes || [])];
                                                    newCodes.splice(idx, 1);
                                                    onChange({...item, customerCodes: newCodes});
                                                }}
                                                className="text-red-400 hover:text-red-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(item.customerCodes || []).length === 0 && (
                                    <p className="text-xs text-slate-400 italic">Nessun cliente selezionato.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'MANUFACTURER' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup 
                                label="Nome Produttore (Brand)" 
                                value={item.manufacturer?.name} 
                                onChange={(val) => handleNestedChange('manufacturer', 'name', val)} 
                            />
                            <InputGroup 
                                label="Codice Produttore (MPN)" 
                                value={item.manufacturer?.mpn} 
                                onChange={(val) => handleNestedChange('manufacturer', 'mpn', val)} 
                            />
                            <InputGroup 
                                label="Paese di Origine" 
                                value={item.manufacturer?.countryOfOrigin} 
                                onChange={(val) => handleNestedChange('manufacturer', 'countryOfOrigin', val)} 
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'SUPPLIERS' && (
                    <div className="space-y-6">
                        {/* List */}
                        <div className="space-y-2 mb-6">
                            {(item.suppliers || []).map((s, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center ${s.isPreferred ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700 text-sm">{s.supplierName}</span>
                                            {s.isPreferred && <span className="text-[10px] bg-green-200 text-green-800 px-1 rounded">PREF</span>}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            SKU: {s.supplierSku} | € {s.price} | LT: {s.leadTimeDays}gg
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!s.isPreferred && (
                                            <button onClick={() => handleSetPreferred(idx)} className="text-[10px] font-bold text-blue-600 hover:underline">Set Pref</button>
                                        )}
                                        <button onClick={() => handleRemoveSupplier(idx)} className="text-red-500 hover:text-red-700">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(item.suppliers || []).length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">Nessun fornitore associato.</p>}
                        </div>

                        {/* Add Form */}
                        <div className="neu-flat p-4 bg-slate-50">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">+ Aggiungi Relazione Fornitore</h4>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <InputGroup label="Nome Fornitore" value={newSup.supplierName} onChange={(v) => setNewSup({...newSup, supplierName: v})} />
                                <InputGroup label="Codice Fornitore (SKU)" value={newSup.supplierSku} onChange={(v) => setNewSup({...newSup, supplierSku: v})} />
                                <InputGroup label="Prezzo Unitario (€)" value={newSup.price} onChange={(v) => setNewSup({...newSup, price: v})} type="number" />
                                <InputGroup label="Lotto Minimo (MOQ)" value={newSup.minOrderQty} onChange={(v) => setNewSup({...newSup, minOrderQty: v})} type="number" />
                                <InputGroup label="Lead Time (gg)" value={newSup.leadTimeDays} onChange={(v) => setNewSup({...newSup, leadTimeDays: v})} type="number" />
                                <InputGroup label="Pagamento" value={newSup.paymentTerms} onChange={(v) => setNewSup({...newSup, paymentTerms: v})} />
                            </div>
                            <button onClick={handleAddSupplier} className="w-full neu-btn py-2 text-blue-600 text-sm font-bold">Aggiungi alla Lista</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- SUPPLIER FORM ---

const SupplierForm: React.FC<{
    supplier: Supplier;
    onChange: (s: Supplier) => void;
    client: Client;
}> = ({ supplier, onChange, client }) => {
    const [activeTab, setActiveTab] = useState<'LEGAL' | 'OPERATIONAL'>('LEGAL');

    const handleFieldChange = (updates: Partial<Supplier>) => {
        onChange({ ...supplier, ...updates });
    };

    const handleLegalAddressChange = (updates: Partial<Address & { phone: string }>) => {
        onChange({
            ...supplier,
            legalAddress: {
                ...(supplier.legalAddress || { street: '', number: '', zip: '', city: '', province: '', phone: '' }),
                ...updates
            }
        });
    };

    const handleOperationalChange = (updates: any) => {
        onChange({
            ...supplier,
            operationalAddress: {
                ...(supplier.operationalAddress || {
                    plantName: '',
                    contact: { email: '', phone: '' },
                    address: { street: '', number: '', zip: '', city: '', province: '' },
                    technicalOffice: { email: '', phone: '' },
                    commercialOffice: { email: '', phone: '' },
                    supportOffice: { email: '', phone: '', street: '', number: '', zip: '', city: '', province: '' },
                    logisticsOffice: { email: '', phone: '' },
                    warehouse: { email: '', phone: '', street: '', number: '', zip: '', city: '', province: '' }
                }),
                ...updates
            }
        });
    };

    const handleOperationalNestedChange = (section: string, updates: any) => {
        const currentOp = supplier.operationalAddress || {
            plantName: '',
            contact: { email: '', phone: '' },
            address: { street: '', number: '', zip: '', city: '', province: '' },
            technicalOffice: { email: '', phone: '' },
            commercialOffice: { email: '', phone: '' },
            supportOffice: { email: '', phone: '', street: '', number: '', zip: '', city: '', province: '' },
            logisticsOffice: { email: '', phone: '' },
            warehouse: { email: '', phone: '', street: '', number: '', zip: '', city: '', province: '' }
        };
        handleOperationalChange({
            [section]: {
                ...(currentOp as any)[section],
                ...updates
            }
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex border-b border-slate-200 mb-4 bg-slate-50 rounded-t-xl">
                <button
                    onClick={() => setActiveTab('LEGAL')}
                    className={`flex-1 px-6 py-2.5 text-xs font-bold transition-colors ${activeTab === 'LEGAL' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                    Sede Legale
                </button>
                <button
                    onClick={() => setActiveTab('OPERATIONAL')}
                    className={`flex-1 px-6 py-2.5 text-xs font-bold transition-colors ${activeTab === 'OPERATIONAL' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                    Sede Operativa
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar px-1">
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <InputGroup label="ID Fornitore" value={supplier.id} onChange={() => {}} placeholder="Auto-generato" />
                    <InputGroup label="Nickname" value={supplier.nickname} onChange={(val) => handleFieldChange({ nickname: val })} placeholder="Es. Nome Abbreviato" />
                    <div className="col-span-2">
                        <InputGroup label="Ragione Sociale" value={supplier.name} onChange={(val) => handleFieldChange({ name: val })} />
                    </div>
                </div>

                {activeTab === 'LEGAL' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <InputGroup label="Email Contatto" value={supplier.email} onChange={(val) => handleFieldChange({ email: val })} type="email" />
                            <InputGroup label="Telefono Principale" value={supplier.legalAddress?.phone} onChange={(val) => handleLegalAddressChange({ phone: val })} />
                            <InputGroup label="Termini Pagamento" value={supplier.paymentTerms} onChange={(val) => handleFieldChange({ paymentTerms: val })} />
                            <InputGroup 
                                label="Status Qualifica" 
                                value={supplier.status || 'PENDING'} 
                                onChange={() => {}} 
                                readOnly 
                                tooltip={{
                                    title: "Stato Qualifica Fornitore",
                                    description: "Stato derivante dal processo di qualifica ISO 9001.",
                                    usage: "Sola lettura. Gestito nel modulo Qualifica Fornitori."
                                }}
                            />
                            <SelectGroup 
                                label="Rating Interno (Esperienza Buyer)" 
                                value={supplier.rating?.toString()} 
                                onChange={(val) => handleFieldChange({ rating: parseInt(val) })} 
                                options={[
                                    { value: "1", label: "1 - Critico (Inaffidabile/Gravi problemi)" },
                                    { value: "2", label: "2 - Insufficiente (Ritardi/Qualità scarsa)" },
                                    { value: "3", label: "3 - Sufficiente (Standard minimo)" },
                                    { value: "4", label: "4 - Buono (Affidabile/Collaborativo)" },
                                    { value: "5", label: "5 - Eccellente (Partner Strategico)" }
                                ]}
                                tooltip={{
                                    title: "Valutazione Qualitativa",
                                    description: "Giudizio soggettivo del buyer basato sull'esperienza diretta di fornitura.",
                                    usage: "Seleziona il livello che meglio descrive la relazione commerciale."
                                }}
                            />
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <h4 className="text-xs font-black text-slate-500 uppercase mb-2">Indirizzo Sede Legale</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <div className="col-span-2"><InputGroup label="Via" value={supplier.legalAddress?.street} onChange={(val) => handleLegalAddressChange({ street: val })} /></div>
                                <InputGroup label="Civ." value={supplier.legalAddress?.number} onChange={(val) => handleLegalAddressChange({ number: val })} />
                                <InputGroup label="CAP" value={supplier.legalAddress?.zip} onChange={(val) => handleLegalAddressChange({ zip: val })} />
                                <InputGroup label="Città" value={supplier.legalAddress?.city} onChange={(val) => handleLegalAddressChange({ city: val })} />
                                <InputGroup label="Prov." value={supplier.legalAddress?.province} onChange={(val) => handleLegalAddressChange({ province: val })} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'OPERATIONAL' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <InputGroup label="Nome Stabilimento" value={supplier.operationalAddress?.plantName} onChange={(val) => handleOperationalChange({ plantName: val })} />
                            <InputGroup label="Email Principale" value={supplier.operationalAddress?.contact.email} onChange={(val) => handleOperationalNestedChange('contact', { email: val })} />
                            <InputGroup label="Tel. Principale" value={supplier.operationalAddress?.contact.phone} onChange={(val) => handleOperationalNestedChange('contact', { phone: val })} />
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <h4 className="text-xs font-black text-slate-500 uppercase mb-2">Recapito Sede Operativa</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <div className="col-span-2"><InputGroup label="Via" value={supplier.operationalAddress?.address.street} onChange={(val) => handleOperationalNestedChange('address', { street: val })} /></div>
                                <InputGroup label="Civ." value={supplier.operationalAddress?.address.number} onChange={(val) => handleOperationalNestedChange('address', { number: val })} />
                                <InputGroup label="CAP" value={supplier.operationalAddress?.address.zip} onChange={(val) => handleOperationalNestedChange('address', { zip: val })} />
                                <InputGroup label="Città" value={supplier.operationalAddress?.address.city} onChange={(val) => handleOperationalNestedChange('address', { city: val })} />
                                <InputGroup label="Prov." value={supplier.operationalAddress?.address.province} onChange={(val) => handleOperationalNestedChange('address', { province: val })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <h4 className="text-xs font-black text-blue-800 uppercase mb-2">Ufficio Tecnico</h4>
                                <InputGroup label="Email" value={supplier.operationalAddress?.technicalOffice.email} onChange={(val) => handleOperationalNestedChange('technicalOffice', { email: val })} />
                                <InputGroup label="Tel." value={supplier.operationalAddress?.technicalOffice.phone} onChange={(val) => handleOperationalNestedChange('technicalOffice', { phone: val })} />
                            </div>
                            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                <h4 className="text-xs font-black text-emerald-800 uppercase mb-2">Ufficio Commerciale</h4>
                                <InputGroup label="Email" value={supplier.operationalAddress?.commercialOffice.email} onChange={(val) => handleOperationalNestedChange('commercialOffice', { email: val })} />
                                <InputGroup label="Tel." value={supplier.operationalAddress?.commercialOffice.phone} onChange={(val) => handleOperationalNestedChange('commercialOffice', { phone: val })} />
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                            <h4 className="text-xs font-black text-amber-800 uppercase mb-2">Ufficio Assistenza / Resi</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <InputGroup label="Email" value={supplier.operationalAddress?.supportOffice.email} onChange={(val) => handleOperationalNestedChange('supportOffice', { email: val })} />
                                <InputGroup label="Tel." value={supplier.operationalAddress?.supportOffice.phone} onChange={(val) => handleOperationalNestedChange('supportOffice', { phone: val })} />
                                <div className="col-span-2 grid grid-cols-3 gap-2 mt-1">
                                    <div className="col-span-2"><InputGroup label="Via" value={supplier.operationalAddress?.supportOffice.street} onChange={(val) => handleOperationalNestedChange('supportOffice', { street: val })} /></div>
                                    <InputGroup label="Civ." value={supplier.operationalAddress?.supportOffice.number} onChange={(val) => handleOperationalNestedChange('supportOffice', { number: val })} />
                                    <InputGroup label="CAP" value={supplier.operationalAddress?.supportOffice.zip} onChange={(val) => handleOperationalNestedChange('supportOffice', { zip: val })} />
                                    <InputGroup label="Città" value={supplier.operationalAddress?.supportOffice.city} onChange={(val) => handleOperationalNestedChange('supportOffice', { city: val })} />
                                    <InputGroup label="Prov." value={supplier.operationalAddress?.supportOffice.province} onChange={(val) => handleOperationalNestedChange('supportOffice', { province: val })} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                <h4 className="text-xs font-black text-indigo-800 uppercase mb-2">Logistica / Spedizioni</h4>
                                <InputGroup label="Email" value={supplier.operationalAddress?.logisticsOffice.email} onChange={(val) => handleOperationalNestedChange('logisticsOffice', { email: val })} />
                                <InputGroup label="Tel." value={supplier.operationalAddress?.logisticsOffice.phone} onChange={(val) => handleOperationalNestedChange('logisticsOffice', { phone: val })} />
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <h4 className="text-xs font-black text-slate-700 uppercase mb-2">Magazzino</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <InputGroup label="Email" value={supplier.operationalAddress?.warehouse.email} onChange={(val) => handleOperationalNestedChange('warehouse', { email: val })} />
                                    <InputGroup label="Tel." value={supplier.operationalAddress?.warehouse.phone} onChange={(val) => handleOperationalNestedChange('warehouse', { phone: val })} />
                                    <div className="col-span-2 grid grid-cols-3 gap-2 mt-1">
                                        <div className="col-span-2"><InputGroup label="Via" value={supplier.operationalAddress?.warehouse.street} onChange={(val) => handleOperationalNestedChange('warehouse', { street: val })} /></div>
                                        <InputGroup label="Civ." value={supplier.operationalAddress?.warehouse.number} onChange={(val) => handleOperationalNestedChange('warehouse', { number: val })} />
                                        <InputGroup label="CAP" value={supplier.operationalAddress?.warehouse.zip} onChange={(val) => handleOperationalNestedChange('warehouse', { zip: val })} />
                                        <InputGroup label="Città" value={supplier.operationalAddress?.warehouse.city} onChange={(val) => handleOperationalNestedChange('warehouse', { city: val })} />
                                        <InputGroup label="Prov." value={supplier.operationalAddress?.warehouse.province} onChange={(val) => handleOperationalNestedChange('warehouse', { province: val })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Modal Component ---

const MasterDataModal: React.FC<MasterDataModalProps> = ({ 
  isOpen, 
  onClose, 
  type, 
  initialData, 
  onSave, 
  onDelete,
  client 
}) => {
  const [formData, setFormData] = useState<any>({});
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        // Reset form for creation based on type
        const defaults = type === 'ITEMS' 
          ? { 
              sku: '', name: '', 
              group: '', 
              macroFamily: '', 
              family: '', 
              category: '',
              cost: 0, stock: 0, safetyStock: 0, 
              revision: '0', variant: 'A', progressive: '001',
              unit: 'pz', weightKg: 0,
              manufacturer: { name: '', mpn: '' },
              suppliers: [],
              technicalSpecs: {},
              isPhantom: false,
              isSubcontracting: false,
              leadTimeOffset: 0,
              multiUM: { purchase: '', storage: '', consumption: '', conversionFactor: 1 },
              skuPrefix: 'MP',
              technicalClass: '',
              technicalSubclass: '',
              attachments: { cadUrl: '', specsUrl: '', manualUrl: '' },
              lotPolicy: 'LFL',
              minLotSize: 1
            }
          : type === 'SUPPLIERS'
          ? { 
              id: '', 
              name: '', 
              nickname: '',
              rating: 3, 
              email: '', 
              paymentTerms: '',
              legalAddress: { street: '', number: '', zip: '', city: '', province: '', phone: '' },
              operationalAddress: {
                plantName: '',
                contact: { email: '', phone: '' },
                address: { street: '', number: '', zip: '', city: '', province: '' },
                technicalOffice: { email: '', phone: '' },
                commercialOffice: { email: '', phone: '' },
                supportOffice: { email: '', phone: '', street: '', number: '', zip: '', city: '', province: '' },
                logisticsOffice: { email: '', phone: '' },
                warehouse: { email: '', phone: '', street: '', number: '', zip: '', city: '', province: '' }
              }
            }
          : { name: '', vatNumber: '', email: '', region: '', paymentTerms: '', monthlyFee: 0, contractStartDate: '', contractEndDate: '' };
        setFormData(defaults);

        // Auto-generate ID for suppliers
        if (type === 'SUPPLIERS' && client) {
            dataService.getSuppliersCount(client).then(count => {
                const nextId = `SUP-${String(count + 1).padStart(3, '0')}`;
                setFormData(prev => ({ ...prev, id: nextId }));
            });
        }
      }
    }
  }, [isOpen, initialData, type, client]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (type === 'ITEMS' && !formData.sku) {
      setError("Lo SKU è obbligatorio per gli articoli.");
      return;
    }
    if (!formData.name) {
      setError("Il nome/ragione sociale è obbligatorio.");
      return;
    }
    setError(null);
    onSave(formData);
    onClose();
  };

  return (
    <>
      <ConfirmModal 
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => onDelete && onDelete(initialData.id)}
        title="Conferma Eliminazione"
        message="Sei sicuro di voler eliminare questo elemento? L'operazione è irreversibile."
        confirmText="Elimina"
        type="danger"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#EEF2F6] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-white/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-700">
              {initialData ? 'Modifica' : 'Nuovo'} {type === 'ITEMS' ? 'Articolo Enterprise' : type === 'SUPPLIERS' ? 'Fornitore' : type === 'CUSTOMERS' ? 'Cliente' : 'Azienda'}
            </h3>
            <p className="text-xs text-slate-500">Gestione avanzata anagrafica centralizzata</p>
          </div>
          <button onClick={onClose} className="neu-icon-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-3 sm:p-4 overflow-auto custom-scrollbar flex-1 flex flex-col">
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            {/* ITEM FORM SWITCHER */}
            <div className="min-w-[300px] sm:min-w-0 flex-1 flex flex-col">
                {type === 'ITEMS' ? (
                    <EnterpriseItemForm 
                        item={formData as Item} 
                        onChange={(updated) => setFormData(updated)} 
                        setError={setError}
                        client={client}
                    />
                ) : type === 'SUPPLIERS' ? (
                    <SupplierForm 
                        supplier={formData as Supplier}
                        onChange={(updated) => setFormData(updated)}
                        client={client!}
                    />
                ) : (
                    /* LEGACY SIMPLE FORMS FOR CUSTOMERS */
                    <div className="p-2 overflow-y-auto custom-scrollbar">
                        {type === 'CUSTOMERS' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-1 sm:col-span-2">
                                <InputGroup label="Ragione Sociale" value={formData.name} onChange={(val) => handleChange('name', val)} />
                            </div>
                            <InputGroup label="Partita IVA" value={formData.vatNumber} onChange={(val) => handleChange('vatNumber', val)} />
                            <InputGroup label="Zona / Regione" value={formData.region} onChange={(val) => handleChange('region', val)} />
                            <InputGroup label="Email Amministrazione" value={formData.email} onChange={(val) => handleChange('email', val)} type="email" />
                            <InputGroup label="Indirizzo Sede" value={formData.address} onChange={(val) => handleChange('address', val)} />
                            <div className="col-span-1 sm:col-span-2">
                                <InputGroup label="Condizioni Pagamento" value={formData.paymentTerms} onChange={(val) => handleChange('paymentTerms', val)} />
                            </div>
                            <div className="col-span-1 sm:col-span-2 mt-4 border-t border-slate-200 pt-4">
                                <h4 className="text-sm font-bold text-slate-700 mb-4">Contratto di Servizio (Centrale Acquisti)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <InputGroup label="Fee Mensile (€)" value={formData.monthlyFee} onChange={(val) => handleChange('monthlyFee', val)} type="number" />
                                    <InputGroup label="Data Inizio Contratto" value={formData.contractStartDate} onChange={(val) => handleChange('contractStartDate', val)} type="date" />
                                    <InputGroup label="Data Fine Contratto" value={formData.contractEndDate} onChange={(val) => handleChange('contractEndDate', val)} type="date" />
                                </div>
                            </div>
                        </div>
                        )}

                        {type === 'CLIENTS' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-1 sm:col-span-2">
                                <InputGroup label="Nome Azienda (Tenant)" value={formData.name} onChange={(val) => handleChange('name', val)} />
                            </div>
                            <InputGroup label="Logo URL (opzionale)" value={formData.logoUrl} onChange={(val) => handleChange('logoUrl', val)} />
                        </div>
                        )}
                    </div>
                )}
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white/50 flex justify-between items-center">
          <div>
            {initialData && onDelete && (
              <button 
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Elimina
              </button>
            )}
          </div>
          <div className="flex space-x-4">
            <button onClick={onClose} className="neu-btn px-6 py-2 text-slate-600">Annulla</button>
            <button onClick={handleSubmit} className="neu-btn px-6 py-2 text-white bg-blue-600 shadow-md">
              Salva Modifiche
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default MasterDataModal;
