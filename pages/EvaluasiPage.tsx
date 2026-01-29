
import React, { useState, useMemo, useRef } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Marhalah, StudentEvaluation, AttendanceStatus } from '../types';
import { ALL_MARHALAH, KELAS_BY_MARHALAH } from '../constants';
import { Search, Save, MessageCircle, Settings, Download, Upload, FileSpreadsheet, CheckSquare, Square, Edit, Copy, AlertCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { exportToExcel, parseCSV } from '../lib/utils';

// Constants
const DEFAULT_OPTIONS = ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', 'Rasib'];

const formatDateIndo = (dateStr: string) => {
    const [y, m] = dateStr.split('-');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[parseInt(m) - 1]} ${y}`;
};

const EvaluasiPage: React.FC = () => {
    const { 
        santri, halaqah, studentEvaluations, evaluationSettings, attendance, studentProgress,
        updateEvaluation, saveEvaluationSetting, deleteEvaluationSetting, loading, fetchData 
    } = useSupabaseData();
    
    // Filters
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [filterMarhalah, setFilterMarhalah] = useState<Marhalah | 'all'>('all');
    const [filterKelas, setFilterKelas] = useState<string | 'all'>('all');
    const [filterHalaqah, setFilterHalaqah] = useState<string | 'all'>('all');
    const [searchName, setSearchName] = useState('');

    // Selection for Bulk Action
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);

    // Modals
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    
    // State for Notes Modal
    const [currentNoteSantri, setCurrentNoteSantri] = useState<{id: number, name: string} | null>(null);
    const [tempNotes, setTempNotes] = useState({ musammi: '', muroqib: '', lajnah: '' });

    // State for Report Preview
    const [generatedMessages, setGeneratedMessages] = useState<{name: string, phone: string, text: string}[]>([]);
    
    // File Input
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Helpers: Dropdown Options ---
    const getOptions = (category: string) => {
        const custom = evaluationSettings.filter(s => s.category === category).sort((a,b) => (b.score || 0) - (a.score || 0));
        if (custom.length > 0) return custom.map(c => c.label);
        return DEFAULT_OPTIONS;
    };

    // --- 1. Filter Logic ---
    const filteredSantri = useMemo(() => {
        return santri.filter(s => {
            if (filterMarhalah !== 'all' && s.marhalah !== filterMarhalah) return false;
            if (filterKelas !== 'all' && s.kelas !== filterKelas) return false;
            if (filterHalaqah !== 'all') {
                const h = halaqah.find(h => h.id === parseInt(filterHalaqah));
                if (!h || !h.santri.some(member => member.id === s.id)) return false;
            }
            if (searchName && !s.nama.toLowerCase().includes(searchName.toLowerCase())) return false;
            return true;
        }).sort((a, b) => a.nama.localeCompare(b.nama));
    }, [santri, filterMarhalah, filterKelas, filterHalaqah, searchName, halaqah]);

    // --- 2. Action Handlers ---
    
    const handleValueChange = (santriId: number, field: keyof StudentEvaluation, value: string) => {
        updateEvaluation({
            santri_id: santriId,
            month_key: selectedMonth,
            [field]: value
        });
    };

    const openNotesModal = (santriId: number, name: string) => {
        const evalData = studentEvaluations.find(e => e.santri_id === santriId && e.month_key === selectedMonth);
        setTempNotes({
            musammi: evalData?.catatan_musammi || '',
            muroqib: evalData?.catatan_muroqib || '',
            lajnah: evalData?.catatan_lajnah || ''
        });
        setCurrentNoteSantri({ id: santriId, name });
        setIsNotesModalOpen(true);
    };

    const saveNotes = () => {
        if (currentNoteSantri) {
            updateEvaluation({
                santri_id: currentNoteSantri.id,
                month_key: selectedMonth,
                catatan_musammi: tempNotes.musammi,
                catatan_muroqib: tempNotes.muroqib,
                catatan_lajnah: tempNotes.lajnah
            });
            setIsNotesModalOpen(false);
        }
    };

    // --- 3. Settings Logic ---
    const [newOption, setNewOption] = useState('');
    const [newCategory, setNewCategory] = useState<'Hafalan' | 'Bacaan' | 'Sikap'>('Hafalan');

    const handleAddOption = async () => {
        if (!newOption.trim()) return;
        await saveEvaluationSetting({ category: newCategory, label: newOption, score: 0 });
        setNewOption('');
    };

    const handleDeleteOption = async (id: number) => {
        if (confirm('Hapus opsi ini?')) await deleteEvaluationSetting(id);
    };

    // --- 4. Report Generation (WhatsApp) ---
    
    const handleGenerateWA = () => {
        if (selectedSantriIds.length === 0) return alert("Pilih santri terlebih dahulu.");
        
        const messages: {name: string, phone: string, text: string}[] = [];

        selectedSantriIds.forEach(id => {
            const student = santri.find(x => x.id === id);
            if (!student) return;

            const evalData = studentEvaluations.find(x => x.santri_id === id && x.month_key === selectedMonth);
            
            // 1. Attendance Stats for Selected Month
            const studentAtt = attendance.filter(a => 
                a.personId === id && 
                a.peran === 'Santri' && 
                a.date.startsWith(selectedMonth)
            );
            
            const stats = {
                [AttendanceStatus.Hadir]: 0,
                [AttendanceStatus.Izin]: 0,
                [AttendanceStatus.Sakit]: 0,
                [AttendanceStatus.Alpa]: 0,
                [AttendanceStatus.Terlambat]: 0
            };
            studentAtt.forEach(a => { if (stats[a.status] !== undefined) stats[a.status]++; });

            // 2. Progress Stats for Selected Month
            const studentProg = studentProgress.filter(p => p.santri_id === id && p.month_key === selectedMonth);
            const getProgVal = (type: string) => studentProg.find(p => p.progress_type === type)?.value || '-';

            // 3. Construct Message
            const parentName = student.nama_wali || 'Bapak/Ibu';
            const period = formatDateIndo(selectedMonth);

            let msg = `Assalamu’alaikum warahmatullahi wabarakatuh.\n\n`;
            msg += `Kepada Ykh. ${parentName}\nWali santri dari *${student.nama}*\n\n`;
            msg += `Berikut kami sampaikan *Laporan Evaluasi Bulanan* santri periode *${period}*:\n\n`;

            msg += `📊 *STATISTIK KEHADIRAN*\n`;
            msg += `✅ Hadir: ${stats.Hadir}\n`;
            msg += `🤒 Sakit: ${stats.Sakit}\n`;
            msg += `📩 Izin: ${stats.Izin}\n`;
            msg += `❌ Alpa: ${stats.Alpa}\n`;
            msg += `⏰ Terlambat: ${stats.Terlambat}\n\n`;

            msg += `📈 *CAPAIAN TAHFIDZ*\n`;
            msg += `📖 Total Hafalan: ${getProgVal('Hafalan')} Juz\n`;
            msg += `🔄 Murojaah: ${getProgVal('Murojaah')} Juz\n`;
            msg += `➕ Ziyadah: ${getProgVal('Ziyadah')} Hal\n\n`;

            msg += `📝 *PENILAIAN & EVALUASI*\n`;
            msg += `• Kualitas Hafalan: *${evalData?.kualitas_hafalan || '-'}*\n`;
            msg += `• Kualitas Bacaan: *${evalData?.kualitas_bacaan || '-'}*\n`;
            msg += `• Sikap & Prilaku: *${evalData?.sikap_prilaku || '-'}*\n\n`;

            msg += `📋 *CATATAN PENGASUH*\n`;
            if (evalData?.catatan_musammi) msg += `👤 Musammi: "${evalData.catatan_musammi}"\n`;
            if (evalData?.catatan_muroqib) msg += `👀 Muroqib: "${evalData.catatan_muroqib}"\n`;
            if (evalData?.catatan_lajnah) msg += `🏛 Lajnah: "${evalData.catatan_lajnah}"\n`;
            
            if (!evalData?.catatan_musammi && !evalData?.catatan_muroqib && !evalData?.catatan_lajnah) {
                msg += `(Tidak ada catatan khusus)\n`;
            }

            msg += `\nDemikian laporan ini kami sampaikan. Jazakumullahu khairan atas perhatiannya.\n`;
            msg += `Wassalamu’alaikum warahmatullahi wabarakatuh.`;

            messages.push({
                name: student.nama,
                phone: student.no_hp_wali || '',
                text: msg
            });
        });

        setGeneratedMessages(messages);
        setIsPreviewModalOpen(true);
    };

    const sendWA = (phone: string, text: string) => {
        if(!phone) return alert("Nomor HP tidak tersedia.");
        let p = phone.replace(/\D/g, '');
        if(p.startsWith('0')) p = '62' + p.substring(1);
        window.open(`https://wa.me/${p}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Pesan disalin ke clipboard!");
    };

    // --- 5. Import/Export ---
    
    const handleDownloadTemplate = () => {
        const headers = ['nama_santri', 'kualitas_hafalan', 'kualitas_bacaan', 'sikap', 'catatan_musammi', 'catatan_muroqib', 'catatan_lajnah'];
        const dummy = ['Abdullah', 'Mumtaz', 'Jayyid', 'Baik', 'Hafalan lancar', 'Perlu ditingkatkan murojaahnya', '-'];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), dummy.join(',')].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "template_evaluasi.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if(!file) return;
        try {
            const csvData = await parseCSV(file);
            let success = 0; 
            for(const row of csvData) {
                const name = row.nama_santri || row.nama || row.Nama;
                if(!name) continue;
                
                const target = santri.find(s => s.nama.toLowerCase() === name.toLowerCase().trim());
                if(target) {
                    await updateEvaluation({
                        santri_id: target.id,
                        month_key: selectedMonth,
                        kualitas_hafalan: row.kualitas_hafalan || row.hafalan,
                        kualitas_bacaan: row.kualitas_bacaan || row.bacaan,
                        sikap_prilaku: row.sikap || row.sikap_prilaku,
                        catatan_musammi: row.catatan_musammi,
                        catatan_muroqib: row.catatan_muroqib,
                        catatan_lajnah: row.catatan_lajnah
                    });
                    success++;
                }
            }
            alert(`Berhasil import ${success} data evaluasi.`);
            fetchData();
        } catch(err) { alert('Gagal import CSV'); }
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExportExcel = () => {
        const data = filteredSantri.map(s => {
            const evalData = studentEvaluations.find(e => e.santri_id === s.id && e.month_key === selectedMonth);
            return {
                'Nama': s.nama,
                'Kelas': `${s.kelas} (${s.marhalah})`,
                'Hafalan': evalData?.kualitas_hafalan || '-',
                'Bacaan': evalData?.kualitas_bacaan || '-',
                'Sikap': evalData?.sikap_prilaku || '-',
                'Catatan Musammi': evalData?.catatan_musammi || '-',
                'Catatan Muroqib': evalData?.catatan_muroqib || '-',
                'Catatan Lajnah': evalData?.catatan_lajnah || '-'
            };
        });
        exportToExcel(data, `Evaluasi_${selectedMonth}`);
    };

    const toggleSelectAll = () => {
        if (selectedSantriIds.length === filteredSantri.length) setSelectedSantriIds([]);
        else setSelectedSantriIds(filteredSantri.map(s => s.id));
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 -mt-2">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Evaluasi Bulanan & Laporan</h2>
                        <p className="text-sm text-slate-500">Input nilai, catatan, dan kirim laporan perkembangan ke Wali Santri.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setIsSettingsOpen(true)} className="bg-white border text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center font-medium shadow-sm"><Settings size={16} className="mr-2"/> Opsi Nilai</button>
                        <button onClick={handleExportExcel} className="bg-white border text-green-700 border-green-200 px-3 py-2 rounded-lg text-sm hover:bg-green-50 flex items-center font-medium shadow-sm"><Download size={16} className="mr-2"/> Excel</button>
                        
                        <div className="flex gap-1 border rounded-lg overflow-hidden shadow-sm">
                            <button onClick={handleDownloadTemplate} className="bg-white border-r text-blue-700 px-3 py-2 text-sm hover:bg-blue-50 font-medium" title="Download Template CSV"><FileSpreadsheet size={16}/></button>
                            <button onClick={() => fileInputRef.current?.click()} className="bg-white text-blue-700 px-3 py-2 text-sm hover:bg-blue-50 font-medium flex items-center"><Upload size={16} className="mr-2"/> Import CSV</button>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV}/>
                        
                        <button onClick={handleGenerateWA} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center font-bold shadow-sm transition-colors">
                            Laporan WA
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bulan Evaluasi</label>
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full border-slate-300 rounded-md text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Halaqah</label>
                        <select value={filterHalaqah} onChange={e => setFilterHalaqah(e.target.value)} className="w-full border-slate-300 rounded-md text-sm">
                            <option value="all">Semua Halaqah</option>
                            {halaqah.map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marhalah</label>
                        <select value={filterMarhalah} onChange={e => {setFilterMarhalah(e.target.value as any); setFilterKelas('all')}} className="w-full border-slate-300 rounded-md text-sm">
                            <option value="all">Semua Marhalah</option>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kelas</label>
                        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} disabled={filterMarhalah === 'all'} className="w-full border-slate-300 rounded-md text-sm disabled:bg-slate-100">
                            <option value="all">Semua Kelas</option>
                            {filterMarhalah !== 'all' && KELAS_BY_MARHALAH[filterMarhalah].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cari Nama</label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 text-slate-400" size={14}/>
                            <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} className="pl-8 w-full border-slate-300 rounded-md text-sm" placeholder="Nama santri..."/>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-700">
                            <tr>
                                <th className="px-4 py-3 w-10 text-center border-b">
                                    <button onClick={toggleSelectAll}>{selectedSantriIds.length === filteredSantri.length && filteredSantri.length > 0 ? <CheckSquare size={18} className="text-secondary"/> : <Square size={18}/>}</button>
                                </th>
                                <th className="px-4 py-3 border-b min-w-[200px]">Nama Santri</th>
                                <th className="px-4 py-3 border-b">Kelas</th>
                                <th className="px-4 py-3 border-b text-center w-32 bg-green-50">Hafalan</th>
                                <th className="px-4 py-3 border-b text-center w-32 bg-blue-50">Bacaan</th>
                                <th className="px-4 py-3 border-b text-center w-32 bg-yellow-50">Sikap</th>
                                <th className="px-4 py-3 border-b text-center w-24">Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredSantri.map(s => {
                                const evalData = studentEvaluations.find(e => e.santri_id === s.id && e.month_key === selectedMonth);
                                const isSelected = selectedSantriIds.includes(s.id);
                                const hasNotes = evalData?.catatan_musammi || evalData?.catatan_muroqib || evalData?.catatan_lajnah;

                                return (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-center" onClick={() => setSelectedSantriIds(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}>
                                            {isSelected ? <CheckSquare size={18} className="text-secondary"/> : <Square size={18} className="text-slate-300"/>}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-900">{s.nama}</td>
                                        <td className="px-4 py-3 text-xs">{s.kelas} ({s.marhalah})</td>
                                        
                                        {/* Dropdowns */}
                                        <td className="px-2 py-2 border-l border-slate-100 bg-green-50/30">
                                            <select 
                                                className="w-full text-xs border-slate-200 rounded focus:ring-green-500 focus:border-green-500 bg-transparent"
                                                value={evalData?.kualitas_hafalan || ''}
                                                onChange={e => handleValueChange(s.id, 'kualitas_hafalan', e.target.value)}
                                            >
                                                <option value="">- Pilih -</option>
                                                {getOptions('Hafalan').map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-2 py-2 border-l border-slate-100 bg-blue-50/30">
                                            <select 
                                                className="w-full text-xs border-slate-200 rounded focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                                                value={evalData?.kualitas_bacaan || ''}
                                                onChange={e => handleValueChange(s.id, 'kualitas_bacaan', e.target.value)}
                                            >
                                                <option value="">- Pilih -</option>
                                                {getOptions('Bacaan').map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-2 py-2 border-l border-slate-100 bg-yellow-50/30">
                                            <select 
                                                className="w-full text-xs border-slate-200 rounded focus:ring-yellow-500 focus:border-yellow-500 bg-transparent"
                                                value={evalData?.sikap_prilaku || ''}
                                                onChange={e => handleValueChange(s.id, 'sikap_prilaku', e.target.value)}
                                            >
                                                <option value="">- Pilih -</option>
                                                {getOptions('Sikap').map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </td>
                                        
                                        <td className="px-2 py-2 text-center border-l border-slate-100">
                                            <button 
                                                onClick={() => openNotesModal(s.id, s.nama)}
                                                className={`p-1.5 rounded-full transition-colors ${hasNotes ? 'bg-secondary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}
                                                title="Edit Catatan"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredSantri.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">Tidak ada data.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal Settings */}
            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Pengaturan Opsi Nilai">
                <div className="space-y-6">
                    <div className="flex gap-2 border-b border-slate-200 pb-4">
                        {(['Hafalan', 'Bacaan', 'Sikap'] as const).map(c => (
                            <button 
                                key={c} 
                                onClick={() => setNewCategory(c)} 
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${newCategory === c ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                        {evaluationSettings.filter(s => s.category === newCategory).map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200">
                                <span className="text-sm font-medium text-slate-700">{s.label}</span>
                                <button onClick={() => handleDeleteOption(s.id)} className="text-red-400 hover:text-red-600 px-2">Hapus</button>
                            </div>
                        ))}
                        {evaluationSettings.filter(s => s.category === newCategory).length === 0 && <p className="text-xs text-slate-400 italic">Menggunakan default (Mumtaz, Jayyid, dst)</p>}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <input 
                            type="text" 
                            placeholder="Tambah opsi baru..." 
                            className="flex-1 border-slate-300 rounded-md text-sm"
                            value={newOption}
                            onChange={e => setNewOption(e.target.value)}
                        />
                        <button onClick={handleAddOption} className="bg-secondary text-white px-4 py-2 rounded-md text-sm font-bold">Tambah</button>
                    </div>
                </div>
            </Modal>

            {/* Modal Notes */}
            <Modal isOpen={isNotesModalOpen} onClose={() => setIsNotesModalOpen(false)} title={`Catatan: ${currentNoteSantri?.name}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catatan Musammi</label>
                        <textarea className="w-full border-slate-300 rounded-md text-sm p-2 h-20" value={tempNotes.musammi} onChange={e => setTempNotes(p => ({...p, musammi: e.target.value}))} placeholder="Catatan dari pengampu halaqah..."></textarea>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catatan Muroqib</label>
                        <textarea className="w-full border-slate-300 rounded-md text-sm p-2 h-20" value={tempNotes.muroqib} onChange={e => setTempNotes(p => ({...p, muroqib: e.target.value}))} placeholder="Catatan dari pengawas..."></textarea>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catatan Lajnah</label>
                        <textarea className="w-full border-slate-300 rounded-md text-sm p-2 h-20" value={tempNotes.lajnah} onChange={e => setTempNotes(p => ({...p, lajnah: e.target.value}))} placeholder="Catatan resmi lajnah..."></textarea>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button onClick={saveNotes} className="bg-secondary text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-accent">Simpan Catatan</button>
                    </div>
                </div>
            </Modal>

            {/* Preview Modal Laporan WA */}
            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title={`Preview Pesan (${generatedMessages.length})`}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                    {generatedMessages.map((msg, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-slate-800">{msg.name}</h4>
                                    <p className="text-xs text-slate-500">{msg.phone || 'No HP Kosong'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => copyText(msg.text)}
                                        className="p-1.5 text-slate-500 hover:text-secondary hover:bg-white rounded border border-slate-200"
                                        title="Copy Teks"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button 
                                        onClick={() => sendWA(msg.phone, msg.text)}
                                        className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center hover:bg-green-700 shadow-sm"
                                    >
                                        <Send size={14} className="mr-1.5" /> Kirim WA
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {msg.text}
                            </div>
                            {!msg.phone && (
                                <div className="mt-2 text-xs text-red-500 flex items-center">
                                    <AlertCircle size={14} className="mr-1"/> Tidak dapat mengirim WA otomatis (No HP kosong). Silakan copy manual.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-4">
                    <button onClick={() => setIsPreviewModalOpen(false)} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-6 rounded-lg hover:bg-slate-50 transition-colors">Tutup</button>
                </div>
            </Modal>
        </div>
    );
};

export default EvaluasiPage;
