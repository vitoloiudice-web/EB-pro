import React, { useState, useEffect } from 'react';
import { BillOfMaterials, BOMItem, BomNodeType } from '../types';
import { fetchBOMs, addBOM, updateBomNode } from '../services/dataService';

interface BOMProps {
    tenantId: string;
    isMultiTenant: boolean;
}

type EditSection = 'IDENTIFIER' | 'TYPE' | 'DETAILS';

const BillOfMaterialsView: React.FC<BOMProps> = ({ tenantId, isMultiTenant }) => {
    const [activeTab, setActiveTab] = useState<'import' | 'manage'>('manage');
    const [boms, setBoms] = useState<BillOfMaterials[]>([]);
    
    // IMPORT STATE
    const [importText, setImportText] = useState('');
    const [importName, setImportName] = useState('');
    const [parsedPreview, setParsedPreview] = useState<BOMItem[]>([]);
    
    // MANAGE STATE
    const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
    
    // EDIT MODAL STATE
    const [editingNode, setEditingNode] = useState<BOMItem | null>(null);
    const [editSection, setEditSection] = useState<EditSection | null>(null);

    // Inputs for edit modal
    const [newSkuInput, setNewSkuInput] = useState('');
    const [newDescriptionInput, setNewDescriptionInput] = useState(''); // NEW
    const [newWbsInput, setNewWbsInput] = useState('');
    const [newNodeType, setNewNodeType] = useState<BomNodeType>('Component');
    const [newQuantity, setNewQuantity] = useState<number>(1);
    const [newUom, setNewUom] = useState<string>('PZ');
    
    // TREE VIEW STATE
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    
    // SEARCH STATE
    const [bomSearchQuery, setBomSearchQuery] = useState('');

    useEffect(() => {
        loadBoms();
    }, [tenantId, isMultiTenant]);

    // Auto-expand all nodes when a BOM is selected
    useEffect(() => {
        if (selectedBomId) {
            setBomSearchQuery(''); // Reset search on BOM switch
            const bom = boms.find(b => b.id === selectedBomId);
            if (bom) {
                const allIds = new Set(bom.items.map(i => i.id));
                setExpandedIds(allIds);
            }
        }
    }, [selectedBomId, boms]);

    const loadBoms = async () => {
        const effectiveFilter = isMultiTenant ? 'all' : tenantId;
        const data = await fetchBOMs(effectiveFilter);
        setBoms(data);
    };

    // --- IMPORT LOGIC ---
    const handleParse = () => {
        const lines = importText.split('\n').filter(l => l.trim().length > 0);
        const parsed: BOMItem[] = [];
        
        lines.forEach((line, index) => {
            let level = 0;
            let wbs = '';
            let description = line.trim();
            let qty = 1;

            const leadingSpaces = line.search(/\S|$/);
            if (leadingSpaces > 0) level = Math.floor(leadingSpaces / 2); 

            const wbsMatch = line.trim().match(/^([\d\.a-z]+)\s+(.+)/i);
            if (wbsMatch) {
                wbs = wbsMatch[1];
                description = wbsMatch[2];
                level = (wbs.match(/\./g) || []).length;
            } else {
                wbs = `${index + 1}`;
            }

            parsed.push({
                id: `tmp-${index}`,
                level,
                wbs,
                description,
                nodeType: 'Component',
                quantity: qty,
                uom: 'PZ'
            });
        });

        setParsedPreview(parsed);
    };

    const handleImportSubmit = async () => {
        if (!importName || parsedPreview.length === 0) {
            alert("Inserisci un nome e assicurati di aver analizzato i dati.");
            return;
        }

        const newBom: Omit<BillOfMaterials, 'id'> = {
            tenantId: isMultiTenant ? 'main' : tenantId,
            name: importName,
            description: 'Importata da Excel/Appunti',
            revision: '1.0',
            status: 'Draft',
            items: parsedPreview,
            createdAt: new Date().toISOString()
        };

        await addBOM(newBom);
        alert("Distinta Base importata con successo!");
        setImportText('');
        setImportName('');
        setParsedPreview([]);
        setActiveTab('manage');
        loadBoms();
    };

    // --- MANAGE: EDIT NODE LOGIC ---
    const openEditModal = (item: BOMItem, section: EditSection) => {
        setEditingNode(item);
        setEditSection(section);
        
        // Init Inputs
        setNewWbsInput(item.wbs);
        setNewSkuInput(item.partNumber || '');
        setNewDescriptionInput(item.description); // NEW
        setNewNodeType(item.nodeType);
        setNewQuantity(item.quantity);
        setNewUom(item.uom);
    };

    const handleUpdateNode = async () => {
        if (!editingNode || !selectedBomId) return;

        // Construct updates based on what might have changed
        // In a real scenario, we might only send changed fields, but sending all "editable" ones is safe here
        await updateBomNode(selectedBomId, editingNode.wbs, {
            wbs: newWbsInput,
            nodeType: newNodeType,
            partNumber: newSkuInput,
            description: newDescriptionInput, // NEW
            quantity: newQuantity,
            uom: newUom
        });
        
        await loadBoms();
        setEditingNode(null);
        setEditSection(null);
    };

    // --- TREE VIEW LOGIC ---
    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); 
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIds(newSet);
    };

    const expandToLevel = (targetLevel: number) => {
        const bom = boms.find(b => b.id === selectedBomId);
        if (!bom) return;
        
        const newSet = new Set<string>();
        if (targetLevel === 0) {
             setExpandedIds(newSet);
             return;
        }

        bom.items.forEach(item => {
            if (item.level < targetLevel) {
                newSet.add(item.id);
            }
        });
        setExpandedIds(newSet);
    };

    const expandAll = () => {
        const bom = boms.find(b => b.id === selectedBomId);
        if (!bom) return;
        setExpandedIds(new Set(bom.items.map(i => i.id)));
    };

    // --- FILTER LOGIC ---
    const getFilteredItems = (items: BOMItem[]) => {
        if (!bomSearchQuery) return items;
        
        const lowerQuery = bomSearchQuery.toLowerCase();

        // 1. Find direct matches
        const matchingNodes = items.filter(item => 
            item.description.toLowerCase().includes(lowerQuery) ||
            item.wbs.toLowerCase().includes(lowerQuery) ||
            (item.partNumber && item.partNumber.toLowerCase().includes(lowerQuery)) ||
            item.nodeType.toLowerCase().includes(lowerQuery)
        );

        if (matchingNodes.length === 0) return [];

        // 2. Identify all IDs to keep (Matches + Parents) to preserve hierarchy
        const idsToKeep = new Set<string>();
        
        matchingNodes.forEach(node => {
            idsToKeep.add(node.id);
            
            // Heuristic to find parents based on WBS structure (e.g. 1.2.1 parent is 1.2, then 1)
            const parts = node.wbs.split('.');
            let currentPath = "";
            parts.forEach((part, index) => {
                if (index === parts.length - 1) return; // Skip self
                currentPath = currentPath ? `${currentPath}.${part}` : part;
                const parent = items.find(i => i.wbs === currentPath);
                if (parent) idsToKeep.add(parent.id);
            });
            // Also ensure Root (level 0) is kept if strict WBS parsing fails
            const root = items.find(i => i.level === 0);
            if(root) idsToKeep.add(root.id);
        });

        // 3. Return filtered list preserving original order
        return items.filter(item => idsToKeep.has(item.id));
    };


    // --- HELPER: NODE TYPE BADGES ---
    const getNodeTypeBadge = (type: BomNodeType) => {
        switch(type) {
            case 'Product': return 'bg-slate-800 text-white border-slate-700';
            case 'Assembly': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Sub-Assembly': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Component': return 'bg-green-50 text-green-700 border-green-200';
            case 'Variant': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Option': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    // Helper for Button Labels
    const getLevelLabel = (lvl: number) => {
        switch(lvl) {
            case 0: return "Prodotto";
            case 1: return "Macro";
            case 2: return "Gruppi";
            case 3: return "Sotto-Gr.";
            default: return "Comp.";
        }
    };

    // --- RENDERERS ---

    const renderBomTree = (allItems: BOMItem[]) => {
        const filteredItems = getFilteredItems(allItems);
        const isFiltering = !!bomSearchQuery;

        // In Search Mode, we skip the collapse check to show results clearly
        const visibleItems = isFiltering ? filteredItems : filteredItems.filter((item, index) => {
             // ... Standard collapse logic ...
             let currentCollapsedLevel: number | null = null;
             // We need to re-run the logic because filteredItems is a new array
             // Ideally, we run this on the 'filtered' list but checking 'expandedIds' against the item IDs
             // However, simplified approach: Recalculate based on predecessors in the filtered list
             
             // Check if any *visible* parent is collapsed.
             // Since it's a flat list, we can't easily check parents without looking back.
             // Standard optimization:
             return true; 
        }).filter((item) => {
             // Second pass for collapsed state, only if NOT filtering
             // Find parent WBS logic or look back?
             // Simplest: Check if *direct* parent is collapsed. 
             // Since we don't have direct parent pointers easily, we use the original logic 
             // BUT we must adapt it to work with the potentially sparse filtered array if we wanted strictness.
             // FOR NOW: Let's reuse the simple visibility logic on the *filtered* list, 
             // but referencing the expandedIds which stores IDs.
             
             // Find the nearest predecessor with level < current.level
             // If that predecessor is NOT expanded, hide this.
             // This is O(N^2) in worst case but N is small for BOM view usually.
             
             // Optimization: Linear scan with stack?
             // Let's stick to the previous implementation logic but applied to the filtered list.
             // Actually, the previous implementation relied on sequentiality.
             
             // REVERTING to previous sequential logic:
             return true;
        });
        
        // --- REAL VISIBILITY LOGIC (Re-implemented for Filtered List) ---
        const finalRenderItems = [];
        if (isFiltering) {
            finalRenderItems.push(...filteredItems);
        } else {
            let skipUntilLevel: number | null = null;
            for (const item of filteredItems) {
                if (skipUntilLevel !== null) {
                    if (item.level > skipUntilLevel) {
                        continue; // Skip child of collapsed node
                    } else {
                        skipUntilLevel = null; // Reset
                    }
                }
                
                finalRenderItems.push(item);

                if (!expandedIds.has(item.id)) {
                    // Check if next item is child
                    const nextIndex = filteredItems.indexOf(item) + 1;
                    if (nextIndex < filteredItems.length && filteredItems[nextIndex].level > item.level) {
                        skipUntilLevel = item.level;
                    }
                }
            }
        }


        // Calculate max depth for this specific BOM to render dynamic buttons
        const maxDepth = allItems.reduce((max, item) => Math.max(max, item.level), 0);

        return (
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col h-full">
                {/* Tree Toolbar */}
                <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-col gap-2">
                    {/* Level Buttons Row */}
                    <div className="flex gap-2 overflow-x-auto items-center pb-2 md:pb-0">
                         <button onClick={expandAll} className="px-3 py-1 text-xs font-bold bg-slate-800 text-white rounded hover:bg-slate-700 whitespace-nowrap shadow-sm">
                            Espandi Tutto
                        </button>
                        <div className="w-px h-6 bg-slate-300 mx-1"></div>
                        {Array.from({ length: maxDepth + 1 }).map((_, lvl) => (
                            <button 
                                key={lvl}
                                onClick={() => expandToLevel(lvl)} 
                                className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200 whitespace-nowrap border border-slate-200 transition-colors"
                            >
                                Liv. {lvl} ({getLevelLabel(lvl)})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Header */}
                <div className="bg-slate-100 px-4 py-3 border-b flex font-bold text-xs text-slate-500 uppercase tracking-wider shrink-0">
                    <div className="w-40">Identificativo</div>
                    <div className="w-24 text-center">Tipo Nodo</div>
                    <div className="flex-1 pl-4">Struttura & Descrizione</div>
                    <div className="w-20 text-center">Q.tà</div>
                    <div className="w-16 text-center">U.M.</div>
                </div>
                
                {/* Body - Scrollable */}
                <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                    {finalRenderItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">
                            {isFiltering ? 'Nessun componente trovato con questi criteri.' : 'Nessun dato.'}
                        </div>
                    ) : (
                        finalRenderItems.map((item) => {
                            const originalIndex = allItems.findIndex(i => i.id === item.id);
                            const hasChildren = allItems[originalIndex + 1] && allItems[originalIndex + 1].level > item.level;
                            const isExpanded = expandedIds.has(item.id) || isFiltering; // Always expanded if filtering

                            // Highlight Logic
                            const isMatch = isFiltering && (
                                item.description.toLowerCase().includes(bomSearchQuery.toLowerCase()) ||
                                item.wbs.includes(bomSearchQuery) ||
                                (item.partNumber && item.partNumber.toLowerCase().includes(bomSearchQuery.toLowerCase()))
                            );

                            return (
                                <div 
                                    key={item.id} 
                                    className={`flex items-stretch group transition-colors min-h-[60px] ${isMatch ? 'bg-yellow-50' : 'hover:bg-blue-50'}`}
                                >
                                    {/* COL 1: HIERARCHY ID - CLICKABLE FOR WBS/LEVEL */}
                                    <div 
                                        onClick={() => openEditModal(item, 'IDENTIFIER')}
                                        className="w-40 bg-slate-50 border-r border-slate-200 p-2 flex flex-row items-center justify-between shrink-0 cursor-pointer hover:bg-blue-100 transition-colors"
                                    >
                                        <div className="flex flex-col justify-center items-start pointer-events-none">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border mb-1 w-fit ${
                                                item.level === 0 ? 'bg-slate-800 text-white border-slate-800' :
                                                item.level === 1 ? 'bg-slate-200 text-slate-700 border-slate-300' :
                                                'bg-white text-slate-500 border-slate-200'
                                            }`}>
                                                Livello {item.level}
                                            </span>
                                            <span className="text-sm font-bold text-slate-800 font-mono group-hover:text-blue-600 transition-colors">
                                                {item.wbs}
                                            </span>
                                        </div>
                                        
                                        {hasChildren && !isFiltering && (
                                            <button 
                                                onClick={(e) => toggleExpand(e, item.id)}
                                                className="p-1 rounded-full hover:bg-slate-200 text-slate-500 focus:outline-none pointer-events-auto"
                                            >
                                                {isExpanded ? (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* COL 2: NODE TYPE - CLICKABLE FOR TYPE */}
                                    <div 
                                        onClick={() => openEditModal(item, 'TYPE')}
                                        className="w-24 flex items-center justify-center border-r border-slate-100 bg-slate-50/50 p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                                    >
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border shadow-sm text-center w-full pointer-events-none ${getNodeTypeBadge(item.nodeType)}`}>
                                            {item.nodeType}
                                        </span>
                                    </div>

                                    {/* COL 3: STRUCTURE & CONTENT - CLICKABLE FOR SKU/DESC */}
                                    <div 
                                        onClick={() => openEditModal(item, 'DETAILS')}
                                        className="flex-1 flex items-center p-2 relative overflow-hidden cursor-pointer hover:bg-blue-100 transition-colors"
                                    >
                                        <div style={{ width: `${Math.min(item.level * 32, 200)}px` }} className="h-full flex-shrink-0 relative mr-2 transition-all duration-300 pointer-events-none">
                                            {item.level > 0 && (
                                                <>
                                                    <div className="absolute top-0 bottom-1/2 left-0 border-l border-slate-300 w-full"></div>
                                                    <div className="absolute top-1/2 left-0 w-full border-t border-slate-300"></div>
                                                    <div className="absolute top-1/2 -right-1 w-2 h-2 bg-slate-300 rounded-full transform -translate-y-1/2"></div>
                                                </>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 pointer-events-none">
                                            <p className={`text-sm truncate ${item.level === 0 ? 'font-bold text-slate-900 text-lg' : 'font-semibold text-slate-700'}`}>
                                                {item.description}
                                            </p>
                                            {item.partNumber ? (
                                                <p className="text-xs text-epicor-600 font-mono mt-1 flex items-center opacity-80 group-hover:opacity-100">
                                                    <span className="bg-epicor-50 px-1 rounded mr-1 text-[10px] uppercase font-bold tracking-wider">SKU</span> 
                                                    {item.partNumber}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-orange-400 italic mt-1">-- Configurazione Logica --</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* COL 4: QTY - CLICKABLE FOR QTY */}
                                    <div 
                                        onClick={() => openEditModal(item, 'DETAILS')}
                                        className="w-20 flex items-center justify-center text-sm font-bold border-l border-slate-100 bg-slate-50/30 cursor-pointer hover:bg-blue-100 transition-colors"
                                    >
                                        {item.quantity}
                                    </div>
                                    
                                    {/* COL 5: UOM - CLICKABLE FOR UOM */}
                                    <div 
                                        onClick={() => openEditModal(item, 'DETAILS')}
                                        className="w-16 flex items-center justify-center text-xs text-slate-500 border-l border-slate-100 bg-slate-50/30 cursor-pointer hover:bg-blue-100 transition-colors"
                                    >
                                        {item.uom}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    const selectedBom = boms.find(b => b.id === selectedBomId);
    
    // MRP ANALYSIS CALCULATIONS
    const totalNodes = selectedBom?.items.length || 0;
    const maxDepth = selectedBom?.items.reduce((max, item) => Math.max(max, item.level), 0) || 0;
    const variantsCount = selectedBom?.items.filter(i => i.nodeType === 'Variant' || i.nodeType === 'Option').length || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        Distinta Base (BOM) {isMultiTenant && '(Global)'}
                    </h2>
                    <p className="text-slate-500 text-sm">Gestione strutture prodotto e configurazione gerarchica.</p>
                </div>
                
                <div className="flex bg-slate-200 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('import')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'import' ? 'bg-white text-epicor-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        1. Importa DB (Excel)
                    </button>
                    <button 
                        onClick={() => setActiveTab('manage')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'manage' ? 'bg-white text-epicor-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        2. Crea / Modifica DB
                    </button>
                </div>
            </div>

            {/* TAB: IMPORT */}
            {activeTab === 'import' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Importazione Rapida</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Incolla qui sotto i dati dal tuo file Excel. Il sistema proverà a riconoscere automaticamente la struttura (WBS 1.1, 1.1.2) o l'indentazione.
                            </p>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Distinta Base (Breve)</label>
                                <input 
                                    type="text" 
                                    className="w-full border-slate-300 rounded-md shadow-sm p-2 bg-slate-50"
                                    placeholder="Es. Gruppo Motore V2"
                                    value={importName}
                                    onChange={e => setImportName(e.target.value)}
                                />
                            </div>

                            <div className="relative">
                                <textarea 
                                    className="w-full h-64 border border-slate-300 rounded-lg p-4 font-mono text-sm bg-slate-50 focus:ring-epicor-500 focus:border-epicor-500"
                                    placeholder={`Esempio Formato:\n1. Gruppo Principale\n1.1 Sottogruppo A\n1.1.1 Componente X\n1.2 Sottogruppo B`}
                                    value={importText}
                                    onChange={e => setImportText(e.target.value)}
                                ></textarea>
                                <button 
                                    onClick={handleParse}
                                    className="absolute bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-900 shadow-lg"
                                >
                                    Analizza Struttura
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Anteprima Struttura</h3>
                            {parsedPreview.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                                    <p>Incolla i dati e clicca su "Analizza"</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="max-h-64 overflow-y-auto pr-2">
                                        {renderBomTree(parsedPreview)}
                                    </div>
                                    <button 
                                        onClick={handleImportSubmit}
                                        className="w-full bg-epicor-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-epicor-700 transition-colors"
                                    >
                                        Conferma e Salva DB
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: MANAGE */}
            {activeTab === 'manage' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in-up">
                    {/* Sidebar List with Analysis */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-1 flex flex-col h-[600px]">
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <h3 className="font-bold text-slate-700">Elenco DB</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {boms.map(bom => (
                                <button
                                    key={bom.id}
                                    onClick={() => { setSelectedBomId(bom.id); setEditingNode(null); }}
                                    className={`w-full text-left p-3 rounded-lg transition-all ${selectedBomId === bom.id ? 'bg-epicor-50 border border-epicor-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
                                >
                                    <div className="font-bold text-slate-800 text-sm">{bom.name}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex justify-between">
                                        <span>Rev: {bom.revision}</span>
                                        <span className={`px-1.5 rounded ${bom.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{bom.status}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        
                        {/* COMPLEXITY ANALYSIS PANEL */}
                        {selectedBom && (
                            <div className="p-4 bg-slate-800 text-white border-t border-slate-700">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Analisi Complessità</h4>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <div className="text-xl font-bold">{totalNodes}</div>
                                        <div className="text-[10px] text-slate-400">Nodi Totali</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-blue-400">{maxDepth}</div>
                                        <div className="text-[10px] text-slate-400">Profondità Max</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-purple-400">{variantsCount}</div>
                                        <div className="text-[10px] text-slate-400">Varianti/Opzioni</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-green-400">~{Math.ceil(totalNodes * 0.5)}ms</div>
                                        <div className="text-[10px] text-slate-400">Tempo MRP</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Editor Area */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-3 h-[600px] flex flex-col relative">
                        {selectedBom ? (
                            <>
                                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 rounded-t-xl shrink-0">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h2 className="text-2xl font-bold text-slate-800">{selectedBom.name}</h2>
                                            <div className="flex space-x-2">
                                                <button className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50">Modifica Info</button>
                                                <button className="px-4 py-1.5 bg-epicor-600 text-white rounded-md text-sm font-medium hover:bg-epicor-700 shadow-sm">+ Aggiungi Livello</button>
                                            </div>
                                        </div>
                                        
                                        {/* SEARCH FILTER BAR */}
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input 
                                                type="text"
                                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-epicor-500 sm:text-sm shadow-sm"
                                                placeholder="Filtra per WBS, Nome, SKU, Varianti..."
                                                value={bomSearchQuery}
                                                onChange={(e) => setBomSearchQuery(e.target.value)}
                                            />
                                            {bomSearchQuery && (
                                                <button 
                                                    onClick={() => setBomSearchQuery('')}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden p-6">
                                    {renderBomTree(selectedBom.items)}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <p className="text-lg font-medium">Seleziona una Distinta Base per visualizzarla</p>
                            </div>
                        )}

                        {/* EDIT NODE MODAL (DYNAMIC CONTENT BASED ON CLICK) */}
                        {editingNode && editSection && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center">
                                <div className="bg-white shadow-2xl border border-slate-200 rounded-xl p-6 w-96 animate-fade-in-up">
                                    
                                    {/* MODAL HEADER VARIES BY SECTION */}
                                    <h4 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2 flex items-center">
                                        {editSection === 'IDENTIFIER' && <span className="mr-2">🔧</span>}
                                        {editSection === 'TYPE' && <span className="mr-2">🏷️</span>}
                                        {editSection === 'DETAILS' && <span className="mr-2">📦</span>}
                                        
                                        {editSection === 'IDENTIFIER' ? 'Modifica Struttura (WBS)' :
                                         editSection === 'TYPE' ? 'Modifica Tipo Nodo' : 'Dettagli Componente'}
                                    </h4>
                                    
                                    {/* SECTION 1: IDENTIFIER EDIT */}
                                    {editSection === 'IDENTIFIER' && (
                                        <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Identificativo (WBS)</label>
                                            <input 
                                                type="text" 
                                                className="w-full border-blue-300 rounded p-2 font-mono text-sm focus:ring-blue-500 focus:border-blue-500 font-bold"
                                                value={newWbsInput}
                                                onChange={e => setNewWbsInput(e.target.value)}
                                                placeholder="Es. 1.1.2"
                                            />
                                            <p className="text-[10px] text-blue-400 mt-2">
                                                Modificando il WBS cambierà automaticamente il livello gerarchico (punti).
                                            </p>
                                        </div>
                                    )}

                                    {/* SECTION 2: NODE TYPE EDIT */}
                                    {editSection === 'TYPE' && (
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Caratteristica Nodo</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Assembly', 'Sub-Assembly', 'Component', 'Variant', 'Option', 'Product'].map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setNewNodeType(type as BomNodeType)}
                                                        className={`text-xs font-bold py-2 px-1 rounded border transition-all ${
                                                            newNodeType === type 
                                                            ? 'bg-epicor-600 text-white border-epicor-700 shadow-md' 
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 3: DETAILS EDIT (SKU, QTY, UOM) */}
                                    {editSection === 'DETAILS' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrizione</label>
                                                <textarea 
                                                    rows={2}
                                                    className="w-full border-slate-300 rounded p-2 text-sm focus:ring-epicor-500 focus:border-epicor-500"
                                                    value={newDescriptionInput}
                                                    onChange={e => setNewDescriptionInput(e.target.value)}
                                                    placeholder="Descrizione componente..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU Componente (Part Number)</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full border-slate-300 rounded p-2 font-mono text-sm focus:ring-epicor-500 focus:border-epicor-500"
                                                    value={newSkuInput}
                                                    onChange={e => setNewSkuInput(e.target.value)}
                                                    placeholder="Inserisci SKU sostituto..."
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">Aggiorna lo storico sostituzioni.</p>
                                            </div>

                                            <div className="flex space-x-3">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantità</label>
                                                    <input 
                                                        type="number" 
                                                        className="w-full border-slate-300 rounded p-2 text-sm"
                                                        value={newQuantity}
                                                        onChange={e => setNewQuantity(Number(e.target.value))}
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">U.M.</label>
                                                    <select 
                                                        className="w-full border-slate-300 rounded p-2 text-sm"
                                                        value={newUom}
                                                        onChange={e => setNewUom(e.target.value)}
                                                    >
                                                        <option value="PZ">PZ</option>
                                                        <option value="KG">KG</option>
                                                        <option value="MT">MT</option>
                                                        <option value="LT">LT</option>
                                                        <option value="KIT">KIT</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                                        <button 
                                            onClick={() => { setEditingNode(null); setEditSection(null); }} 
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm"
                                        >
                                            Annulla
                                        </button>
                                        <button 
                                            onClick={handleUpdateNode}
                                            className="px-4 py-2 bg-epicor-600 text-white hover:bg-epicor-700 rounded text-sm font-bold shadow"
                                        >
                                            Aggiorna
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillOfMaterialsView;
