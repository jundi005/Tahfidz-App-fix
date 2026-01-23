
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { HalaqahType, Waktu, Marhalah } from '../types';
import type { Santri, Musammi, Halaqah } from '../types';
import { Upload, Download, Plus, Trash, Users, UserPlus, Search, CheckSquare, Square, X, ArrowLeft } from 'lucide-react';
import { parseCSV, exportToExcel, exportToPDF } from '../lib/utils';
import { ALL_HALAQAH_TYPE, ALL_MARHALAH } from '../constants';

// Internal component for selecting multiple Santri
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

const HalaqahData: React.FC = () => {
    const { 
        halaqah, musammi, santri, 
        addHalaqah, deleteHalaqah, removeSantriFromHalaqah, addSantriToHalaqah,
        loading, error
    } = useSupabaseData();

    // Navigation State: null means list view, object means detail view
    const [selectedHalaqah, setSelectedHalaqah] = useState<Halaqah | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Modal State
    const [modalType, setModalType] = useState<'create' | 'add_member' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    
    // Form State
    const [newHalaqahName, setNewHalaqahName] = useState('');
    const [selectedMusammiId, setSelectedMusammiId] = useState<string>('');
    const [selectedJenis, setSelectedJenis] = useState<HalaqahType>(HalaqahType.Utama);
    const [selectedMarhalahNew, setSelectedMarhalahNew] = useState<Marhalah>(Marhalah.Mutawassithah);
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);

    // Custom Jenis State
    const [isCustomJenis, setIsCustomJenis] = useState(false);
    const [customJenisName, setCustomJenisName] = useState('');

    // Filters for List View
    const [filterJenis, setFilterJenis] = useState<HalaqahType | 'all'>('all');
    const [filterMarhalah, setFilterMarhalah] = useState<Marhalah | 'all'>('all');
    const [filterNama, setFilterNama] = useState('');

    // --- Derived Data & Memos ---

    // Calculate dynamic available types based on data + defaults
    const availableTypes = useMemo(() => {
        const types = new Set<string>(ALL_HALAQAH_TYPE);
        if (halaqah && halaqah.length > 0) {
            halaqah.forEach(h => {
                if (h.jenis) types.add(h.jenis);
            });
        }
        return Array.from(types).sort();
    }, [halaqah]);

    const filteredHalaqahList = useMemo(() => {
        return halaqah.filter(h => {
            if (filterJenis !== 'all' && h.jenis !== filterJenis) return false;
            if (filterMarhalah !== 'all' && h.marhalah !== filterMarhalah) return false;
            if (filterNama && !h.nama.toLowerCase().includes(filterNama.toLowerCase()) && !h.musammi.nama.toLowerCase().includes(filterNama.toLowerCase())) return false;
            return true;
        }).sort((a, b) => a.nama.localeCompare(b.nama));
    }, [halaqah, filterJenis, filterMarhalah, filterNama]);

    // Available Santri for "Create New" or "Add Member"
    const availableSantri = useMemo(() => {
        if (modalType === 'create') {
            return santri.filter(s => s.marhalah === selectedMarhalahNew);
        }
        if (modalType === 'add_member' && selectedHalaqah) {
            // Exclude santri already in this halaqah
            const existingIds = selectedHalaqah.santri.map(s => s.id);
            return santri.filter(s => 
                !existingIds.includes(s.id) && 
                s.marhalah === selectedHalaqah.marhalah
            );
        }
        return [];
    }, [santri, modalType, selectedMarhalahNew, selectedHalaqah]);

    // Update active halaqah object if data changes in background (e.g. after adding member)
    useEffect(() => {
        if (selectedHalaqah) {
            const updated = halaqah.find(h => h.id === selectedHalaqah.id);
            if (updated) {
                setSelectedHalaqah(updated);
            }
        }
    }, [halaqah]);

    // --- Actions ---

    const openCreateModal = () => {
        setModalType('create');
        setNewHalaqahName('');
        setSelectedMusammiId('');
        setSelectedJenis(HalaqahType.Utama);
        setSelectedMarhalahNew(Marhalah.Mutawassithah);
        setSelectedSantriIds([]);
        setIsCustomJenis(false);
        setCustomJenisName('');
    };

    const openAddMemberModal = () => {
        setModalType('add_member');
        setSelectedSantriIds([]);
    };
    
    const closeModal = () => {
        setModalType(null);
        setSelectedSantriIds([]);
        setIsCustomJenis(false);
        setCustomJenisName('');
    };

    const toggleSantriSelection = (id: number) => {
        setSelectedSantriIds(prev => 
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleDeleteHalaqah = async (h: Halaqah) => {
        if (window.confirm(`PERINGATAN: Menghapus halaqah "${h.nama}" akan menghapus semua data absensi terkait halaqah ini.\n\nApakah Anda yakin ingin melanjutkan?`)) {
            try {
                await deleteHalaqah(h.id);
            } catch (e: any) {
                alert(`Gagal menghapus halaqah: ${e.message}`);
            }
        }
    };

    const handleRemoveSantri = async (s: Santri) => {
        if (!selectedHalaqah) return;
        if (window.confirm(`Hapus santri ${s.nama} dari halaqah ini?`)) {
             try {
                await removeSantriFromHalaqah(selectedHalaqah.id, s.id);
            } catch (e: any) {
                alert(`Gagal menghapus: ${e.message}`);
            }
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (modalType === 'create') {
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

            } else if (modalType === 'add_member' && selectedHalaqah) {
                if (selectedSantriIds.length === 0) throw new Error("Pilih minimal satu santri.");
                const santriObjects = santri.filter(s => selectedSantriIds.includes(s.id));
                await Promise.all(santriObjects.map(s => addSantriToHalaqah(selectedHalaqah.id, s)));
            }

            closeModal();
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- CSV Import/Export Helpers ---
    const handleDownloadTemplate = () => {
        const headers = ["nama_halaqah", "jenis_halaqah", "nama_musammi", "nama_santri"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" +
            "Contoh Halaqah A,Halaqah Utama,Ustadz Abdullah,Ahmad Yusuf\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_import_halaqah.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    // Updated: Detailed Export
    const handleExportExcel = () => {
        const dataToExport: any[] = [];

        filteredHalaqahList.forEach(h => {
            if (h.santri.length === 0) {
                 // Entry for empty halaqah
                 dataToExport.push({
                    'Nama Halaqah': h.nama,
                    "Musammi'": h.musammi.nama,
                    'Marhalah': h.marhalah,
                    'Jenis': h.jenis,
                    'Nama Santri': '(Belum ada santri)',
                    'Kelas Santri': '-'
                 });
            } else {
                h.santri.forEach(s => {
                    dataToExport.push({
                        'Nama Halaqah': h.nama,
                        "Musammi'": h.musammi.nama,
                        'Marhalah': h.marhalah,
                        'Jenis': h.jenis,
                        'Nama Santri': s.nama,
                        'Kelas Santri': s.kelas
                    });
                });
            }
        });

        exportToExcel(dataToExport, 'Data_Lengkap_Halaqah');
    };

    // Updated: Detailed Export
    const handleExportPDF = () => {
        const columns = ['Halaqah', "Musammi'", 'Jenis', 'Nama Santri', 'Kelas'];
        const rows: any[] = [];

        filteredHalaqahList.forEach(h => {
             if (h.santri.length === 0) {
                rows.push([
                    h.nama, 
                    h.musammi.nama, 
                    h.jenis, 
                    '(Kosong)', 
                    '-'
                ]);
             } else {
                 h.santri.forEach(s => {
                     rows.push([
                         h.nama,
                         h.musammi.nama,
                         h.jenis,
                         s.nama,
                         s.kelas
                     ]);
                 });
             }
        });

        exportToPDF('Data Lengkap Halaqah', columns, rows, 'Data_Lengkap_Halaqah');
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        try {
            const csvData = await parseCSV(file);
            if (!csvData || csvData.length === 0) throw new Error("File CSV kosong.");
            alert("Fitur import sedang dalam perbaikan. Silakan gunakan input manual untuk saat ini.");
        } catch (e: any) {
            alert(`Import CSV gagal: ${e.message}`);
        } finally {
             if (fileInputRef.current) fileInputRef.current.value = '';
            setIsImporting(false);
        }
    };


    if (loading) return <p>Loading data...</p>;
    if (error) return <p className="text-error">Error: {error}</p>;

    // --- Render Detail View ---
    if (selectedHalaqah) {
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
                            <button onClick={openAddMemberModal} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors flex items-center justify-center text-sm shadow-sm">
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

                 {/* Modal for Adding Members to specific halaqah */}
                <Modal isOpen={modalType === 'add_member'} onClose={closeModal} title={`Tambah Anggota ke ${selectedHalaqah.nama}`}>
                    <div className="space-y-4">
                        <SantriMultiSelect 
                            label={`Pilih Santri (${selectedHalaqah.marhalah})`}
                            santriList={availableSantri}
                            selectedIds={selectedSantriIds}
                            onToggle={toggleSantriSelection}
                        />
                        <div className="pt-4 flex justify-end space-x-2">
                            <button onClick={closeModal} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">Batal</button>
                            <button onClick={handleSubmit} disabled={isSubmitting} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors disabled:bg-slate-400">
                                {isSubmitting ? "Menyimpan..." : "Tambahkan"}
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        );
    }

    // --- Render List View ---
    return (
        <div className="space-y-6">
             <Card>
                 <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 -mt-6 -mx-6 mb-6 p-6 border-b border-slate-200">
                    <div className="mb-2 lg:mb-0">
                        <h2 className="text-lg font-semibold text-slate-800">Daftar Halaqah</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Kelola kelompok halaqah, buat baru, atau atur anggota.
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                         <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" className="hidden" />
                         
                         <button onClick={openCreateModal} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors flex items-center justify-center text-sm shadow-sm h-10">
                            <Plus size={18} className="mr-2" /> Buat Baru
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                     <div>
                        <label htmlFor="filterJenis" className="block text-sm font-medium text-slate-700 mb-1">Jenis Halaqah</label>
                        <select id="filterJenis" value={filterJenis} onChange={e => setFilterJenis(e.target.value as HalaqahType | 'all')} className="block w-full text-sm pl-3 pr-10 py-2 border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm">
                            <option value="all">Semua Jenis</option>
                            {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filterMarhalah" className="block text-sm font-medium text-slate-700 mb-1">Marhalah</label>
                        <select id="filterMarhalah" value={filterMarhalah} onChange={e => setFilterMarhalah(e.target.value as Marhalah | 'all')} className="block w-full text-sm pl-3 pr-10 py-2 border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm">
                            <option value="all">Semua Marhalah</option>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="filterNama" className="block text-sm font-medium text-slate-700 mb-1">Cari Halaqah / Musammi'</label>
                        <input type="text" id="filterNama" value={filterNama} onChange={e => setFilterNama(e.target.value)} placeholder="Ketik nama..." className="block w-full text-sm border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-secondary focus:border-secondary" />
                    </div>
                </div>

                <div className="overflow-hidden bg-white border border-slate-200 rounded-lg shadow-sm">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Nama Halaqah</th>
                                <th className="px-6 py-3">Musammi'</th>
                                <th className="px-6 py-3">Marhalah</th>
                                <th className="px-6 py-3">Jenis</th>
                                <th className="px-6 py-3 text-center">Jml Santri</th>
                                <th className="px-6 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHalaqahList.map(h => (
                                <tr 
                                    key={h.id} 
                                    onClick={() => setSelectedHalaqah(h)}
                                    className="bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900">{h.nama}</td>
                                    <td className="px-6 py-4 flex items-center">
                                        <Users size={16} className="mr-2 text-slate-400"/>
                                        {h.musammi.nama}
                                    </td>
                                    <td className="px-6 py-4">{h.marhalah}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {h.jenis}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                                            {h.santri.length}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteHalaqah(h); }} 
                                            className="text-slate-400 hover:text-error transition-colors"
                                            title="Hapus Halaqah"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredHalaqahList.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            Tidak ada halaqah yang ditemukan.
                        </div>
                    )}
                </div>
            </Card>

            {/* Modal for Creating New Halaqah (Only available in List View) */}
            <Modal isOpen={modalType === 'create'} onClose={closeModal} title="Buat Halaqah Baru">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nama Halaqah</label>
                        <input type="text" value={newHalaqahName} onChange={e => setNewHalaqahName(e.target.value)} placeholder="Contoh: Halaqah A1" className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Jenis Halaqah</label>
                            {isCustomJenis ? (
                                <div className="mt-1 flex gap-2">
                                    <input 
                                        type="text" 
                                        value={customJenisName} 
                                        onChange={e => setCustomJenisName(e.target.value)} 
                                        placeholder="Ketik jenis halaqah baru..." 
                                        className="block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
                                        autoFocus
                                    />
                                    <button 
                                        onClick={() => setIsCustomJenis(false)}
                                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300"
                                        title="Batal / Kembali ke pilihan"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <select 
                                    value={selectedJenis} 
                                    onChange={e => {
                                        if (e.target.value === 'NEW_TYPE') {
                                            setIsCustomJenis(true);
                                            setCustomJenisName('');
                                        } else {
                                            setSelectedJenis(e.target.value as HalaqahType);
                                            setIsCustomJenis(false);
                                        }
                                    }} 
                                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
                                >
                                    {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    <option value="NEW_TYPE" className="font-semibold text-secondary">+ Buat Jenis Baru...</option>
                                </select>
                            )}
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700">Marhalah</label>
                            <select value={selectedMarhalahNew} onChange={e => setSelectedMarhalahNew(e.target.value as Marhalah)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm">
                                {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Musammi' (Pengampu)</label>
                        <select value={selectedMusammiId} onChange={e => setSelectedMusammiId(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm">
                            <option value="">-- Pilih Musammi' --</option>
                            {musammi.map(m => <option key={m.id} value={m.id}>{m.nama} ({m.marhalah})</option>)}
                        </select>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                        <SantriMultiSelect 
                            label="Pilih Anggota Awal (Opsional)"
                            santriList={availableSantri}
                            selectedIds={selectedSantriIds}
                            onToggle={toggleSantriSelection}
                        />
                    </div>

                    <div className="pt-4 flex justify-end space-x-2">
                        <button onClick={closeModal} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">Batal</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors disabled:bg-slate-400">
                            {isSubmitting ? "Menyimpan..." : "Buat Halaqah"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default HalaqahData;
