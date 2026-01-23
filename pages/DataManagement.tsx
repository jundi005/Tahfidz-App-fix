
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useSupabaseData } from '../hooks/useSupabaseData';
import type { Santri, Musammi, Person, WaliKelas, Halaqah } from '../types';
import { Marhalah, HalaqahType, Waktu } from '../types';
import { KELAS_BY_MARHALAH, ALL_MARHALAH, ALL_HALAQAH_TYPE } from '../constants';
import { Plus, Trash, Upload, Download, Filter, UserCheck, BookOpen, Search, CheckSquare, Square, X, UserPlus, ArrowLeft, Users, Send } from 'lucide-react';
import { parseCSV, exportToExcel, exportToPDF } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';

// Add Props Interface
interface DataManagementProps {
    initialTab?: 'santri' | 'musammi' | 'wali_kelas' | 'halaqah' | 'wali_santri';
}

// --- Internal Component: Santri Multi Select ---
const SantriMultiSelect: React.FC<{
    santriList: Santri[];
    selectedIds: number[];
    onToggle: (id: number) => void;
    label?: string;
    disabled?: boolean;
}> = ({ santriList, selectedIds, onToggle, label = "Pilih Santri", disabled = false }) => {
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

const DataManagement: React.FC<DataManagementProps> = ({ initialTab }) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'santri' | 'musammi' | 'wali_kelas' | 'halaqah' | 'wali_santri'>('santri');
    
    // Sync with prop
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    // Data Hooks
    const { 
        santri, musammi, halaqah, fetchData, loading, error,
        addHalaqah, deleteHalaqah, removeSantriFromHalaqah, addSantriToHalaqah, getOrgId
    } = useSupabaseData();
    const [waliKelasList, setWaliKelasList] = useState<WaliKelas[]>([]);

    // Common State
    const [isModalOpen, setModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Person Management State (Santri/Musammi/Wali) ---
    const [editingPerson, setEditingPerson] = useState<Person | WaliKelas | null>(null);
    const [personFormData, setPersonFormData] = useState<{nama: string, kode: string, marhalah: Marhalah, kelas: string, no_hp: string, nama_wali: string, no_hp_wali: string}>({
        nama: '',
        kode: '',
        marhalah: Marhalah.Mutawassithah,
        kelas: KELAS_BY_MARHALAH[Marhalah.Mutawassithah][0],
        no_hp: '',
        nama_wali: '',
        no_hp_wali: ''
    });

    // --- Halaqah Management State ---
    const [selectedHalaqah, setSelectedHalaqah] = useState<Halaqah | null>(null); // Detail View
    const [halaqahModalType, setHalaqahModalType] = useState<'create' | 'add_member' | null>(null);
    // Halaqah Form
    const [newHalaqahName, setNewHalaqahName] = useState('');
    const [selectedMusammiId, setSelectedMusammiId] = useState<string>('');
    const [selectedJenis, setSelectedJenis] = useState<HalaqahType>(HalaqahType.Utama);
    const [selectedMarhalahNew, setSelectedMarhalahNew] = useState<Marhalah>(Marhalah.Mutawassithah);
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
    const [isCustomJenis, setIsCustomJenis] = useState(false);
    const [customJenisName, setCustomJenisName] = useState('');

    // --- Filters ---
    const [filterMarhalah, setFilterMarhalah] = useState<Marhalah | 'all'>('all');
    const [filterKelas, setFilterKelas] = useState<string | 'all'>('all');
    const [filterJenis, setFilterJenis] = useState<HalaqahType | 'all'>('all'); // Halaqah Specific
    const [filterSearch, setFilterSearch] = useState(''); // General Search

    // --- Fetch Wali Kelas ---
    const fetchWaliKelas = async () => {
        // Fetch manually but respecting RLS implicitly via Supabase client
        const { data, error } = await supabase.from('wali_kelas').select('*').order('marhalah', { ascending: true });
        if (!error && data) {
            setWaliKelasList(data as unknown as WaliKelas[]);
        }
    };

    useEffect(() => {
        if (activeTab === 'wali_kelas') {
            fetchWaliKelas();
        }
        // Reset filters on tab change
        setFilterMarhalah('all');
        setFilterKelas('all');
        setFilterJenis('all');
        setFilterSearch('');
        setSelectedHalaqah(null);
    }, [activeTab]);

    // Update active halaqah object if data changes in background
    useEffect(() => {
        if (selectedHalaqah) {
            const updated = halaqah.find(h => h.id === selectedHalaqah.id);
            if (updated) setSelectedHalaqah(updated);
        }
    }, [halaqah]);

    // --- Computed Data ---
    
    // Available Types for Halaqah Filter
    const availableHalaqahTypes = useMemo(() => {
        const types = new Set<string>(ALL_HALAQAH_TYPE);
        if (halaqah && halaqah.length > 0) {
            halaqah.forEach(h => { if (h.jenis) types.add(h.jenis); });
        }
        return Array.from(types).sort();
    }, [halaqah]);

    // Available Santri for Halaqah Modal
    const availableSantriForHalaqah = useMemo(() => {
        if (halaqahModalType === 'create') {
            return santri.filter(s => s.marhalah === selectedMarhalahNew);
        }
        if (halaqahModalType === 'add_member' && selectedHalaqah) {
            const existingIds = selectedHalaqah.santri.map(s => s.id);
            return santri.filter(s => !existingIds.includes(s.id) && s.marhalah === selectedHalaqah.marhalah);
        }
        return [];
    }, [santri, halaqahModalType, selectedMarhalahNew, selectedHalaqah]);

    // Main Data Filtering
    const filteredData = useMemo(() => {
        if (activeTab === 'halaqah') {
            return halaqah.filter(h => {
                if (filterJenis !== 'all' && h.jenis !== filterJenis) return false;
                if (filterMarhalah !== 'all' && h.marhalah !== filterMarhalah) return false;
                if (filterSearch && !h.nama.toLowerCase().includes(filterSearch.toLowerCase()) && !h.musammi.nama.toLowerCase().includes(filterSearch.toLowerCase())) return false;
                return true;
            }).sort((a, b) => a.nama.localeCompare(b.nama));
        } else {
            let data: any[] = [];
            if (activeTab === 'santri' || activeTab === 'wali_santri') data = santri; // Wali Santri shares table with Santri
            else if (activeTab === 'musammi') data = musammi;
            else if (activeTab === 'wali_kelas') data = waliKelasList;

            return data.filter(item => {
                if (filterMarhalah !== 'all' && item.marhalah !== filterMarhalah) return false;
                if (filterKelas !== 'all' && item.kelas !== filterKelas) return false;
                if (filterSearch) {
                    const searchLower = filterSearch.toLowerCase();
                    if (item.nama.toLowerCase().includes(searchLower)) return true;
                    // Also search by Parent name if in Wali Santri tab
                    if (activeTab === 'wali_santri' && (item as Santri).nama_wali?.toLowerCase().includes(searchLower)) return true;
                    return false;
                }
                return true;
            }).sort((a, b) => {
                // Sort Logic
                const rankMarhalahA = ALL_MARHALAH.indexOf(a.marhalah as Marhalah);
                const rankMarhalahB = ALL_MARHALAH.indexOf(b.marhalah as Marhalah);
                if (rankMarhalahA !== rankMarhalahB) return rankMarhalahA - rankMarhalahB;
                if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
                return a.nama.localeCompare(b.nama);
            });
        }
    }, [activeTab, santri, musammi, waliKelasList, halaqah, filterMarhalah, filterKelas, filterSearch, filterJenis]);

    // --- Actions: Person Management ---

    const openPersonModal = (person: Person | WaliKelas | null) => {
        setEditingPerson(person);
        if (person) {
            setPersonFormData({ 
                nama: person.nama, 
                kode: (person as any).kode || '', 
                marhalah: (person as any).marhalah, 
                kelas: (person as any).kelas,
                no_hp: (person as any).no_hp || '',
                nama_wali: (person as Santri).nama_wali || '',
                no_hp_wali: (person as Santri).no_hp_wali || ''
            });
        } else {
            setPersonFormData({ 
                nama: '', kode: '', marhalah: Marhalah.Mutawassithah, 
                kelas: KELAS_BY_MARHALAH[Marhalah.Mutawassithah][0], no_hp: '',
                nama_wali: '', no_hp_wali: ''
            });
        }
        setModalOpen(true);
    };

    const handlePersonSubmit = async () => {
        setIsSubmitting(true);
        try {
            const orgId = await getOrgId();
            const table = (activeTab === 'santri' || activeTab === 'wali_santri') ? 'santri' : (activeTab === 'musammi' ? 'musammi' : 'wali_kelas');
            
            const payload: any = {
                organization_id: orgId, // Mandatory for new records
                nama: personFormData.nama,
                marhalah: personFormData.marhalah,
                kelas: personFormData.kelas,
            };

            if (table !== 'wali_kelas') payload.kode = personFormData.kode.trim() || null;
            if (table === 'wali_kelas' || table === 'musammi') payload.no_hp = personFormData.no_hp.trim() || null;
            if (table === 'santri') {
                payload.nama_wali = personFormData.nama_wali.trim() || null;
                payload.no_hp_wali = personFormData.no_hp_wali.trim() || null;
            }

            if (editingPerson) {
                // Remove org_id from update payload usually, but RLS prevents cross-tenant update anyway
                delete payload.organization_id; 
                const { error } = await supabase.from(table).update(payload).eq('id', editingPerson.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from(table).insert(payload);
                if (error) throw error;
            }
            
            if (activeTab === 'wali_kelas') await fetchWaliKelas();
            else await fetchData();
            
            setModalOpen(false);
        } catch(e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePersonDelete = async (id: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
        try {
            const table = (activeTab === 'santri' || activeTab === 'wali_santri') ? 'santri' : (activeTab === 'musammi' ? 'musammi' : 'wali_kelas');
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            
            if (activeTab === 'wali_kelas') await fetchWaliKelas();
            else await fetchData();
        } catch(e: any) {
             alert(`Error: ${e.message}`);
        }
    };

    const handleWhatsAppClick = (phone: string | null | undefined) => {
        if (!phone) return;
        let formatted = phone.replace(/\D/g, '');
        if (formatted.startsWith('0')) formatted = '62' + formatted.substring(1);
        window.open(`https://wa.me/${formatted}`, '_blank');
    };

    // --- Actions: Halaqah Management ---

    const openHalaqahCreateModal = () => {
        setHalaqahModalType('create');
        setNewHalaqahName(''); setSelectedMusammiId(''); setSelectedJenis(HalaqahType.Utama);
        setSelectedMarhalahNew(Marhalah.Mutawassithah); setSelectedSantriIds([]);
        setIsCustomJenis(false); setCustomJenisName('');
    };

    const handleHalaqahSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (halaqahModalType === 'create') {
                if (!newHalaqahName.trim()) throw new Error("Nama halaqah wajib diisi.");
                if (!selectedMusammiId) throw new Error("Pilih Musammi' terlebih dahulu.");

                let finalJenis = selectedJenis;
                if (isCustomJenis) {
                    if (!customJenisName.trim()) throw new Error("Nama jenis halaqah baru wajib diisi.");
                    finalJenis = customJenisName as HalaqahType;
                }

                const selectedMusammiIdInt = parseInt(selectedMusammiId);
                const selectedSantriObjects = santri.filter(s => selectedSantriIds.includes(s.id));
                const waktu = finalJenis === HalaqahType.Pagi ? [Waktu.Dhuha] : [Waktu.Shubuh, Waktu.Ashar, Waktu.Isya];

                await addHalaqah({
                    nama: newHalaqahName,
                    musammi_id: selectedMusammiIdInt,
                    santri: selectedSantriObjects, 
                    marhalah: selectedMarhalahNew,
                    jenis: finalJenis,
                    waktu
                });

            } else if (halaqahModalType === 'add_member' && selectedHalaqah) {
                if (selectedSantriIds.length === 0) throw new Error("Pilih minimal satu santri.");
                const santriObjects = santri.filter(s => selectedSantriIds.includes(s.id));
                await Promise.all(santriObjects.map(s => addSantriToHalaqah(selectedHalaqah.id, s)));
            }
            setHalaqahModalType(null);
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteHalaqahAction = async (h: Halaqah) => {
        if (window.confirm(`PERINGATAN: Menghapus halaqah "${h.nama}" akan menghapus semua data absensi terkait.\nLanjutkan?`)) {
            try { await deleteHalaqah(h.id); } catch (e: any) { alert(`Gagal: ${e.message}`); }
        }
    };

    const handleRemoveSantri = async (s: Santri) => {
        if (!selectedHalaqah) return;
        if (window.confirm(`Hapus ${s.nama} dari halaqah?`)) {
             try { await removeSantriFromHalaqah(selectedHalaqah.id, s.id); } catch (e: any) { alert(`Gagal: ${e.message}`); }
        }
    };

    // --- Import / Export ---

    const handleDownloadTemplate = () => {
        let headers = [];
        let rowExample = "";
        let filename = "";

        if (activeTab === 'santri' || activeTab === 'wali_santri') {
            headers = ["kode", "nama", "marhalah", "kelas", "nama_wali", "no_hp_wali"];
            rowExample = "S-001,Ahmad,Mutawassithah,1A,Bapak Ahmad,628123456789";
            filename = "template_santri_wali.csv";
        } else if (activeTab === 'musammi') {
            headers = ["kode", "nama", "marhalah", "kelas", "no_hp"];
            rowExample = "M-001,Ustadz Ali,Aliyah,2B,628123456789";
            filename = "template_musammi.csv";
        } else if (activeTab === 'wali_kelas') {
            headers = ["nama", "marhalah", "kelas", "no_hp"];
            rowExample = "Ustadz Budi,Jamiah,TQS,628123456789";
            filename = "template_wali_kelas.csv";
        } else {
            headers = ["nama_halaqah", "jenis_halaqah", "nama_musammi", "nama_santri"];
            rowExample = "Halaqah A,Halaqah Utama,Ustadz Abdullah,Ahmad Yusuf";
            filename = "template_halaqah.csv";
        }

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rowExample + "\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportExcel = () => {
        if (activeTab === 'halaqah') {
            const dataToExport: any[] = [];
            filteredData.forEach((h: any) => {
                if (h.santri.length === 0) {
                     dataToExport.push({ 'Nama Halaqah': h.nama, "Musammi'": h.musammi.nama, 'Marhalah': h.marhalah, 'Jenis': h.jenis, 'Nama Santri': '(Kosong)', 'Kelas': '-' });
                } else {
                    h.santri.forEach((s: any) => {
                        dataToExport.push({ 'Nama Halaqah': h.nama, "Musammi'": h.musammi.nama, 'Marhalah': h.marhalah, 'Jenis': h.jenis, 'Nama Santri': s.nama, 'Kelas': s.kelas });
                    });
                }
            });
            exportToExcel(dataToExport, 'Data_Halaqah_Lengkap');
        } else {
            // General Data Export
            exportToExcel(filteredData, `Data_${activeTab}`);
        }
    };

    const handleExportPDF = () => {
        if (activeTab === 'halaqah') {
            const columns = ['Halaqah', "Musammi'", 'Jenis', 'Nama Santri', 'Kelas'];
            const rows: any[] = [];
            filteredData.forEach((h: any) => {
                 if (h.santri.length === 0) rows.push([h.nama, h.musammi.nama, h.jenis, '(Kosong)', '-']);
                 else h.santri.forEach((s: any) => rows.push([h.nama, h.musammi.nama, h.jenis, s.nama, s.kelas]));
            });
            exportToPDF('Data Lengkap Halaqah', columns, rows, 'Data_Halaqah_Lengkap');
        } else if (activeTab === 'wali_santri') {
            const columns = ['Nama Santri', 'Kelas', 'Marhalah', 'Nama Wali', 'No HP Wali'];
            const rows = filteredData.map((s: any) => [s.nama, s.kelas, s.marhalah, s.nama_wali || '-', s.no_hp_wali || '-']);
            exportToPDF('Data Wali Santri', columns, rows, 'Data_Wali_Santri');
        } else {
            const columns = activeTab === 'wali_kelas' 
                ? ['Nama', 'Marhalah', 'Kelas', 'No HP'] 
                : ['Kode', 'Nama', 'Marhalah', 'Kelas', 'No HP'];
            
            const rows = filteredData.map((p: any) => {
                if (activeTab === 'wali_kelas') return [p.nama, p.marhalah, p.kelas, p.no_hp || '-'];
                return [p.kode || '-', p.nama, p.marhalah, p.kelas, (p as any).no_hp || '-'];
            });
            exportToPDF(`Data ${activeTab}`, columns, rows, `Data_${activeTab}`);
        }
    };

    // Helper for normalization
    const normalizeString = (str: string | undefined) => {
        return str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    };

    const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        
        try {
            const orgId = await getOrgId();
            const csvData = await parseCSV(file);
            if (!csvData || csvData.length === 0) throw new Error("File CSV kosong.");

            let successCount = 0;
            let failCount = 0;
            const errors: string[] = [];
            const table = (activeTab === 'santri' || activeTab === 'wali_santri') ? 'santri' : (activeTab === 'musammi' ? 'musammi' : (activeTab === 'wali_kelas' ? 'wali_kelas' : null));

            if (table) {
                for (const row of csvData) {
                    const rowName = row.nama;
                    if (!rowName) continue; // Skip rows without name

                    // Normalize Marhalah
                    const rawMarhalah = row.marhalah?.trim();
                    let matchedMarhalah = Marhalah.Mutawassithah; // Default
                    if (rawMarhalah) {
                        const found = ALL_MARHALAH.find(m => m.toLowerCase() === rawMarhalah.toLowerCase());
                        if (found) matchedMarhalah = found as Marhalah;
                    }

                    const payload: any = {
                        organization_id: orgId,
                        nama: rowName,
                        marhalah: matchedMarhalah,
                        kelas: row.kelas || '1A',
                        no_hp: row.no_hp
                    };
                    if (table !== 'wali_kelas') payload.kode = row.kode;
                    if (table === 'santri') {
                        payload.nama_wali = row.nama_wali;
                        payload.no_hp_wali = row.no_hp_wali;
                    }
                    
                    // --- UPSERT LOGIC (PERBAIKAN) ---
                    let existingId: number | null = null;

                    if (table === 'santri') {
                        // Cek apakah santri dengan nama dan marhalah yang sama sudah ada di state
                        // Kita gunakan normalizeString agar pencarian case-insensitive
                        const match = santri.find(s => 
                            normalizeString(s.nama) === normalizeString(rowName) &&
                            normalizeString(s.marhalah) === normalizeString(matchedMarhalah)
                        );
                        if (match) existingId = match.id;
                    } else if (table === 'musammi') {
                        const match = musammi.find(m => normalizeString(m.nama) === normalizeString(rowName));
                        if (match) existingId = match.id;
                    } else if (table === 'wali_kelas') {
                        const match = waliKelasList.find(w => normalizeString(w.nama) === normalizeString(rowName));
                        if (match) existingId = match.id;
                    }

                    if (existingId) {
                        // UPDATE RECORD YANG SUDAH ADA
                        // Hapus organization_id dari payload update agar aman
                        const { organization_id, ...updatePayload } = payload;
                        
                        const { error: updateError } = await supabase
                            .from(table)
                            .update(updatePayload)
                            .eq('id', existingId);
                        
                        if (updateError) {
                            failCount++;
                            errors.push(`${rowName} (Update): ${updateError.message}`);
                        } else {
                            successCount++;
                        }
                    } else {
                        // INSERT RECORD BARU
                        const { error: insertError } = await supabase
                            .from(table)
                            .insert(payload);
                        
                        if (insertError) {
                            failCount++;
                            errors.push(`${rowName} (Insert): ${insertError.message}`);
                        } else {
                            successCount++;
                        }
                    }
                }
                
                if (activeTab === 'wali_kelas') await fetchWaliKelas();
                else await fetchData();
                
                let message = `Import Selesai.\nBerhasil (Update/Insert): ${successCount}\nGagal: ${failCount}`;
                if (errors.length > 0) message += `\n\nDetail Error (Max 5):\n${errors.slice(0, 5).join('\n')}`;
                alert(message);

            } else if (activeTab === 'halaqah') {
                // --- HALAQAH IMPORT LOGIC (UNCHANGED) ---
                // ... (Existing logic for halaqah import)
                // 1. Group rows by Halaqah Name to handle creation efficiently
                const groupedRows: Record<string, any[]> = {};
                csvData.forEach(row => {
                    const hName = row.nama_halaqah; // key from parseCSV utils (lowercased headers)
                    if(hName) {
                        if(!groupedRows[hName]) groupedRows[hName] = [];
                        groupedRows[hName].push(row);
                    }
                });

                for (const hName of Object.keys(groupedRows)) {
                    const rows = groupedRows[hName];
                    const firstRow = rows[0];

                    // 2. Find Musammi
                    const musammiName = normalizeString(firstRow.nama_musammi);
                    const matchedMusammi = musammi.find(m => normalizeString(m.nama) === musammiName);
                    
                    if (!matchedMusammi) {
                        errors.push(`Halaqah '${hName}': Musammi '${firstRow.nama_musammi}' tidak ditemukan.`);
                        failCount += rows.length; // All santri in this group fail
                        continue;
                    }

                    // 3. Find or Create Halaqah
                    let halaqahId: number;
                    const existingHalaqah = halaqah.find(h => normalizeString(h.nama) === normalizeString(hName));

                    if (existingHalaqah) {
                        halaqahId = existingHalaqah.id;
                    } else {
                        // Create New
                        const jenis = firstRow.jenis_halaqah || 'Halaqah Utama';
                        const waktu = jenis.toLowerCase().includes('pagi') ? ['Dhuha'] : ['Shubuh', 'Ashar', 'Isya'];
                        
                        const { data: newH, error: hError } = await supabase.from('halaqah').insert({
                            organization_id: orgId,
                            nama: hName,
                            musammi_id: matchedMusammi.id,
                            marhalah: matchedMusammi.marhalah, // Inherit from Musammi
                            jenis: jenis,
                            waktu: waktu as any
                        }).select().single();

                        if (hError) {
                            errors.push(`Gagal membuat halaqah '${hName}': ${hError.message}`);
                            failCount += rows.length;
                            continue;
                        }
                        halaqahId = newH.id;
                    }

                    // 4. Add Santri Members
                    for (const row of rows) {
                        const santriName = normalizeString(row.nama_santri);
                        if (!santriName) continue;

                        const matchedSantri = santri.find(s => normalizeString(s.nama) === santriName);
                        if (!matchedSantri) {
                            errors.push(`Santri '${row.nama_santri}' tidak ditemukan.`);
                            failCount++;
                            continue;
                        }

                        // Insert Pivot
                        const { error: pError } = await supabase.from('halaqah_santri').insert({
                            organization_id: orgId,
                            halaqah_id: halaqahId,
                            santri_id: matchedSantri.id
                        });

                        if (pError) {
                            // Ignore unique violation (already member)
                            if (pError.code !== '23505') { 
                                errors.push(`Gagal menambahkan ${row.nama_santri}: ${pError.message}`);
                                failCount++;
                            } else {
                                successCount++; // Count as success if already member
                            }
                        } else {
                            successCount++;
                        }
                    }
                }
                
                await fetchData(); // Refresh data
                
                let message = `Import Halaqah Selesai.\nTotal Anggota/Item: ${successCount}\nGagal: ${failCount}`;
                if (errors.length > 0) {
                    message += `\n\nDetail Error (Max 5):\n${errors.slice(0, 5).join('\n')}`;
                }
                alert(message);
            }

        } catch (e: any) {
            alert(`Import Gagal: ${e.message}`);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsImporting(false);
        }
    };

    // --- Render Helpers ---

    if (loading) return <p>Loading data...</p>;
    if (error) return <p className="text-error">Error: {error}</p>;

    // Detail View for Halaqah
    if (selectedHalaqah && activeTab === 'halaqah') {
        return (
            <div className="space-y-6">
                <button onClick={() => setSelectedHalaqah(null)} className="flex items-center text-slate-600 hover:text-secondary mb-4">
                    <ArrowLeft size={20} className="mr-2" /> Kembali ke Daftar Halaqah
                </button>

                <Card>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center -mt-6 -mx-6 px-6 py-4 border-b border-slate-200 mb-6 bg-slate-50 rounded-t-xl">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{selectedHalaqah.nama}</h2>
                            <div className="flex items-center text-sm text-slate-500 mt-1 space-x-3">
                                <span className="flex items-center"><Users size={14} className="mr-1"/> {selectedHalaqah.musammi.nama}</span>
                                <span>•</span>
                                <span>{selectedHalaqah.marhalah}</span>
                                <span>•</span>
                                <span>{selectedHalaqah.jenis}</span>
                            </div>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <button onClick={() => setHalaqahModalType('add_member')} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors flex items-center justify-center text-sm shadow-sm">
                                <UserPlus size={18} className="mr-2" /> Tambah Anggota
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3">Nama Santri</th>
                                    <th className="px-6 py-3">Kelas</th>
                                    <th className="px-6 py-3">Marhalah</th>
                                    <th className="px-6 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedHalaqah.santri.sort((a,b) => a.nama.localeCompare(b.nama)).map((s) => (
                                    <tr key={s.id} className="bg-white border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{s.nama}</td>
                                        <td className="px-6 py-4">{s.kelas}</td>
                                        <td className="px-6 py-4">{s.marhalah}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleRemoveSantri(s)} className="text-error hover:text-red-700 p-1" title="Hapus dari halaqah">
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {selectedHalaqah.santri.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                                            Belum ada santri di halaqah ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                 {/* Modal for Adding Members */}
                <Modal isOpen={halaqahModalType === 'add_member'} onClose={() => setHalaqahModalType(null)} title={`Tambah Anggota ke ${selectedHalaqah.nama}`}>
                    <div className="space-y-4">
                        <SantriMultiSelect 
                            label={`Pilih Santri (${selectedHalaqah.marhalah})`}
                            santriList={availableSantriForHalaqah}
                            selectedIds={selectedSantriIds}
                            onToggle={(id) => setSelectedSantriIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id])}
                        />
                        <div className="pt-4 flex justify-end space-x-2">
                            <button onClick={() => setHalaqahModalType(null)} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">Batal</button>
                            <button onClick={handleHalaqahSubmit} disabled={isSubmitting} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors disabled:bg-slate-400">
                                {isSubmitting ? "Menyimpan..." : "Tambahkan"}
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        );
    }

    // --- Main List View ---
    return (
        <div className="space-y-6">
            <Card>
                {/* Header & Tabs */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 -mt-6 -mx-6 mb-0 p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Manajemen Data</h2>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                        
                        <button 
                            onClick={() => activeTab === 'halaqah' ? openHalaqahCreateModal() : openPersonModal(null)} 
                            className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors flex items-center justify-center text-sm shadow-sm h-10"
                        >
                           <Plus size={16} className="mr-2" /> 
                           Tambah {activeTab === 'santri' ? 'Santri' : (activeTab === 'musammi' ? 'Musammi' : (activeTab === 'halaqah' ? 'Halaqah' : (activeTab === 'wali_santri' ? 'Wali Santri' : 'Wali Kelas')))}
                        </button>

                        <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block"></div>

                        <button onClick={handleExportExcel} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center text-sm h-10">
                            <Download size={16} className="mr-2" /> Excel
                        </button>
                        <button onClick={handleExportPDF} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center text-sm h-10">
                            <Download size={16} className="mr-2" /> PDF
                        </button>
                        
                        <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center text-sm h-10 disabled:opacity-50">
                            <Upload size={16} className="mr-2" /> {isImporting ? '...' : 'Import'}
                        </button>
                        <button onClick={handleDownloadTemplate} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center text-sm h-10">
                            <Download size={16} className="mr-2" /> Template
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-slate-200 overflow-x-auto">
                    <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('santri')} className={`${activeTab === 'santri' ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-700' + ' hover:border-slate-300'} whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm pt-4`}>Santri</button>
                        <button onClick={() => setActiveTab('musammi')} className={`${activeTab === 'musammi' ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-700' + ' hover:border-slate-300'} whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm pt-4`}>Musammi'</button>
                        <button onClick={() => setActiveTab('wali_kelas')} className={`${activeTab === 'wali_kelas' ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-700' + ' hover:border-slate-300'} whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm pt-4 flex items-center`}>Wali Kelas</button>
                        <button onClick={() => setActiveTab('wali_santri')} className={`${activeTab === 'wali_santri' ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-700' + ' hover:border-slate-300'} whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm pt-4 flex items-center`}>Wali Santri</button>
                        <button onClick={() => setActiveTab('halaqah')} className={`${activeTab === 'halaqah' ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-700' + ' hover:border-slate-300'} whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm pt-4 flex items-center`}>Data Halaqah</button>
                    </nav>
                </div>
                
                {/* Filters */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 my-4 p-4 mx-6 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center font-semibold text-slate-600 flex-shrink-0 text-sm">
                        <Filter size={16} className="mr-2" /> Filter:
                    </div>
                    {activeTab === 'halaqah' && (
                        <div className="flex-grow">
                            <select value={filterJenis} onChange={e => setFilterJenis(e.target.value as HalaqahType | 'all')} className="block w-full text-sm pl-3 pr-10 py-2 border-slate-300 rounded-md focus:ring-secondary focus:border-secondary">
                                <option value="all">Semua Jenis Halaqah</option>
                                {availableHalaqahTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex-grow">
                        <select value={filterMarhalah} onChange={e => { setFilterMarhalah(e.target.value as Marhalah | 'all'); setFilterKelas('all'); }} className="block w-full text-sm pl-3 pr-10 py-2 border-slate-300 rounded-md focus:ring-secondary focus:border-secondary">
                            <option value="all">Semua Marhalah</option>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="flex-grow">
                        <select disabled={filterMarhalah === 'all' && activeTab !== 'halaqah'} value={filterKelas} onChange={e => setFilterKelas(e.target.value as string | 'all')} className="block w-full text-sm pl-3 pr-10 py-2 border-slate-300 rounded-md focus:ring-secondary focus:border-secondary disabled:bg-slate-100">
                            <option value="all">Semua Kelas</option>
                            {filterMarhalah !== 'all' && KELAS_BY_MARHALAH[filterMarhalah].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div className="flex-grow">
                        <input type="text" placeholder="Cari Nama..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="block w-full text-sm border-slate-300 rounded-md focus:ring-secondary focus:border-secondary px-3 py-2" />
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto px-6 pb-6">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                {activeTab === 'halaqah' ? (
                                    <>
                                        <th className="px-6 py-3">Nama Halaqah</th>
                                        <th className="px-6 py-3">Musammi'</th>
                                        <th className="px-6 py-3">Marhalah</th>
                                        <th className="px-6 py-3">Jenis</th>
                                        <th className="px-6 py-3 text-center">Jml Santri</th>
                                    </>
                                ) : activeTab === 'wali_santri' ? (
                                    <>
                                        <th className="px-6 py-3">Nama Santri</th>
                                        <th className="px-6 py-3">Kelas</th>
                                        <th className="px-6 py-3">Marhalah</th>
                                        <th className="px-6 py-3">Nama Wali</th>
                                        <th className="px-6 py-3">No. HP Wali</th>
                                    </>
                                ) : (
                                    <>
                                        {activeTab !== 'wali_kelas' && <th className="px-6 py-3">Kode/ID</th>}
                                        <th className="px-6 py-3">Nama</th>
                                        <th className="px-6 py-3">Marhalah</th>
                                        <th className="px-6 py-3">Kelas</th>
                                        {(activeTab === 'musammi' || activeTab === 'wali_kelas') && <th className="px-6 py-3">No. HP</th>}
                                    </>
                                )}
                                <th className="px-6 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item: any) => (
                                <tr 
                                    key={item.id} 
                                    onClick={() => activeTab === 'halaqah' ? setSelectedHalaqah(item) : openPersonModal(item)}
                                    className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    {activeTab === 'halaqah' ? (
                                        <>
                                            <td className="px-6 py-4 font-medium text-slate-900">{item.nama}</td>
                                            <td className="px-6 py-4 flex items-center"><Users size={16} className="mr-2 text-slate-400"/>{item.musammi.nama}</td>
                                            <td className="px-6 py-4">{item.marhalah}</td>
                                            <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.jenis}</span></td>
                                            <td className="px-6 py-4 text-center"><span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">{item.santri.length}</span></td>
                                        </>
                                    ) : activeTab === 'wali_santri' ? (
                                        <>
                                            <td className="px-6 py-4 font-medium text-slate-900">{item.nama}</td>
                                            <td className="px-6 py-4">{item.kelas}</td>
                                            <td className="px-6 py-4">{item.marhalah}</td>
                                            <td className="px-6 py-4">{item.nama_wali || <span className="text-slate-400 italic">Belum diisi</span>}</td>
                                            <td className="px-6 py-4">
                                                {item.no_hp_wali ? (
                                                    <button onClick={(e) => { e.stopPropagation(); handleWhatsAppClick(item.no_hp_wali); }} className="flex items-center text-green-600 hover:text-green-800 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                                                        <Send size={12} className="mr-1"/> {item.no_hp_wali}
                                                    </button>
                                                ) : <span className="text-slate-400 italic">-</span>}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            {activeTab !== 'wali_kelas' && <td className="px-6 py-4 font-mono text-slate-600">{item.kode || '-'}</td>}
                                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{item.nama}</th>
                                            <td className="px-6 py-4">{item.marhalah}</td>
                                            <td className="px-6 py-4">{item.kelas}</td>
                                            {(activeTab === 'musammi' || activeTab === 'wali_kelas') && <td className="px-6 py-4">{item.no_hp || '-'}</td>}
                                        </>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); activeTab === 'halaqah' ? handleDeleteHalaqahAction(item) : handlePersonDelete(item.id); }} 
                                            className="font-medium text-slate-400 hover:text-error p-1 transition-colors"
                                            title="Hapus"
                                        >
                                            <Trash size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {filteredData.length === 0 && (
                                <tr className="bg-primary border-b border-slate-200">
                                    <td colSpan={6} className="text-center py-6 text-slate-500">Tidak ada data yang sesuai.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal for Santri/Musammi/Wali */}
            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={`${editingPerson ? 'Edit' : 'Tambah'} ${activeTab === 'santri' || activeTab === 'wali_santri' ? 'Santri' : (activeTab === 'musammi' ? 'Musammi' : 'Wali Kelas')}`}>
                <div className="space-y-4">
                    {activeTab !== 'wali_kelas' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Kode Unik / ID</label>
                            <input type="text" value={personFormData.kode} onChange={e => setPersonFormData({...personFormData, kode: e.target.value})} placeholder={activeTab === 'santri' || activeTab === 'wali_santri' ? 'Misal: S-001' : 'Misal: M-001'} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm uppercase font-mono" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nama Lengkap</label>
                        <input type="text" value={personFormData.nama} onChange={e => setPersonFormData({...personFormData, nama: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                    </div>
                    
                    {/* Input Khusus Wali Santri (Muncul jika tab Santri atau Wali Santri) */}
                    {(activeTab === 'santri' || activeTab === 'wali_santri') && (
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-md border border-slate-200">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data Orang Tua / Wali</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Nama Wali</label>
                                <input type="text" value={personFormData.nama_wali} onChange={e => setPersonFormData({...personFormData, nama_wali: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" placeholder="Nama Orang Tua"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">No. HP Wali (WA)</label>
                                <input type="text" value={personFormData.no_hp_wali} onChange={e => setPersonFormData({...personFormData, no_hp_wali: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" placeholder="628..."/>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'musammi' || activeTab === 'wali_kelas') && (
                        <div>
                             <label className="block text-sm font-medium text-slate-700">No. WhatsApp (62...)</label>
                             <input type="text" value={personFormData.no_hp} onChange={e => setPersonFormData({...personFormData, no_hp: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Marhalah</label>
                        <select value={personFormData.marhalah} onChange={e => setPersonFormData({...personFormData, marhalah: e.target.value as Marhalah, kelas: KELAS_BY_MARHALAH[e.target.value as Marhalah][0]})} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 sm:text-sm rounded-md">
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Kelas</label>
                         <select value={personFormData.kelas} onChange={e => setPersonFormData({...personFormData, kelas: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 sm:text-sm rounded-md">
                            {KELAS_BY_MARHALAH[personFormData.marhalah].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end space-x-2">
                        <button onClick={() => setModalOpen(false)} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">Batal</button>
                        <button onClick={handlePersonSubmit} disabled={isSubmitting} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors disabled:bg-slate-400">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
                    </div>
                </div>
            </Modal>

            {/* Modal for Halaqah Creation */}
            <Modal isOpen={halaqahModalType === 'create'} onClose={() => setHalaqahModalType(null)} title="Buat Halaqah Baru">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nama Halaqah</label>
                        <input type="text" value={newHalaqahName} onChange={e => setNewHalaqahName(e.target.value)} placeholder="Contoh: Halaqah A1" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Jenis Halaqah</label>
                            {isCustomJenis ? (
                                <div className="mt-1 flex gap-2">
                                    <input type="text" value={customJenisName} onChange={e => setCustomJenisName(e.target.value)} placeholder="Jenis baru..." className="block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" autoFocus />
                                    <button onClick={() => setIsCustomJenis(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md border border-slate-300"><X size={18} /></button>
                                </div>
                            ) : (
                                <select value={selectedJenis} onChange={e => e.target.value === 'NEW_TYPE' ? (setIsCustomJenis(true), setCustomJenisName('')) : (setSelectedJenis(e.target.value as HalaqahType), setIsCustomJenis(false))} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                                    {availableHalaqahTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    <option value="NEW_TYPE" className="font-semibold text-secondary">+ Jenis Baru...</option>
                                </select>
                            )}
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700">Marhalah</label>
                            <select value={selectedMarhalahNew} onChange={e => setSelectedMarhalahNew(e.target.value as Marhalah)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                                {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Musammi' (Pengampu)</label>
                        <select value={selectedMusammiId} onChange={e => setSelectedMusammiId(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">
                            <option value="">-- Pilih Musammi' --</option>
                            {musammi.map(m => <option key={m.id} value={m.id}>{m.nama} ({m.marhalah})</option>)}
                        </select>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                        <SantriMultiSelect 
                            label="Pilih Anggota Awal (Opsional)"
                            santriList={availableSantriForHalaqah}
                            selectedIds={selectedSantriIds}
                            onToggle={(id) => setSelectedSantriIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id])}
                        />
                    </div>

                    <div className="pt-4 flex justify-end space-x-2">
                        <button onClick={() => setHalaqahModalType(null)} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">Batal</button>
                        <button onClick={handleHalaqahSubmit} disabled={isSubmitting} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors disabled:bg-slate-400">{isSubmitting ? "Menyimpan..." : "Buat Halaqah"}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DataManagement;
