
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import ActionDropdown from '../../components/ActionDropdown';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Marhalah, WaliKelas } from '../../types';
import { KELAS_BY_MARHALAH, ALL_MARHALAH } from '../../constants';
import { Plus, Trash, Download, Edit, Upload, FileSpreadsheet, FileText, Search } from 'lucide-react';
import { parseCSV, exportToExcel, exportToPDF } from '../../lib/utils';
import { supabase } from '../../lib/supabaseClient';

const WaliKelasPage: React.FC = () => {
    const { getOrgId } = useSupabaseData();
    const [waliList, setWaliList] = useState<WaliKelas[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Filters
    const [filterMarhalah, setFilterMarhalah] = useState<Marhalah | 'all'>('all');
    const [filterKelas, setFilterKelas] = useState<string | 'all'>('all');
    const [search, setSearch] = useState('');

    // Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWali, setEditingWali] = useState<WaliKelas | null>(null);
    const [formData, setFormData] = useState({
        nama: '', marhalah: Marhalah.Mutawassithah, kelas: KELAS_BY_MARHALAH[Marhalah.Mutawassithah][0], no_hp: ''
    });

    const fetchWali = async () => {
        setLoading(true);
        const { data } = await supabase.from('wali_kelas').select('*');
        if (data) setWaliList(data as unknown as WaliKelas[]);
        setLoading(false);
    };

    useEffect(() => { fetchWali(); }, []);

    // Derived Data
    const filteredData = useMemo(() => {
        return waliList.filter(w => {
            if (filterMarhalah !== 'all' && w.marhalah !== filterMarhalah) return false;
            if (filterKelas !== 'all' && w.kelas !== filterKelas) return false;
            if (search && !w.nama.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        }).sort((a, b) => {
            const marhalahOrder = ALL_MARHALAH;
            const mIdxA = marhalahOrder.indexOf(a.marhalah as Marhalah); // Type assertion if needed based on data
            const mIdxB = marhalahOrder.indexOf(b.marhalah as Marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas, undefined, { numeric: true });
            return a.nama.localeCompare(b.nama);
        });
    }, [waliList, filterMarhalah, filterKelas, search]);

    const openModal = (wali: WaliKelas | null) => {
        setEditingWali(wali);
        if (wali) {
            setFormData({ nama: wali.nama, marhalah: wali.marhalah, kelas: wali.kelas, no_hp: wali.no_hp || '' });
        } else {
            setFormData({ nama: '', marhalah: Marhalah.Mutawassithah, kelas: KELAS_BY_MARHALAH[Marhalah.Mutawassithah][0], no_hp: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        const orgId = await getOrgId();
        const payload = { organization_id: orgId, ...formData, no_hp: formData.no_hp || null };
        
        if (editingWali) {
            // @ts-ignore
            delete payload.organization_id;
            await supabase.from('wali_kelas').update(payload).eq('id', editingWali.id);
        } else {
            await supabase.from('wali_kelas').insert(payload);
        }
        await fetchWali();
        setIsModalOpen(false);
    };

    const handleDelete = async (id: number) => {
        if(confirm("Hapus Wali Kelas?")) {
            await supabase.from('wali_kelas').delete().eq('id', id);
            fetchWali();
        }
    };

    // Import/Export
    const handleDownloadTemplate = () => {
        const headers = ['nama', 'marhalah', 'kelas', 'no_hp'];
        const dummy = ['Ustadz Abu Fulan', 'Mutawassithah', '1A', '08123456789'];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), dummy.join(',')].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_wali_kelas.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if(!file) return;
        try {
            const orgId = await getOrgId();
            const csvData = await parseCSV(file);
            let success = 0; let fail = 0;
            for(const row of csvData) {
                if(!row.nama) continue;
                const payload = { 
                    organization_id: orgId, 
                    nama: row.nama, marhalah: row.marhalah || 'Mutawassithah',
                    kelas: row.kelas || '1A', no_hp: row.no_hp
                };
                const { error } = await supabase.from('wali_kelas').insert(payload);
                if(error) fail++; else success++;
            }
            await fetchWali();
            alert(`Import selesai. Sukses: ${success}, Gagal: ${fail}`);
        } catch(e: any) { alert(`Import gagal: ${e.message}`); }
        finally { if(fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleExportPDF = () => {
        const columns = ['Nama', 'Marhalah', 'Kelas', 'No HP'];
        const rows = waliList.map(w => [w.nama, w.marhalah, w.kelas, w.no_hp || '-']);
        exportToPDF("Data Wali Kelas", columns, rows, "Data_Wali_Kelas");
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 -mt-6 -mx-6 mb-0 p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Data Wali Kelas</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                        
                        <button onClick={() => openModal(null)} className="bg-secondary text-white py-2 px-4 rounded-lg flex items-center text-sm font-semibold hover:bg-accent shadow-sm"><Plus size={16} className="mr-2"/> Tambah</button>
                        
                        <ActionDropdown label="Import CSV" icon={<Upload size={16}/>}>
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                                <FileSpreadsheet size={14} className="mr-2 text-green-600"/> Upload File CSV
                            </button>
                            <button onClick={handleDownloadTemplate} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left border-t border-slate-100">
                                <Download size={14} className="mr-2 text-blue-600"/> Download Template
                            </button>
                        </ActionDropdown>

                        <ActionDropdown label="Export Data" icon={<Download size={16}/>}>
                            <button onClick={() => exportToExcel(waliList, 'Data_Wali_Kelas')} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                                <FileSpreadsheet size={14} className="mr-2 text-green-600"/> Export Excel
                            </button>
                            <button onClick={handleExportPDF} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left border-t border-slate-100">
                                <FileText size={14} className="mr-2 text-red-600"/> Export PDF
                            </button>
                        </ActionDropdown>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border-b border-slate-200">
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
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cari Nama</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                            <input type="text" placeholder="Ketik nama wali kelas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto p-4">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-bold tracking-wider">Nama Wali Kelas</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Marhalah</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Kelas</th>
                                <th className="px-6 py-3 font-bold tracking-wider">No HP</th>
                                <th className="px-6 py-3 font-bold tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredData.map(w => (
                                <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{w.nama}</td>
                                    <td className="px-6 py-4 text-slate-600">{w.marhalah}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{w.kelas}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{w.no_hp || '-'}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openModal(w)} className="text-slate-400 hover:text-secondary p-1 rounded-full hover:bg-slate-100 transition-colors"><Edit size={18}/></button>
                                        <button onClick={() => handleDelete(w.id)} className="text-slate-400 hover:text-error p-1 rounded-full hover:bg-red-50 transition-colors"><Trash size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Tidak ada data ditemukan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWali ? "Edit Wali Kelas" : "Tambah Wali Kelas"}>
                <div className="space-y-4">
                    <input type="text" placeholder="Nama" className="w-full border-slate-300 rounded-md text-sm" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
                    <input type="text" placeholder="No HP" className="w-full border-slate-300 rounded-md text-sm" value={formData.no_hp} onChange={e => setFormData({...formData, no_hp: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <select className="w-full border-slate-300 rounded-md text-sm" value={formData.marhalah} onChange={e => setFormData({...formData, marhalah: e.target.value as Marhalah, kelas: KELAS_BY_MARHALAH[e.target.value as Marhalah][0]})}>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select className="w-full border-slate-300 rounded-md text-sm" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})}>
                            {KELAS_BY_MARHALAH[formData.marhalah as Marhalah].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-slate-50">Batal</button>
                        <button onClick={handleSubmit} className="px-4 py-2 bg-secondary text-white rounded-md text-sm hover:bg-accent">Simpan</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default WaliKelasPage;
