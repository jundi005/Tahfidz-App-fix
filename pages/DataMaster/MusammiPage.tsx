
import React, { useState, useRef, useMemo } from 'react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import ActionDropdown from '../../components/ActionDropdown';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Marhalah, Musammi } from '../../types';
import { KELAS_BY_MARHALAH, ALL_MARHALAH } from '../../constants';
import { Plus, Trash, Upload, Download, Search, Edit, FileSpreadsheet, FileText } from 'lucide-react';
import { parseCSV, exportToExcel, exportToPDF } from '../../lib/utils';
import { supabase } from '../../lib/supabaseClient';

const MusammiPage: React.FC = () => {
    const { musammi, fetchData, loading, error, getOrgId } = useSupabaseData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Musammi | null>(null);
    const [formData, setFormData] = useState({
        nama: '', kode: '', marhalah: Marhalah.Aliyah, // Default to Aliyah as Musammi usually older
        kelas: KELAS_BY_MARHALAH[Marhalah.Aliyah][0], no_hp: ''
    });
    
    // Filters
    const [filterMarhalah, setFilterMarhalah] = useState<Marhalah | 'all'>('all');
    const [filterKelas, setFilterKelas] = useState<string | 'all'>('all');
    const [search, setSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredData = useMemo(() => {
        return musammi.filter(m => {
            if (filterMarhalah !== 'all' && m.marhalah !== filterMarhalah) return false;
            if (filterKelas !== 'all' && m.kelas !== filterKelas) return false;
            if (search && !m.nama.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        }).sort((a, b) => {
            const marhalahOrder = ALL_MARHALAH;
            const mIdxA = marhalahOrder.indexOf(a.marhalah);
            const mIdxB = marhalahOrder.indexOf(b.marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas, undefined, { numeric: true });
            return a.nama.localeCompare(b.nama);
        });
    }, [musammi, filterMarhalah, filterKelas, search]);

    const openModal = (person: Musammi | null) => {
        setEditingPerson(person);
        if (person) {
            setFormData({
                nama: person.nama, kode: person.kode || '', marhalah: person.marhalah,
                kelas: person.kelas, no_hp: (person as any).no_hp || ''
            });
        } else {
            setFormData({
                nama: '', kode: '', marhalah: Marhalah.Aliyah,
                kelas: KELAS_BY_MARHALAH[Marhalah.Aliyah][0], no_hp: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const orgId = await getOrgId();
            const payload: any = {
                organization_id: orgId,
                nama: formData.nama, marhalah: formData.marhalah, kelas: formData.kelas,
                kode: formData.kode || null, no_hp: formData.no_hp || null
            };
            if (editingPerson) {
                delete payload.organization_id;
                await supabase.from('musammi').update(payload).eq('id', editingPerson.id);
            } else {
                await supabase.from('musammi').insert(payload);
            }
            await fetchData();
            setIsModalOpen(false);
        } catch (e: any) { alert(e.message); } 
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Hapus Data Musammi?')) {
            await supabase.from('musammi').delete().eq('id', id);
            await fetchData();
        }
    };

    // Import/Export
    const handleDownloadTemplate = () => {
        const headers = ['nama', 'kode', 'marhalah', 'kelas', 'no_hp'];
        const dummy = ['Abdullah (Musammi)', 'M001', 'Aliyah', '3A', '08123456789'];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), dummy.join(',')].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_musammi.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
            const orgId = await getOrgId();
            const csvData = await parseCSV(file);
            let success = 0; let fail = 0;
            for (const row of csvData) {
                if (!row.nama) continue;
                const payload = {
                    organization_id: orgId,
                    nama: row.nama, marhalah: row.marhalah || 'Aliyah',
                    kelas: row.kelas || '1A', kode: row.kode, no_hp: row.no_hp
                };
                const { error } = await supabase.from('musammi').insert(payload);
                if (error) fail++; else success++;
            }
            await fetchData();
            alert(`Import selesai. Sukses: ${success}, Gagal: ${fail}`);
        } catch (e: any) { alert(`Import gagal: ${e.message}`); }
        finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleExportPDF = () => {
        const columns = ['Kode', 'Nama', 'Marhalah', 'Kelas', 'No HP'];
        const rows = filteredData.map(m => [m.kode||'-', m.nama, m.marhalah, m.kelas, (m as any).no_hp||'-']);
        exportToPDF("Data Musammi", columns, rows, "Data_Musammi");
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-error">{error}</p>;

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 -mt-6 -mx-6 mb-0 p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Data Musammi'</h2>
                        <p className="text-xs text-slate-500 mt-1">Daftar santri senior (Aliyah/Jamiah) yang bertugas menyimak hafalan.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
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
                            <button onClick={() => exportToExcel(musammi, 'Data_Musammi')} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
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
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filter Kelas Asal</label>
                        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} disabled={filterMarhalah === 'all'} className="block w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary disabled:bg-slate-100">
                            <option value="all">Semua Kelas</option>
                            {filterMarhalah !== 'all' && KELAS_BY_MARHALAH[filterMarhalah].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cari Nama</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                            <input type="text" placeholder="Ketik nama musammi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-bold tracking-wider">Nama Musammi</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Marhalah</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Kelas</th>
                                <th className="px-6 py-3 font-bold tracking-wider">No HP</th>
                                <th className="px-6 py-3 font-bold tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredData.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{m.nama}</td>
                                    <td className="px-6 py-4 text-slate-600">{m.marhalah}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{m.kelas}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{(m as any).no_hp || '-'}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openModal(m)} className="text-slate-400 hover:text-secondary p-1 rounded-full hover:bg-slate-100"><Edit size={18}/></button>
                                        <button onClick={() => handleDelete(m.id)} className="text-slate-400 hover:text-error p-1 rounded-full hover:bg-red-50"><Trash size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Tidak ada data ditemukan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPerson ? "Edit Data Musammi" : "Tambah Musammi Baru"}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                        <input type="text" placeholder="Nama Lengkap" className="w-full border-slate-300 rounded-md text-sm" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">No HP</label>
                        <input type="text" placeholder="08..." className="w-full border-slate-300 rounded-md text-sm" value={formData.no_hp} onChange={e => setFormData({...formData, no_hp: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tingkat (Marhalah)</label>
                            <select className="w-full border-slate-300 rounded-md text-sm" value={formData.marhalah} onChange={e => setFormData({...formData, marhalah: e.target.value as Marhalah, kelas: KELAS_BY_MARHALAH[e.target.value as Marhalah][0]})}>
                                {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kelas Asal</label>
                            <select className="w-full border-slate-300 rounded-md text-sm" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})}>
                                {KELAS_BY_MARHALAH[formData.marhalah as Marhalah].map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-slate-50">Batal</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 bg-secondary text-white rounded-md text-sm hover:bg-accent disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MusammiPage;
