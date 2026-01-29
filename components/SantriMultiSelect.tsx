
import React, { useState, useMemo } from 'react';
import { Search, CheckSquare, Square } from 'lucide-react';
import type { Santri } from '../types';

interface SantriMultiSelectProps {
    santriList: Santri[];
    selectedIds: number[];
    onToggle: (id: number) => void;
    label?: string;
    disabled?: boolean;
}

const SantriMultiSelect: React.FC<SantriMultiSelectProps> = ({ 
    santriList, 
    selectedIds, 
    onToggle, 
    label = "Pilih Santri", 
    disabled = false 
}) => {
    const [search, setSearch] = useState('');
    
    const filteredList = useMemo(() => {
        if (!search) return santriList;
        return santriList.filter(s => 
            s.nama.toLowerCase().includes(search.toLowerCase()) || 
            s.kelas.toLowerCase().includes(search.toLowerCase())
        );
    }, [santriList, search]);

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">{label} ({selectedIds.length} dipilih)</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                </div>
                <input 
                    type="text" 
                    placeholder="Cari nama santri atau kelas..." 
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-secondary focus:border-secondary sm:text-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    disabled={disabled}
                />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-2 space-y-1">
                {filteredList.length > 0 ? (
                    filteredList.map(s => {
                        const isSelected = selectedIds.includes(s.id);
                        return (
                            <div 
                                key={s.id} 
                                onClick={() => !disabled && onToggle(s.id)}
                                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-white border border-transparent'}`}
                            >
                                <div className={`flex-shrink-0 mr-3 ${isSelected ? 'text-secondary' : 'text-slate-400'}`}>
                                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${isSelected ? 'text-secondary' : 'text-slate-700'}`}>{s.nama}</p>
                                    <p className="text-xs text-slate-500">{s.marhalah} - {s.kelas}</p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-xs text-slate-400 py-4">Tidak ada data santri ditemukan.</p>
                )}
            </div>
        </div>
    );
};

export default SantriMultiSelect;
