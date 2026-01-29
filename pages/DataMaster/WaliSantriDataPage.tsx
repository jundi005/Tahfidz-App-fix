
import React, { useState, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import ActionDropdown from '../../components/ActionDropdown';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Marhalah } from '../../types';
import { ALL_MARHALAH, KELAS_BY_MARHALAH } from '../../constants';
import { Search, Send, Download, Upload, Plus, FileSpreadsheet, FileText, Edit } from 'lucide-react';
import { parseCSV, exportToExcel, exportToPDF } from '../../lib/utils';
import { supabase } from '../../lib/supabaseClient';

const WaliSantriDataPage: React.FC = () => {
    const { santri, fetchData, loading, error, getOrgId } = useSupabaseData();
    const [filterMarhalah, setFilterMarhalah] = useState<Marhalah | 'all'>('all');
    const [filterKelas, setFilterKelas] = useState<string | 'all'>('all');
    const [search, setSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit/Add Manual State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null); // Null = Add New Santri + Wali
    const [formData, setFormData] = useState({ 
        nama_santri: '', 
        marhalah: Marhalah.Mutawassithah,
        kelas: KELAS_BY_MARHALAH[Marhalah.Mutawassithah][0],
        nama_wali: '', 
        no_hp_wali: '' 
    });

    const filteredData = useMemo(() => {
        return santri.filter(s => {
            if (filterMarhalah !== 'all' && s.marhalah !== filterMarhalah) return false;
            if (filterKelas !== 'all' && s.kelas !== filterKelas) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!s.nama.toLowerCase().includes(q) && !s.nama_wali?.toLowerCase().includes(q)) return false;
            }
            return true;
        }).sort((a,b) => {
            const marhalahOrder = ALL_MARHALAH;
            const mIdxA = marhalahOrder.indexOf(a.marhalah);
            const mIdxB = marhalahOrder.indexOf(b.marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas, undefined, { numeric: true });
            return a.nama.localeCompare(b.nama);
        });
    }, [santri, filterMarhalah, filterKelas, search]);

    const handleWA = (phone: string) => {
        if(!phone) return;
        let p = phone.replace(/\D/g, '');
        if(p.startsWith('0')) p = '62' + p.substring(1);
        window.open(`https://wa.me/${p}`, '_blank');
    };

    // --- Import/Export Logic ---
    const handleDownloadTemplate = () => {
        const headers = ['nama_santri', 'nama_wali', 'no_hp_wali'];
        const dummy = ['Abdullah', 'Bapak Fulan', '08123456789'];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), dummy.join(',')].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_update_wali.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if(!file) return;
        try {
            const csvData = await parseCSV(file);
            let success = 0; let fail = 0; let skipped = 0;

            for(const row of csvData) {
                if(!row.nama_santri) continue;
                const targetSantri = santri.find(s => s.nama.toLowerCase() === row.nama_santri.toLowerCase());
                if (targetSantri) {
                    const { error } = await supabase.from('santri').update({
                        nama_wali: row.nama_wali,
                        no_hp_wali: row.no_hp_wali
                    }).eq('id', targetSantri.id);
                    if(error) fail++; else success++;
                } else {
                    skipped++;
                }
            }
            await fetchData();
            alert(`Update selesai. Sukses: ${success}, Gagal: ${fail}, Santri tak ditemukan: ${skipped}`);
        } catch(e: any) { alert(`Import gagal: ${e.message}`); }
        finally { if(fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleExportExcel = () => {
        const data = filteredData.map(s => ({
            'Nama Santri': s.nama, 'Kelas': s.kelas, 'Marhalah': s.marhalah,
            'Nama Wali': s.nama_wali || '-', 'No HP Wali': s.no_hp_wali || '-'
        }));
        exportToExcel(data, 'Data_Wali_Santri');
    };

    const handleExportPDF = () => {
        const columns = ['Nama Santri', 'Kelas', 'Nama Wali', 'No HP Wali'];
        const rows = filteredData.map(s => [s.nama, `${s.kelas} (${s.marhalah})`, s.nama_wali||'-', s.no_hp_wali||'-']);
        exportToPDF("Data Wali Santri", columns, rows, "Data_Wali_Santri");
    };

    // --- Manual Edit/Add Logic ---
    const openModal = (s: any | null) => {
        if (s) {
            // Edit Existing
            setEditingId(s.id);
            setFormData({ 
                nama_santri: s.nama, 
                marhalah: s.marhalah, 
                kelas: s.kelas, 
                nama_wali: s.nama_wali || '', 
                no_hp_wali: s.no_hp_wali || '' 
            });
        } else {
            // Add New Santri + Wali
            setEditingId(null);
            setFormData({ 
                nama_santri: '', 
                marhalah: Marhalah.Mutawassithah, 
                kelas: KELAS_BY_MARHALAH[Marhalah.Mutawassithah][0], 
                nama_wali: '', 
                no_hp_wali: '' 
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveManual = async () => {
        setIsSubmitting(true);
        try {
            const orgId = await getOrgId();
            
            if (editingId) {
                // Update Existing Santri (Only Wali Data & Basic Info)
                const { error } = await supabase.from('santri').update({
                    nama: formData.nama_santri, // Allow correcting name
                    nama_wali: formData.nama_wali,
                    no_hp_wali: formData.no_hp_wali
                }).eq('id', editingId);
                if (error) throw error;
            } else {
                // Create New Santri with Wali Data
                const { error } = await supabase.from('santri').insert({
                    organization_id: orgId,
                    nama: formData.nama_santri,
                    marhalah: formData.marhalah,
                    kelas: formData.kelas,
                    nama_wali: formData.nama_wali,
                    no_hp_wali: formData.no_hp_wali
                });
                if (error) throw error;
            }
            await fetchData();
            setIsModalOpen(false);
        } catch(e: any) { alert(e.message); }
        finally { setIsSubmitting(false); }
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-error">{error}</p>;

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 -mt-6 -mx-6 mb-6 p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Data Wali Santri</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                        
                        <button onClick={() => openModal(null)} className="bg-secondary text-white py-2 px-4 rounded-lg flex items-center text-sm font-semibold hover:bg-accent shadow-sm">
                            <Plus size={16} className="mr-2"/> Tambah Data
                        </button>

                        <ActionDropdown label="Import CSV" icon={<Upload size={16}/>}>
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                                <FileSpreadsheet size={14} className="mr-2 text-green-600"/> Upload Update Wali
                            </button>
                            <button onClick={handleDownloadTemplate} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left border-t border-slate-100">
                                <Download size={14} className="mr-2 text-blue-600"/> Download Template
                            </button>
                        </ActionDropdown>

                        <ActionDropdown label="Export Data" icon={<Download size={16}/>}>
                            <button onClick={handleExportExcel} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                                <FileSpreadsheet size={14} className="mr-2 text-green-600"/> Export Excel
                            </button>
                            <button onClick={handleExportPDF} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left border-t border-slate-100">
                                <FileText size={14} className="mr-2 text-red-600"/> Export PDF
                            </button>
                        </ActionDropdown>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 border-b border-slate-200">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filter Marhalah</label>
                        <select value={filterMarhalah} onChange={e => {setFilterMarhalah(e.target.value as any); setFilterKelas('all')}} className="block w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary">
                            <option value="all">Semua Marhalah</option>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filter Kelas</label>
                        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} disabled={filterMarhalah === 'all'} className="block w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary disabled:bg-slate-100">
                            <option value="all">Semua Kelas</option>
                            {filterMarhalah !== 'all' && KELAS_BY_MARHALAH[filterMarhalah].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cari Nama / Wali</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                            <input type="text" placeholder="Cari santri atau wali..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-bold tracking-wider">Nama Santri</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Kelas / Marhalah</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Nama Wali</th>
                                <th className="px-6 py-3 font-bold tracking-wider">No HP Wali</th>
                                <th className="px-6 py-3 font-bold tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredData.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{s.nama}</td>
                                    <td className="px-6 py-4">{s.kelas} <span className="text-slate-400 text-xs">({s.marhalah})</span></td>
                                    <td className="px-6 py-4">{s.nama_wali || <span className="italic text-slate-300">Belum ada data</span>}</td>
                                    <td className="px-6 py-4">
                                        {s.no_hp_wali ? (
                                            <button onClick={() => handleWA(s.no_hp_wali!)} className="flex items-center text-green-600 hover:underline bg-green-50 px-2 py-1 rounded">
                                                <Send size={12} className="mr-1"/> {s.no_hp_wali}
                                            </button>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openModal(s)} className="text-slate-400 hover:text-secondary p-1 hover:bg-slate-100 rounded-full transition-colors" title="Edit Data Wali"><Edit size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Tidak ada data ditemukan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? `Edit Wali: ${formData.nama_santri}` : "Tambah Data Santri & Wali"}>
                <div className="space-y-4">
                    {/* If adding new, show Name/Marhalah/Kelas fields. If editing, specific logic. */}
                    
                    {!editingId && (
                        <div className="bg-green-50 p-3 rounded border border-green-100 mb-4 text-xs text-green-700">
                            Menambahkan data wali baru berarti menambahkan data Santri baru.
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nama Santri</label>
                        <input type="text" className="w-full border-slate-300 rounded-md text-sm mt-1" value={formData.nama_santri} onChange={e => setFormData({...formData, nama_santri: e.target.value})} disabled={!!editingId} /> {/* Disable name edit here if strictly updating wali, but user requested edit capability too usually */}
                    </div>

                    {!editingId && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Marhalah</label>
                                <select className="w-full border-slate-300 rounded-md text-sm mt-1" value={formData.marhalah} onChange={e => setFormData({...formData, marhalah: e.target.value as Marhalah, kelas: KELAS_BY_MARHALAH[e.target.value as Marhalah][0]})}>
                                    {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Kelas</label>
                                <select className="w-full border-slate-300 rounded-md text-sm mt-1" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})}>
                                    {KELAS_BY_MARHALAH[formData.marhalah].map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="border-t pt-4 mt-2">
                        <label className="block text-sm font-medium text-slate-700">Nama Wali</label>
                        <input type="text" className="w-full border-slate-300 rounded-md text-sm mt-1" value={formData.nama_wali} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Contoh: Bapak Fulan" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">No HP Wali (WhatsApp)</label>
                        <input type="text" className="w-full border-slate-300 rounded-md text-sm mt-1" value={formData.no_hp_wali} onChange={e => setFormData({...formData, no_hp_wali: e.target.value})} placeholder="0812..." />
                    </div>
                    
                    <div className="flex justify-end pt-4 gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-slate-50">Batal</button>
                        <button onClick={handleSaveManual} disabled={isSubmitting} className="px-4 py-2 bg-secondary text-white rounded-md text-sm hover:bg-accent disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default WaliSantriDataPage;
