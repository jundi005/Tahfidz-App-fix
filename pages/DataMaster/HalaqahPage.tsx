
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import ActionDropdown from '../../components/ActionDropdown';
import SantriMultiSelect from '../../components/SantriMultiSelect';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { HalaqahType, Marhalah, Waktu, Halaqah } from '../../types';
import { ALL_HALAQAH_TYPE, ALL_MARHALAH } from '../../constants';
import { Plus, Trash, Users, Edit, ArrowLeft, X, Search, Upload, Download, FileSpreadsheet, FileText, Save, CheckSquare, Square } from 'lucide-react';
import { parseCSV, exportToExcel, exportToPDF } from '../../lib/utils';
import { supabase } from '../../lib/supabaseClient';

const HalaqahPage: React.FC = () => {
    const { halaqah, musammi, santri, addHalaqah, deleteHalaqah, updateHalaqah, removeSantriFromHalaqah, fetchData, loading, error, getOrgId } = useSupabaseData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // State
    const [selectedHalaqah, setSelectedHalaqah] = useState<Halaqah | null>(null);
    const [modalType, setModalType] = useState<'create' | 'edit' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Bulk Selection State
    const [selectedHalaqahIds, setSelectedHalaqahIds] = useState<number[]>([]);

    // Form
    const [newHalaqahName, setNewHalaqahName] = useState('');
    const [noUrut, setNoUrut] = useState<number>(999);
    const [selectedMusammiId, setSelectedMusammiId] = useState('');
    const [selectedJenis, setSelectedJenis] = useState<HalaqahType>(HalaqahType.Utama);
    const [selectedMarhalah, setSelectedMarhalah] = useState<Marhalah>(Marhalah.Mutawassithah);
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
    
    // Custom Type
    const [isCustomJenis, setIsCustomJenis] = useState(false);
    const [customJenisName, setCustomJenisName] = useState('');

    // Filters
    const [filterJenis, setFilterJenis] = useState<HalaqahType | 'all'>('all');
    const [filterMarhalah, setFilterMarhalah] = useState<Marhalah | 'all'>('all');
    const [filterSearch, setFilterSearch] = useState('');

    const availableTypes = useMemo(() => {
        const types = new Set<string>(ALL_HALAQAH_TYPE);
        halaqah.forEach(h => { if(h.jenis) types.add(h.jenis); });
        return Array.from(types).sort();
    }, [halaqah]);

    const filteredHalaqah = useMemo(() => {
        return halaqah.filter(h => {
            if (filterJenis !== 'all' && h.jenis !== filterJenis) return false;
            if (filterMarhalah !== 'all' && h.marhalah !== filterMarhalah) return false;
            if (filterSearch && !h.nama.toLowerCase().includes(filterSearch.toLowerCase()) && !h.musammi.nama.toLowerCase().includes(filterSearch.toLowerCase())) return false;
            return true;
        }).sort((a,b) => {
            // Sort: No Urut (Primary) -> Jenis -> Marhalah -> Nama
            if ((a.no_urut || 999) !== (b.no_urut || 999)) return (a.no_urut || 999) - (b.no_urut || 999);
            if (a.jenis !== b.jenis) return a.jenis.localeCompare(b.jenis);
            const marhalahOrder = ALL_MARHALAH;
            const mIdxA = marhalahOrder.indexOf(a.marhalah);
            const mIdxB = marhalahOrder.indexOf(b.marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            return a.nama.localeCompare(b.nama);
        });
    }, [halaqah, filterJenis, filterMarhalah, filterSearch]);

    // Reset selection when filters change
    useEffect(() => {
        setSelectedHalaqahIds([]);
    }, [filterJenis, filterMarhalah, filterSearch]);

    // Santri list for selection
    const availableSantri = useMemo(() => {
        const targetMarhalah = (modalType === 'edit' && selectedHalaqah) ? selectedMarhalah : selectedMarhalah;
        return santri.filter(s => s.marhalah === targetMarhalah);
    }, [santri, modalType, selectedMarhalah, selectedHalaqah]);

    // --- BULK ACTION HANDLERS ---
    
    const toggleSelectAll = () => {
        if (selectedHalaqahIds.length === filteredHalaqah.length && filteredHalaqah.length > 0) {
            setSelectedHalaqahIds([]);
        } else {
            setSelectedHalaqahIds(filteredHalaqah.map(h => h.id));
        }
    };

    const toggleSelectRow = (id: number) => {
        setSelectedHalaqahIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedHalaqahIds.length === 0) return;
        if (confirm(`Apakah Anda yakin ingin menghapus ${selectedHalaqahIds.length} halaqah yang dipilih? Data absensi terkait akan hilang.`)) {
            setIsSubmitting(true);
            try {
                // Delete one by one to use the hook logic (or create a bulk delete hook)
                // Using loop for simplicity with current hooks
                for (const id of selectedHalaqahIds) {
                    await deleteHalaqah(id);
                }
                setSelectedHalaqahIds([]);
                alert("Data berhasil dihapus.");
            } catch (e: any) {
                alert("Gagal menghapus beberapa data: " + e.message);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    // --- EXISTING HANDLERS ---

    const openEditModal = () => {
        if (!selectedHalaqah) return;
        setNewHalaqahName(selectedHalaqah.nama);
        setNoUrut(selectedHalaqah.no_urut || 999);
        setSelectedMusammiId(String(selectedHalaqah.musammi.id));
        setSelectedJenis(selectedHalaqah.jenis);
        setSelectedMarhalah(selectedHalaqah.marhalah);
        setSelectedSantriIds(selectedHalaqah.santri.map(s => s.id));
        setModalType('edit');
    };

    const handleCreate = async () => {
        setIsSubmitting(true);
        try {
            if (!newHalaqahName) throw new Error("Nama wajib diisi");
            if (!selectedMusammiId) throw new Error("Pilih Musammi");
            
            const finalJenis = isCustomJenis ? customJenisName : selectedJenis;
            const waktu = finalJenis.toLowerCase().includes('pagi') ? [Waktu.Dhuha] : [Waktu.Shubuh, Waktu.Ashar, Waktu.Isya];
            const santriObj = santri.filter(s => selectedSantriIds.includes(s.id));

            await addHalaqah({
                nama: newHalaqahName,
                musammi_id: parseInt(selectedMusammiId),
                santri: santriObj,
                marhalah: selectedMarhalah,
                jenis: finalJenis,
                waktu,
                no_urut: noUrut
            });
            setModalType(null);
        } catch (e: any) { alert(e.message); }
        finally { setIsSubmitting(false); }
    };

    const handleUpdateHalaqahSubmit = async () => {
        if (!selectedHalaqah) return;
        setIsSubmitting(true);
        try {
            const orgId = await getOrgId();
            const finalJenis = isCustomJenis ? customJenisName : selectedJenis;

            await updateHalaqah(selectedHalaqah.id, {
                nama: newHalaqahName,
                musammi_id: parseInt(selectedMusammiId),
                marhalah: selectedMarhalah,
                jenis: finalJenis,
                no_urut: noUrut
            });

            const currentIds = selectedHalaqah.santri.map(s => s.id);
            const newIds = selectedSantriIds;
            const toAdd = newIds.filter(id => !currentIds.includes(id));
            const toRemove = currentIds.filter(id => !newIds.includes(id));

            if (toAdd.length > 0) {
                const toInsert = toAdd.map(santriId => ({
                    organization_id: orgId,
                    halaqah_id: selectedHalaqah.id,
                    santri_id: santriId
                }));
                const { error: addError } = await supabase.from('halaqah_santri').insert(toInsert);
                if (addError) throw addError;
            }

            if (toRemove.length > 0) {
                const { error: removeError } = await supabase.from('halaqah_santri')
                    .delete()
                    .eq('halaqah_id', selectedHalaqah.id)
                    .in('santri_id', toRemove);
                if (removeError) throw removeError;
            }

            await fetchData();
            setModalType(null);
        } catch (e: any) { alert(e.message); }
        finally { setIsSubmitting(false); }
    };

    React.useEffect(() => {
        if(selectedHalaqah) {
            const found = halaqah.find(h => h.id === selectedHalaqah.id);
            if(found) setSelectedHalaqah(found);
        }
    }, [halaqah]);

    const handleDelete = async (id: number) => {
        if (confirm("Hapus Halaqah? Semua data absensi terkait akan hilang.")) {
            await deleteHalaqah(id);
            if(selectedHalaqah?.id === id) setSelectedHalaqah(null);
        }
    };

    // Import/Export Logic
    const handleDownloadTemplate = () => {
        // Added 'musammi_id' and 'santri_id' to headers
        const headers = ['id_halaqah', 'no_urut', 'nama_halaqah', 'jenis_halaqah', 'marhalah_halaqah', 'musammi_id', 'nama_musammi', 'santri_id', 'nama_santri', 'marhalah_santri', 'kelas_santri'];
        const dummy = ['', '1', 'Halaqah 1', 'Halaqah Utama', 'Mutawassithah', '101', 'Ustadz Fulan', '205', 'Santri A', 'Mutawassithah', '1A'];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), dummy.join(',')].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_halaqah_lengkap.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
            const orgId = await getOrgId();
            const csvData = await parseCSV(file);
            let createdHalaqahCount = 0; 
            let updatedHalaqahCount = 0;
            let addedSantriCount = 0;
            let errors: string[] = [];

            // 1. Group Data
            // Key determination: Use ID if provided, otherwise Name
            const groupedData: Record<string, {
                id?: number, // Store Halaqah ID if present
                no_urut: number,
                jenis: string,
                marhalah: string,
                musammi_id?: number,
                nama_musammi: string,
                nama_halaqah: string,
                santriList: { id?: number, nama: string, marhalah?: string, kelas?: string }[]
            }> = {};

            for (const row of csvData) {
                const namaHalaqah = row.nama_halaqah;
                const importId = row.id_halaqah || row.id ? parseInt(row.id_halaqah || row.id) : undefined;
                
                // Allow fallback keys if user uses old template or variations
                const jenis = row.jenis_halaqah || row.jenis || 'Halaqah Utama';
                const marhalah = row.marhalah_halaqah || row.marhalah || 'Mutawassithah';
                
                // Person IDs
                const musammiId = row.musammi_id ? parseInt(row.musammi_id) : undefined;
                const santriId = row.santri_id ? parseInt(row.santri_id) : undefined;

                const musammiName = row.nama_musammi;
                const santriName = row.nama_santri;
                const noUrut = row.no_urut ? parseInt(row.no_urut) : 999;
                
                // Santri details (Optional but useful for matching)
                const santriMarhalah = row.marhalah_santri;
                const santriKelas = row.kelas_santri;

                if (!namaHalaqah) continue;

                // Create a unique key for grouping. Use ID prefix if ID exists to avoid name collisions.
                const groupKey = importId ? `ID:${importId}` : `NAME:${namaHalaqah}`;

                if (!groupedData[groupKey]) {
                    groupedData[groupKey] = {
                        id: importId,
                        nama_halaqah: namaHalaqah,
                        no_urut: noUrut,
                        jenis: jenis,
                        marhalah: marhalah,
                        musammi_id: musammiId,
                        nama_musammi: musammiName || 'Unknown',
                        santriList: []
                    };
                }
                
                if (santriName) {
                    groupedData[groupKey].santriList.push({
                        id: santriId,
                        nama: santriName,
                        marhalah: santriMarhalah,
                        kelas: santriKelas
                    });
                }
            }

            // 2. Process Groups
            for (const group of Object.values(groupedData)) {
                // A. Find Musammi (Priority: ID -> Name)
                let targetMusammi;
                if (group.musammi_id) {
                    targetMusammi = musammi.find(m => m.id === group.musammi_id);
                }
                
                if (!targetMusammi && group.nama_musammi) {
                    targetMusammi = musammi.find(m => m.nama.toLowerCase() === group.nama_musammi.toLowerCase());
                }

                if (!targetMusammi) {
                    errors.push(`Musammi tidak ditemukan (ID: ${group.musammi_id || '-'}, Nama: ${group.nama_musammi}) di Halaqah: ${group.nama_halaqah}`);
                    continue;
                }

                const waktu = group.jenis.toLowerCase().includes('pagi') ? [Waktu.Dhuha] : [Waktu.Shubuh, Waktu.Ashar, Waktu.Isya];
                let targetHalaqahId: number | null = null;

                // B. Find or Create Halaqah based on ID first, then Name
                if (group.id) {
                    // Try to find by ID
                    const existingById = halaqah.find(h => h.id === group.id);
                    if (existingById) {
                        targetHalaqahId = existingById.id;
                        // Update
                        const { error: upError } = await supabase.from('halaqah').update({
                            nama: group.nama_halaqah, // Update name if changed
                            musammi_id: targetMusammi.id,
                            marhalah: group.marhalah as Marhalah,
                            jenis: group.jenis,
                            waktu: waktu,
                            no_urut: group.no_urut
                        }).eq('id', targetHalaqahId);
                        
                        if (!upError) updatedHalaqahCount++;
                    } else {
                        // Fallback: If ID not found, try Name or Create New
                        const existingByName = halaqah.find(h => h.nama.toLowerCase() === group.nama_halaqah.toLowerCase());
                        if (existingByName) {
                             targetHalaqahId = existingByName.id;
                             await supabase.from('halaqah').update({
                                musammi_id: targetMusammi.id,
                                marhalah: group.marhalah as Marhalah,
                                jenis: group.jenis,
                                waktu: waktu,
                                no_urut: group.no_urut
                            }).eq('id', targetHalaqahId);
                            updatedHalaqahCount++;
                        } else {
                            // Create New
                            const { data: newHalaqah, error: createError } = await supabase.from('halaqah').insert({
                                organization_id: orgId,
                                nama: group.nama_halaqah,
                                musammi_id: targetMusammi.id,
                                marhalah: group.marhalah as Marhalah,
                                jenis: group.jenis,
                                waktu: waktu,
                                no_urut: group.no_urut
                            }).select().single();

                            if (createError || !newHalaqah) {
                                errors.push(`Gagal buat halaqah: ${group.nama_halaqah}`);
                                continue;
                            }
                            targetHalaqahId = newHalaqah.id;
                            createdHalaqahCount++;
                        }
                    }
                } else {
                    // No ID provided, legacy match by Name
                    const existingHalaqah = halaqah.find(h => h.nama.toLowerCase() === group.nama_halaqah.toLowerCase());
                    
                    if (existingHalaqah) {
                        targetHalaqahId = existingHalaqah.id;
                        const { error: upError } = await supabase.from('halaqah').update({
                            musammi_id: targetMusammi.id,
                            marhalah: group.marhalah as Marhalah,
                            jenis: group.jenis,
                            waktu: waktu,
                            no_urut: group.no_urut
                        }).eq('id', targetHalaqahId);
                        
                        if (!upError) updatedHalaqahCount++;
                    } else {
                        const { data: newHalaqah, error: createError } = await supabase.from('halaqah').insert({
                            organization_id: orgId,
                            nama: group.nama_halaqah,
                            musammi_id: targetMusammi.id,
                            marhalah: group.marhalah as Marhalah,
                            jenis: group.jenis,
                            waktu: waktu,
                            no_urut: group.no_urut
                        }).select().single();

                        if (createError || !newHalaqah) {
                            errors.push(`Gagal buat halaqah: ${group.nama_halaqah}`);
                            continue;
                        }
                        targetHalaqahId = newHalaqah.id;
                        createdHalaqahCount++;
                    }
                }

                // C. Add Santri to Halaqah
                if (targetHalaqahId && group.santriList.length > 0) {
                    const santriToInsert = [];
                    for (const sData of group.santriList) {
                        let targetSantri;

                        // 1. Try Find by ID
                        if (sData.id) {
                            targetSantri = santri.find(s => s.id === sData.id);
                        }

                        // 2. Fallback: Find by Name (+ Class/Marhalah if available)
                        if (!targetSantri) {
                            targetSantri = santri.find(s => {
                                const nameMatch = s.nama.toLowerCase() === sData.nama.toLowerCase();
                                const classMatch = sData.kelas ? s.kelas.toLowerCase() === sData.kelas.toLowerCase() : true;
                                const marhalahMatch = sData.marhalah ? s.marhalah.toLowerCase() === sData.marhalah.toLowerCase() : true;
                                return nameMatch && classMatch && marhalahMatch;
                            });
                        }

                        // 3. Fallback: Name only
                        if (!targetSantri) {
                            targetSantri = santri.find(s => s.nama.toLowerCase() === sData.nama.toLowerCase());
                        }

                        if (targetSantri) {
                            santriToInsert.push({
                                organization_id: orgId,
                                halaqah_id: targetHalaqahId,
                                santri_id: targetSantri.id
                            });
                        }
                    }

                    if (santriToInsert.length > 0) {
                        const { error: linkError } = await supabase.from('halaqah_santri').upsert(santriToInsert, { onConflict: 'halaqah_id, santri_id' });
                        if (!linkError) addedSantriCount += santriToInsert.length;
                    }
                }
            }

            await fetchData();
            let msg = `Import Selesai.\n- Halaqah Baru: ${createdHalaqahCount}\n- Halaqah Updated: ${updatedHalaqahCount}\n- Santri Ditambahkan: ${addedSantriCount}`;
            if (errors.length > 0) msg += `\n\nError (${errors.length}):\n` + errors.slice(0, 5).join('\n') + (errors.length > 5 ? '...' : '');
            alert(msg);

        } catch (e: any) { alert(`Import gagal: ${e.message}`); }
        finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    // --- DETAILED EXPORT LOGIC ---
    const getDetailedExportData = () => {
        const data: any[] = [];
        filteredHalaqah.forEach((h, index) => {
            const noHalaqah = h.no_urut || (index + 1);
            // Include ID for re-import capability
            data.push({
                'ID': h.id,
                'No Urut': noHalaqah,
                'Nama Halaqah': h.nama,
                'Jenis': h.jenis,
                'Marhalah': h.marhalah,
                'Peran': 'Musammi',
                'Person ID': h.musammi.id, // Explicit ID for re-import
                'Nama Anggota': h.musammi.nama,
                'Kelas': '-',
                'Kode': h.musammi.kode || '-'
            });
            h.santri.sort((a,b) => a.nama.localeCompare(b.nama)).forEach(s => {
                data.push({
                    'ID': h.id,
                    'No Urut': noHalaqah,
                    'Nama Halaqah': h.nama,
                    'Jenis': h.jenis,
                    'Marhalah': h.marhalah,
                    'Peran': 'Santri',
                    'Person ID': s.id, // Explicit ID for re-import
                    'Nama Anggota': s.nama,
                    'Kelas': s.kelas,
                    'Kode': s.kode || '-'
                });
            });
        });
        return data;
    };

    const handleExportExcel = () => exportToExcel(getDetailedExportData(), 'Data_Halaqah_Lengkap');
    
    const handleExportPDF = () => {
        const data = getDetailedExportData();
        const columns = ['ID', 'Nama Halaqah', 'Peran', 'Person ID', 'Nama Anggota', 'Kelas'];
        const rows = data.map(d => [d['ID'], d['Nama Halaqah'], d['Peran'], d['Person ID'], d['Nama Anggota'], d['Kelas']]);
        exportToPDF("Data Halaqah Lengkap", columns, rows, "Data_Halaqah_Lengkap");
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-error">{error}</p>;

    // --- DETAIL VIEW ---
    if (selectedHalaqah) {
        return (
            <div className="space-y-6">
                <button onClick={() => setSelectedHalaqah(null)} className="flex items-center text-slate-600 hover:text-secondary mb-4">
                    <ArrowLeft size={20} className="mr-2" /> Kembali ke Daftar
                </button>
                <Card>
                    <div className="flex flex-col md:flex-row justify-between items-start -mt-6 -mx-6 px-6 py-4 border-b border-slate-200 mb-6 bg-slate-50 rounded-t-xl">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{selectedHalaqah.nama}</h2>
                            <div className="flex items-center text-sm text-slate-500 mt-1 space-x-3">
                                <span className="flex items-center font-mono text-xs bg-slate-200 px-1.5 rounded">#{selectedHalaqah.id}</span>
                                <span className="flex items-center"><Users size={14} className="mr-1"/> {selectedHalaqah.musammi.nama}</span>
                                <span>•</span><span>{selectedHalaqah.marhalah}</span>
                                <span>•</span><span>{selectedHalaqah.jenis}</span>
                                <span>•</span><span>No. {selectedHalaqah.no_urut || '-'}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4 md:mt-0">
                            <button onClick={() => handleDelete(selectedHalaqah.id)} className="bg-white border border-red-200 text-red-600 py-2 px-4 rounded-lg flex items-center text-sm font-semibold hover:bg-red-50 shadow-sm">
                                <Trash size={16} className="mr-2" /> Hapus
                            </button>
                            <button onClick={openEditModal} className="bg-secondary text-white py-2 px-4 rounded-lg flex items-center text-sm font-semibold hover:bg-accent shadow-sm">
                                <Edit size={16} className="mr-2" /> Edit Data
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 font-bold tracking-wider">ID</th>
                                    <th className="px-6 py-3 font-bold tracking-wider">Nama Santri</th>
                                    <th className="px-6 py-3 font-bold tracking-wider">Kelas</th>
                                    <th className="px-6 py-3 font-bold tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedHalaqah.santri.sort((a,b) => a.nama.localeCompare(b.nama)).map(s => (
                                    <tr key={s.id} className="bg-white border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">#{s.id}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{s.nama}</td>
                                        <td className="px-6 py-4">{s.kelas}</td>
                                        <td className="px-6 py-4"><button onClick={async () => { if(confirm("Hapus anggota dari halaqah ini?")) await removeSantriFromHalaqah(selectedHalaqah.id, s.id) }} className="text-error hover:bg-red-50 p-1 rounded"><Trash size={16}/></button></td>
                                    </tr>
                                ))}
                                {selectedHalaqah.santri.length === 0 && <tr><td colSpan={4} className="text-center py-8">Belum ada anggota.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
                
                {/* EDIT MODAL */}
                <Modal isOpen={modalType === 'edit'} onClose={() => setModalType(null)} title="Edit Data Halaqah">
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Halaqah</label>
                                <input type="text" placeholder="Nama Halaqah" className="w-full border-slate-300 rounded-md text-sm" value={newHalaqahName} onChange={e => setNewHalaqahName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">No. Urut</label>
                                <input type="number" placeholder="999" className="w-full border-slate-300 rounded-md text-sm" value={noUrut} onChange={e => setNoUrut(parseInt(e.target.value))} />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Marhalah</label>
                                <select className="w-full border-slate-300 rounded-md text-sm" value={selectedMarhalah} onChange={e => setSelectedMarhalah(e.target.value as any)}>
                                    {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Halaqah</label>
                                {isCustomJenis ? (
                                    <div className="flex gap-2"><input type="text" placeholder="Jenis Baru..." className="w-full border-slate-300 rounded-md text-sm" value={customJenisName} onChange={e => setCustomJenisName(e.target.value)} autoFocus /><button onClick={() => setIsCustomJenis(false)} className="p-2 border rounded-md"><X size={16}/></button></div>
                                ) : (
                                    <select className="w-full border-slate-300 rounded-md text-sm" value={selectedJenis} onChange={e => e.target.value === 'NEW' ? setIsCustomJenis(true) : setSelectedJenis(e.target.value as any)}>
                                        {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        <option value="NEW">+ Jenis Baru</option>
                                    </select>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Musammi (Pengajar)</label>
                            <select className="w-full border-slate-300 rounded-md text-sm" value={selectedMusammiId} onChange={e => setSelectedMusammiId(e.target.value)}>
                                {musammi.map(m => <option key={m.id} value={m.id}>{m.nama} ({m.marhalah})</option>)}
                            </select>
                        </div>

                        <div className="pt-2 border-t mt-4">
                            <p className="text-sm font-bold text-slate-700 mb-2">Manajemen Anggota</p>
                            <div className="max-h-60 overflow-y-auto border rounded-md p-2 bg-slate-50">
                                <SantriMultiSelect 
                                    santriList={availableSantri} 
                                    selectedIds={selectedSantriIds} 
                                    onToggle={id => setSelectedSantriIds(p => p.includes(id) ? p.filter(x => x!==id) : [...p, id])} 
                                    label={`Pilih Santri (${selectedMarhalah})`}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">*Centang untuk menambahkan, hapus centang untuk mengeluarkan.</p>
                        </div>

                        <div className="flex justify-end pt-4 gap-2">
                            <button onClick={() => setModalType(null)} className="px-4 py-2 border rounded-md">Batal</button>
                            <button onClick={handleUpdateHalaqahSubmit} disabled={isSubmitting} className="px-4 py-2 bg-secondary text-white rounded-md flex items-center">
                                {isSubmitting ? 'Menyimpan...' : <><Save size={16} className="mr-2"/> Simpan Perubahan</>}
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 -mt-6 -mx-6 mb-6 p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Manajemen Halaqah</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Bulk Delete Button */}
                        {selectedHalaqahIds.length > 0 && (
                            <button 
                                onClick={handleBulkDelete} 
                                disabled={isSubmitting}
                                className="bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded-lg flex items-center text-sm font-semibold hover:bg-red-100 transition-colors animate-in fade-in"
                            >
                                <Trash size={16} className="mr-2"/> Hapus {selectedHalaqahIds.length} Terpilih
                            </button>
                        )}

                        <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                        
                        <button onClick={() => { setModalType('create'); setNewHalaqahName(''); setNoUrut(999); setSelectedSantriIds([]); }} className="bg-secondary text-white py-2 px-4 rounded-lg flex items-center text-sm font-semibold hover:bg-accent shadow-sm">
                            <Plus size={18} className="mr-2"/> Buat Baru
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
                            <button onClick={handleExportExcel} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                                <FileSpreadsheet size={14} className="mr-2 text-green-600"/> Export Excel Lengkap
                            </button>
                            <button onClick={handleExportPDF} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left border-t border-slate-100">
                                <FileText size={14} className="mr-2 text-red-600"/> Export PDF Lengkap
                            </button>
                        </ActionDropdown>
                    </div>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 border-b border-slate-200">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filter Jenis</label>
                        <select value={filterJenis} onChange={e => setFilterJenis(e.target.value as any)} className="block w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary"><option value="all">Semua Jenis</option>{availableTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filter Marhalah</label>
                        <select value={filterMarhalah} onChange={e => setFilterMarhalah(e.target.value as any)} className="block w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary"><option value="all">Semua Marhalah</option>{ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cari Nama / Musammi</label>
                        <div className="relative"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input type="text" placeholder="Cari halaqah atau musammi..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="pl-10 w-full border-slate-300 rounded-md text-sm shadow-sm focus:border-secondary focus:ring-secondary"/></div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-center w-10">
                                    <button onClick={toggleSelectAll} className="text-slate-500 hover:text-secondary">
                                        {selectedHalaqahIds.length === filteredHalaqah.length && filteredHalaqah.length > 0 
                                            ? <CheckSquare size={18} className="text-secondary"/> 
                                            : <Square size={18}/>
                                        }
                                    </button>
                                </th>
                                <th className="px-6 py-3 font-bold tracking-wider text-center">No Urut</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Nama Halaqah</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Musammi'</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Marhalah</th>
                                <th className="px-6 py-3 font-bold tracking-wider">Jenis</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredHalaqah.map(h => {
                                const isSelected = selectedHalaqahIds.includes(h.id);
                                return (
                                    <tr key={h.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => setSelectedHalaqah(h)}>
                                        <td className="px-6 py-4 text-center" onClick={(e) => { e.stopPropagation(); toggleSelectRow(h.id); }}>
                                            {isSelected ? <CheckSquare size={18} className="text-secondary"/> : <Square size={18} className="text-slate-300"/>}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-400">{h.no_urut || '-'}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{h.nama}</td>
                                        <td className="px-6 py-4">{h.musammi.nama}</td>
                                        <td className="px-6 py-4">{h.marhalah}</td>
                                        <td className="px-6 py-4"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{h.jenis}</span></td>
                                    </tr>
                                );
                            })}
                            {filteredHalaqah.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">Tidak ada data ditemukan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Modal */}
            <Modal isOpen={modalType === 'create'} onClose={() => setModalType(null)} title="Buat Halaqah Baru">
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Halaqah</label>
                            <input type="text" placeholder="Nama Halaqah" className="w-full border-slate-300 rounded-md text-sm" value={newHalaqahName} onChange={e => setNewHalaqahName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">No. Urut</label>
                            <input type="number" placeholder="999" className="w-full border-slate-300 rounded-md text-sm" value={noUrut} onChange={e => setNoUrut(parseInt(e.target.value))} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {isCustomJenis ? (
                            <div className="flex gap-2"><input type="text" placeholder="Jenis Baru..." className="w-full border-slate-300 rounded-md text-sm" value={customJenisName} onChange={e => setCustomJenisName(e.target.value)} autoFocus /><button onClick={() => setIsCustomJenis(false)} className="p-2 border rounded-md"><X size={16}/></button></div>
                        ) : (
                            <select className="w-full border-slate-300 rounded-md text-sm" value={selectedJenis} onChange={e => e.target.value === 'NEW' ? setIsCustomJenis(true) : setSelectedJenis(e.target.value as any)}>
                                {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                <option value="NEW">+ Jenis Baru</option>
                            </select>
                        )}
                        <select className="w-full border-slate-300 rounded-md text-sm" value={selectedMarhalah} onChange={e => setSelectedMarhalah(e.target.value as any)}>{ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    </div>
                    <select className="w-full border-slate-300 rounded-md text-sm" value={selectedMusammiId} onChange={e => setSelectedMusammiId(e.target.value)}><option value="">-- Pilih Musammi --</option>{musammi.map(m => <option key={m.id} value={m.id}>{m.nama} ({m.marhalah})</option>)}</select>
                    <div className="pt-2 border-t"><SantriMultiSelect santriList={availableSantri} selectedIds={selectedSantriIds} onToggle={id => setSelectedSantriIds(p => p.includes(id) ? p.filter(x => x!==id) : [...p, id])} label="Anggota Awal (Opsional)"/></div>
                    <div className="flex justify-end pt-4 gap-2"><button onClick={() => setModalType(null)} className="px-4 py-2 border rounded-md">Batal</button><button onClick={handleCreate} disabled={isSubmitting} className="px-4 py-2 bg-secondary text-white rounded-md">{isSubmitting ? '...' : 'Buat'}</button></div>
                </div>
            </Modal>
        </div>
    );
};

export default HalaqahPage;
