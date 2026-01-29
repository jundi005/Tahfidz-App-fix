
import React, { useState, useRef, useMemo } from 'react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import ActionDropdown from '../../components/ActionDropdown';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Marhalah, Santri } from '../../types';
import { KELAS_BY_MARHALAH, ALL_MARHALAH } from '../../constants';
import { Plus, Trash, Upload, Download, Search, Edit, FileText, FileSpreadsheet } from 'lucide-react';
import { parseCSV, exportToExcel, exportToPDF } from '../../lib/utils';
import { supabase } from '../../lib/supabaseClient';

const SantriPage: React.FC = () => {
    const { santri, fetchData, loading, error, getOrgId } = useSupabaseData();
    
    // State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Santri | null>(null);
    const [formData, setFormData] = useState({
        nama: '', kode: '', marhalah: Marhalah.Mutawassithah, 
        kelas: KELAS_BY_MARHALAH[Marhalah.Mutawassithah][0],
        nama_wali: '', no_hp_wali: ''
    });

    // Filters
    const [filterMarhalah, setFilterMarhalah] = useState<Marhalah | 'all'>('all');
    const [filterKelas, setFilterKelas] = useState<string | 'all'>('all');
    const [filterSearch, setFilterSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derived Data
    const filteredData = useMemo(() => {
        return santri.filter(item => {
            if (filterMarhalah !== 'all' && item.marhalah !== filterMarhalah) return false;
            if (filterKelas !== 'all' && item.kelas !== filterKelas) return false;
            if (filterSearch && !item.nama.toLowerCase().includes(filterSearch.toLowerCase())) return false;
            return true;
        }).sort((a, b) => {
            // 1. Sort by Marhalah Order
            const marhalahOrder = ALL_MARHALAH;
            const mIdxA = marhalahOrder.indexOf(a.marhalah);
            const mIdxB = marhalahOrder.indexOf(b.marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;

            // 2. Sort by Kelas
            if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas, undefined, { numeric: true });

            // 3. Sort by Name (Abjad)
            return a.nama.localeCompare(b.nama);
        });
    }, [santri, filterMarhalah, filterKelas, filterSearch]);

    // Actions
    const openModal = (person: Santri | null) => {
        setEditingPerson(person);
        if (person) {
            setFormData({
                nama: person.nama,
                kode: person.kode || '',
                marhalah: person.marhalah,
                kelas: person.kelas,
                nama_wali: person.nama_wali || '',
                no_hp_wali: person.no_hp_wali || ''
            });
        } else {
            setFormData({
                nama: '', kode: '', marhalah: Marhalah.Mutawassithah,
                kelas: KELAS_BY_MARHALAH[Marhalah.Mutawassithah][0],
                nama_wali: '', no_hp_wali: ''
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
                nama: formData.nama,
                marhalah: formData.marhalah,
                kelas: formData.kelas,
                kode: formData.kode || null,
                nama_wali: formData.nama_wali || null,
                no_hp_wali: formData.no_hp_wali || null
            };

            if (editingPerson) {
                delete payload.organization_id;
                const { error } = await supabase.from('santri').update(payload).eq('id', editingPerson.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('santri').insert(payload);
                if (error) throw error;
            }
            await fetchData();
            setIsModalOpen(false);
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus data santri ini?')) return;
        try {
            const { error } = await supabase.from('santri').delete().eq('id', id);
            if (error) throw error;
            await fetchData();
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    // Import/Export Logic
    const handleDownloadTemplate = () => {
        const headers = ['nama', 'kode', 'marhalah', 'kelas', 'nama_wali', 'no_hp_wali'];
        const dummy = ['Abdullah', 'S001', 'Mutawassithah', '1A', 'Pak Fulan', '08123456789'];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), dummy.join(',')].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_santri.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const orgId = await getOrgId();
            const csvData = await parseCSV(file);
            let success = 0; let fail = 0;

            for (const row of csvData) {
                if (!row.nama) continue;
                const payload = {
                    organization_id: orgId,
                    nama: row.nama,
                    marhalah: row.marhalah || 'Mutawassithah',
                    kelas: row.kelas || '1A',
                    kode: row.kode,
                    nama_wali: row.nama_wali,
                    no_hp_wali: row.no_hp_wali
                };
                
                const { error } = await supabase.from('santri').insert(payload);
                if (error) fail++; else success++;
            }
            await fetchData();
            alert(`Import selesai. Sukses: ${success}, Gagal: ${fail}`);
        } catch (e: any) {
            alert(`Import gagal: ${e.message}`);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExportPDF = () => {
        // Mengubah kolom Kode menjadi ID
        const columns = ['ID', 'Nama', 'Marhalah', 'Kelas', 'Wali', 'No HP'];
        const rows = filteredData.map(s => [
            s.id, s.nama, s.marhalah, s.kelas, s.nama_wali || '-', s.no_hp_wali || '-'
        ]);
        exportToPDF('Data Santri', columns, rows, 'Data_Santri');
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-error">{error}</p>;

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 -mt-6 -mx-6 mb-0 p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Data Santri</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                        
                        <button onClick={() => openModal(null)} className="bg-secondary text-white py-2 px-4 rounded-lg flex items-center text-sm font-semibold hover:bg-accent shadow-sm">
                            <Plus size={16} className="mr-2"/> Tambah Data
                        </button>

                        <ActionDropdown label="Import CSV" icon={<Upload size={16}/>}>
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                                <FileSpreadsheet size={14} className="mr-2 text-green-600"/> Upload File CSV
                            </button>
                            <button onClick={handleDownloadTemplate} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left border-t border-slate-100">
                                <Download size={14} className="mr-2 text-blue-600"/> Download Template
                            </button>
                        </ActionDropdown>

                        <ActionDropdown label="Export Data" icon={<Download size={16}/>}>
                            <button onClick={() => exportToExcel(filteredData, 'Data_Santri')} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
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
                            <input type="text" placeholder="Ketik nama santri..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="pl-10 w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                            <tr>
                                {/* Mengubah kolom Kode menjadi ID */}
                                <th className="px-6 py-3 font-bold tracking-wider">ID</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Nama Santri</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Marhalah</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Kelas</th>
                                <th className="px-6 py-3 font-bold tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredData.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    {/* Menampilkan ID database alih-alih Kode manual */}
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">#{s.id}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-900">{s.nama}</td>
                                    <td className="px-6 py-4 text-slate-600">{s.marhalah}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {s.kelas}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openModal(s)} className="text-slate-400 hover:text-secondary p-1 rounded-full hover:bg-slate-100 transition-colors"><Edit size={18}/></button>
                                        <button onClick={() => handleDelete(s.id)} className="text-slate-400 hover:text-error p-1 rounded-full hover:bg-red-50 transition-colors"><Trash size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Tidak ada data ditemukan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPerson ? "Edit Santri" : "Tambah Santri"}>
                <div className="space-y-4">
                    {/* Input Kode tetap ada untuk data manual NIS, tapi tidak ditampilkan di tabel utama */}
                    <input type="text" placeholder="Kode / NIS" className="w-full border-slate-300 rounded-md text-sm" value={formData.kode} onChange={e => setFormData({...formData, kode: e.target.value})} />
                    <input type="text" placeholder="Nama Lengkap" className="w-full border-slate-300 rounded-md text-sm" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <select className="w-full border-slate-300 rounded-md text-sm" value={formData.marhalah} onChange={e => setFormData({...formData, marhalah: e.target.value as Marhalah, kelas: KELAS_BY_MARHALAH[e.target.value as Marhalah][0]})}>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select className="w-full border-slate-300 rounded-md text-sm" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})}>
                            {KELAS_BY_MARHALAH[formData.marhalah].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div className="border-t pt-4">
                        <p className="text-xs font-bold text-slate-500 mb-2">Data Wali</p>
                        <input type="text" placeholder="Nama Wali" className="w-full border-slate-300 rounded-md text-sm mb-2" value={formData.nama_wali} onChange={e => setFormData({...formData, nama_wali: e.target.value})} />
                        <input type="text" placeholder="No HP Wali" className="w-full border-slate-300 rounded-md text-sm" value={formData.no_hp_wali} onChange={e => setFormData({...formData, no_hp_wali: e.target.value})} />
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

export default SantriPage;
