
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../../components/Card';
import Modal from '../../components/Modal'; 
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { SimplePieChart, MultiLineChart, StudentStackedBarChart } from '../../components/Chart'; 
import { exportToExcel, exportToPDF } from '../../lib/utils';
import { ALL_MARHALAH, KELAS_BY_MARHALAH, ALL_PERAN, ALL_ATTENDANCE_STATUS, ALL_WAKTU } from '../../constants';
import { Marhalah, Peran, AttendanceStatus, Waktu, AttendanceRecord } from '../../types';
import { Download, Edit, Trash, MoreVertical, ChevronDown, Search, Filter } from 'lucide-react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

const LaporanRekapPage: React.FC = () => {
    const { attendance, updateAttendanceRecord, deleteAttendanceRecord, loading, error } = useSupabaseData();
    const [displayLimit, setDisplayLimit] = useState(100);

    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedMarhalah, setSelectedMarhalah] = useState<Marhalah | 'all'>('all');
    const [selectedKelas, setSelectedKelas] = useState<string | 'all'>('all');
    const [selectedPeran, setSelectedPeran] = useState<Peran | 'all'>('all');
    const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | 'all'>('all');
    const [searchName, setSearchName] = useState('');

    // UI States
    const [showExcelMenu, setShowExcelMenu] = useState(false);
    
    // Chart Menu States
    const [menuOpen, setMenuOpen] = useState<{ bar: boolean, pie: boolean, line: boolean }>({ bar: false, pie: false, line: false });

    // Selection States
    const [selectedStudentDetail, setSelectedStudentDetail] = useState<{id: number, nama: string, peran: string} | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for clicking outside and downloads
    const excelBtnRef = useRef<HTMLDivElement>(null);
    const barMenuRef = useRef<HTMLDivElement>(null);
    const pieMenuRef = useRef<HTMLDivElement>(null);
    const lineMenuRef = useRef<HTMLDivElement>(null);
    
    const barChartRef = useRef<HTMLDivElement>(null);
    const hiddenBarChartRef = useRef<HTMLDivElement>(null); // Ref for download
    const pieChartRef = useRef<HTMLDivElement>(null);
    const lineChartRef = useRef<HTMLDivElement>(null);

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (barMenuRef.current && !barMenuRef.current.contains(event.target as Node)) setMenuOpen(p => ({...p, bar: false}));
            if (pieMenuRef.current && !pieMenuRef.current.contains(event.target as Node)) setMenuOpen(p => ({...p, pie: false}));
            if (lineMenuRef.current && !lineMenuRef.current.contains(event.target as Node)) setMenuOpen(p => ({...p, line: false}));
            if (excelBtnRef.current && !excelBtnRef.current.contains(event.target as Node)) setShowExcelMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 1. Filter Logic
    const filteredData = useMemo(() => {
        return attendance.filter(record => {
            if (dateRange.start && record.date < dateRange.start) return false;
            if (dateRange.end && record.date > dateRange.end) return false;
            if (selectedMarhalah !== 'all' && record.marhalah !== selectedMarhalah) return false;
            if (selectedKelas !== 'all' && record.kelas !== selectedKelas) return false;
            if (selectedPeran !== 'all' && record.peran !== selectedPeran) return false;
            if (selectedStatus !== 'all' && record.status !== selectedStatus) return false;
            if (searchName && !record.nama.toLowerCase().includes(searchName.toLowerCase())) return false;
            return true;
        });
    }, [attendance, dateRange, selectedMarhalah, selectedKelas, selectedPeran, selectedStatus, searchName]);

    // 2. Aggregation Logic
    const recapData = useMemo(() => {
        const groups: Record<string, any> = {};
        filteredData.forEach(r => {
            const key = `${r.peran}_${r.personId}`;
            if (!groups[key]) {
                groups[key] = {
                    id: r.personId, Peran: r.peran, Marhalah: r.marhalah, Kelas: r.kelas, Nama: r.nama,
                    Hadir: 0, Izin: 0, Sakit: 0, Terlambat: 0, Alpa: 0, Total: 0
                };
            }
            if (r.status === 'Hadir') groups[key].Hadir++;
            else if (r.status === 'Izin') groups[key].Izin++;
            else if (r.status === 'Sakit') groups[key].Sakit++;
            else if (r.status === 'Terlambat') groups[key].Terlambat++;
            else if (r.status === 'Alpa') groups[key].Alpa++;
            groups[key].Total++;
        });
        
        // SORTING: Marhalah -> Kelas -> Nama
        return Object.values(groups).sort((a, b) => {
            // 1. Marhalah
            const mIdxA = ALL_MARHALAH.indexOf(a.Marhalah);
            const mIdxB = ALL_MARHALAH.indexOf(b.Marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            
            // 2. Kelas (Alphanumeric safe sort)
            const kA = a.Kelas || '';
            const kB = b.Kelas || '';
            const kelasCompare = kA.localeCompare(kB, undefined, { numeric: true, sensitivity: 'base' });
            if (kelasCompare !== 0) return kelasCompare;

            // 3. Nama
            return a.Nama.localeCompare(b.Nama);
        });
    }, [filteredData]);

    const visibleData = useMemo(() => recapData.slice(0, displayLimit), [recapData, displayLimit]);
    
    // Prepare Data for Stacked Bar Chart
    const chartData = useMemo(() => recapData.map(item => ({ ...item, name: item.Nama })), [recapData]);

    const pieData = useMemo(() => {
        const stats = { [AttendanceStatus.Hadir]: 0, [AttendanceStatus.Izin]: 0, [AttendanceStatus.Sakit]: 0, [AttendanceStatus.Alpa]: 0, [AttendanceStatus.Terlambat]: 0 };
        filteredData.forEach(r => { if (stats[r.status] !== undefined) stats[r.status]++; });
        return Object.entries(stats).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    // Trend Data (Last 30 Days based on current filter or today)
    const trendData = useMemo(() => {
        const parseDate = (dateStr: string) => {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                // Construct date using local time year, month, day to avoid UTC shifts
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
            return new Date();
        };

        const endDate = dateRange.end ? parseDate(dateRange.end) : new Date();
        
        let startDate: Date;
        if (dateRange.start) {
            startDate = parseDate(dateRange.start);
        } else {
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 30);
        }
        
        const days: Record<string, any> = {};
        
        // Generate blank days
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const strDate = format(d, 'yyyy-MM-dd');
            days[strDate] = { 
                date: format(d, 'dd MMM'), 
                fullDate: strDate,
                [AttendanceStatus.Hadir]: 0,
                [AttendanceStatus.Izin]: 0,
                [AttendanceStatus.Sakit]: 0,
                [AttendanceStatus.Alpa]: 0,
                [AttendanceStatus.Terlambat]: 0
            };
        }

        // Fill with data
        filteredData.forEach(r => {
            if (days[r.date]) {
                days[r.date][r.status]++;
            }
        });

        return Object.values(days).sort((a: any, b: any) => a.fullDate.localeCompare(b.fullDate));
    }, [filteredData, dateRange]);

    const studentDetailData = useMemo(() => {
        if (!selectedStudentDetail) return [];
        return filteredData
            .filter(r => r.personId === selectedStudentDetail.id && r.peran === selectedStudentDetail.peran)
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [selectedStudentDetail, filteredData]);

    // Actions
    const handleDownloadChart = async (ref: React.RefObject<HTMLDivElement>, fileName: string) => {
        if (ref.current) {
            try {
                const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: '#ffffff' });
                const link = document.createElement('a');
                link.download = `${fileName}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
                setMenuOpen({bar: false, pie: false, line: false});
            } catch (e) {
                console.error("Download failed", e);
            }
        }
    };

    const handleEdit = (record: AttendanceRecord) => { setEditingRecord(record); setIsEditModalOpen(true); };
    const handleDelete = async (id: number) => { if(confirm('Hapus data?')) await deleteAttendanceRecord(id); };
    const handleUpdate = async () => {
        if(!editingRecord) return;
        setIsSubmitting(true);
        try {
            await updateAttendanceRecord(editingRecord.id, { status: editingRecord.status, date: editingRecord.date, waktu: editingRecord.waktu });
            setIsEditModalOpen(false);
        } catch(e:any) { alert(e.message); }
        finally { setIsSubmitting(false); }
    };

    // Calculate dynamic width for chart
    // Increased multiplier to 60px per bar (bar size 35px + gap) for cleaner look
    const calculatedWidth = Math.max(1000, chartData.length * 60);

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-error">{error}</p>;

    return (
        <div className="space-y-6">
            <Card title="Rekapitulasi Absensi Utama">
                {/* Filters */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <div className="flex items-center mb-3">
                        <Filter size={16} className="text-slate-500 mr-2"/>
                        <h4 className="text-sm font-bold text-slate-700 uppercase">Filter Data</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Periode</label>
                            <div className="flex flex-col gap-2">
                                <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="w-full border-slate-300 rounded-md text-xs py-1.5"/>
                                <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="w-full border-slate-300 rounded-md text-xs py-1.5"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tingkat & Kelas</label>
                            <div className="space-y-2">
                                <select value={selectedMarhalah} onChange={e => {setSelectedMarhalah(e.target.value as any); setSelectedKelas('all');}} className="w-full border-slate-300 rounded-md text-xs py-1.5">
                                    <option value="all">Semua Marhalah</option>
                                    {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)} disabled={selectedMarhalah === 'all'} className="w-full border-slate-300 rounded-md text-xs py-1.5 disabled:bg-slate-100">
                                    <option value="all">Semua Kelas</option>
                                    {selectedMarhalah !== 'all' && KELAS_BY_MARHALAH[selectedMarhalah].map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filter Peran</label>
                            <select value={selectedPeran} onChange={e => setSelectedPeran(e.target.value as any)} className="w-full border-slate-300 rounded-md text-xs py-1.5">
                                <option value="all">Semua Peran</option>
                                {ALL_PERAN.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Kehadiran</label>
                            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)} className="w-full border-slate-300 rounded-md text-xs py-1.5">
                                <option value="all">Semua Status</option>
                                {ALL_ATTENDANCE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cari Nama</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2 text-slate-400" size={14}/>
                                <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} className="pl-8 block w-full border-slate-300 rounded-md text-xs py-1.5" placeholder="Ketik nama..."/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-slate-500">Menampilkan {visibleData.length} dari {recapData.length} data.</p>
                    <div className="flex gap-2">
                        {/* Excel Menu */}
                        <div className="relative" ref={excelBtnRef}>
                            <button onClick={() => setShowExcelMenu(!showExcelMenu)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center hover:bg-green-700 shadow-sm font-semibold">
                                <Download size={16} className="mr-2"/> Export Excel <ChevronDown size={14} className="ml-1"/>
                            </button>
                            {showExcelMenu && (
                                <div className="absolute right-0 mt-1 w-40 bg-white shadow-lg rounded border z-10 animate-in fade-in zoom-in-95 duration-75">
                                    <button onClick={() => {exportToExcel(recapData, 'Rekap_Absensi'); setShowExcelMenu(false);}} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Ringkasan</button>
                                    <button onClick={() => {exportToExcel(filteredData, 'Detail_Absensi'); setShowExcelMenu(false);}} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Detail</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th className="px-6 py-3">Nama</th>
                                <th className="px-6 py-3">Peran</th>
                                <th className="px-6 py-3">Kelas</th>
                                <th className="px-6 py-3 text-center bg-green-50">Hadir</th>
                                <th className="px-6 py-3 text-center bg-blue-50">Izin</th>
                                <th className="px-6 py-3 text-center bg-yellow-50">Sakit</th>
                                <th className="px-6 py-3 text-center bg-red-50">Alpa</th>
                                <th className="px-6 py-3 text-center bg-orange-50">Telat</th>
                                <th className="px-6 py-3 text-center bg-slate-200">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleData.map((item, idx) => (
                                <tr key={idx} className="bg-white border-b hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedStudentDetail({id: item.id, nama: item.Nama, peran: item.Peran})}>
                                    <td className="px-6 py-4 font-bold text-slate-900">{item.Nama}</td>
                                    <td className="px-6 py-4 text-xs">{item.Peran}</td>
                                    <td className="px-6 py-4 text-xs font-mono">{item.Kelas} ({item.Marhalah})</td>
                                    <td className="px-6 py-4 text-center font-bold text-green-600">{item.Hadir}</td>
                                    <td className="px-6 py-4 text-center text-blue-600">{item.Izin}</td>
                                    <td className="px-6 py-4 text-center text-yellow-600">{item.Sakit}</td>
                                    <td className="px-6 py-4 text-center text-red-600">{item.Alpa}</td>
                                    <td className="px-6 py-4 text-center text-orange-600">{item.Terlambat}</td>
                                    <td className="px-6 py-4 text-center font-bold bg-slate-50">{item.Total}</td>
                                </tr>
                            ))}
                            {visibleData.length === 0 && (
                                <tr><td colSpan={9} className="text-center py-8 text-slate-400">Tidak ada data.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {recapData.length > displayLimit && (
                    <div className="text-center mt-4">
                        <button onClick={() => setDisplayLimit(p => p + 100)} className="text-secondary hover:underline text-sm font-semibold">Muat Lebih Banyak...</button>
                    </div>
                )}
            </Card>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Tren Kehadiran (30 Hari Terakhir)">
                    <div className="relative" ref={lineMenuRef}>
                        <div className="absolute right-0 top-0 z-10">
                            <button onClick={() => setMenuOpen(p => ({...p, line: !p.line}))} className="p-1 hover:bg-slate-100 rounded"><MoreVertical size={16}/></button>
                            {menuOpen.line && <div className="absolute right-0 w-32 bg-white shadow-lg border rounded p-1 z-20"><button onClick={() => handleDownloadChart(lineChartRef, 'Tren_Kehadiran')} className="text-left w-full px-3 py-2 text-xs hover:bg-slate-50 flex items-center"><Download size={12} className="mr-2"/> Download PNG</button></div>}
                        </div>
                        <div ref={lineChartRef} className="pt-2">
                            <MultiLineChart data={trendData} />
                        </div>
                    </div>
                </Card>

                <Card title="Proporsi Kehadiran (Total)">
                    <div className="relative" ref={pieMenuRef}>
                        <div className="absolute right-0 top-0 z-10">
                            <button onClick={() => setMenuOpen(p => ({...p, pie: !p.pie}))} className="p-1 hover:bg-slate-100 rounded"><MoreVertical size={16}/></button>
                            {menuOpen.pie && <div className="absolute right-0 w-32 bg-white shadow-lg border rounded p-1 z-20"><button onClick={() => handleDownloadChart(pieChartRef, 'Proporsi_Kehadiran')} className="text-left w-full px-3 py-2 text-xs hover:bg-slate-50 flex items-center"><Download size={12} className="mr-2"/> Download PNG</button></div>}
                        </div>
                        <div ref={pieChartRef}>
                            <SimplePieChart data={pieData} />
                        </div>
                    </div>
                </Card>

                {/* New Grafik Akumulasi Per Individu */}
                <div className="lg:col-span-2">
                    <Card title="Grafik Akumulasi Per Individu">
                        <div className="relative" ref={barMenuRef}>
                            <div className="absolute right-0 top-0 z-10">
                                <button onClick={() => setMenuOpen(p => ({...p, bar: !p.bar}))} className="p-1 hover:bg-slate-100 rounded"><MoreVertical size={16}/></button>
                                {menuOpen.bar && <div className="absolute right-0 w-32 bg-white shadow-lg border rounded p-1 z-20"><button onClick={() => handleDownloadChart(hiddenBarChartRef, 'Grafik_Batang_Siswa')} className="text-left w-full px-3 py-2 text-xs hover:bg-slate-50 flex items-center"><Download size={12} className="mr-2"/> Download PNG</button></div>}
                            </div>
                            
                            {/* Visible Scrollable Chart Container */}
                            <div className="overflow-x-auto pb-4 custom-scrollbar" ref={barChartRef}>
                                <div style={{ width: calculatedWidth, height: '500px' }}>
                                    <StudentStackedBarChart 
                                        data={chartData} 
                                        height={500} 
                                    />
                                </div>
                            </div>

                            {/* Hidden Full-Width Chart for Download */}
                            <div style={{ position: 'fixed', left: 0, top: '-20000px', zIndex: -50 }}>
                                <div ref={hiddenBarChartRef} style={{ width: calculatedWidth, height: 750, padding: 20, background: 'white' }}>
                                    <h3 className="text-xl font-bold text-center mb-6">Grafik Akumulasi Kehadiran Santri</h3>
                                    <StudentStackedBarChart 
                                        data={chartData} 
                                        height={650} 
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={!!selectedStudentDetail} onClose={() => setSelectedStudentDetail(null)} title={`Detail Absensi: ${selectedStudentDetail?.nama}`}>
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="bg-slate-50 sticky top-0"><tr><th className="px-4 py-2">Tanggal</th><th className="px-4 py-2">Waktu</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Aksi</th></tr></thead>
                        <tbody>
                            {studentDetailData.map(r => (
                                <tr key={r.id} className="border-b">
                                    <td className="px-4 py-2">{r.date}</td>
                                    <td className="px-4 py-2">{r.waktu}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded text-xs text-white ${
                                            r.status === 'Hadir' ? 'bg-green-500' : 
                                            r.status === 'Sakit' ? 'bg-yellow-500' : 
                                            r.status === 'Izin' ? 'bg-blue-500' : 
                                            r.status === 'Terlambat' ? 'bg-orange-500' : 'bg-red-500'
                                        }`}>{r.status}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(r)} className="text-secondary hover:bg-blue-50 p-1 rounded"><Edit size={14}/></button>
                                        <button onClick={() => handleDelete(r.id)} className="text-error hover:bg-red-50 p-1 rounded"><Trash size={14}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Absensi Manual">
                {editingRecord && (
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-slate-500">Tanggal</label><input type="date" className="w-full border p-2 rounded text-sm mt-1" value={editingRecord.date} onChange={e => setEditingRecord({...editingRecord, date: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500">Waktu</label><select className="w-full border p-2 rounded text-sm mt-1" value={editingRecord.waktu} onChange={e => setEditingRecord({...editingRecord, waktu: e.target.value as Waktu})}>{ALL_WAKTU.map(w => <option key={w} value={w}>{w}</option>)}</select></div>
                        <div><label className="text-xs font-bold text-slate-500">Status</label><select className="w-full border p-2 rounded text-sm mt-1" value={editingRecord.status} onChange={e => setEditingRecord({...editingRecord, status: e.target.value as AttendanceStatus})}>{ALL_ATTENDANCE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div className="flex justify-end pt-4 gap-2">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border rounded text-sm">Batal</button>
                            <button onClick={handleUpdate} disabled={isSubmitting} className="px-4 py-2 bg-secondary text-white rounded text-sm font-semibold hover:bg-accent">{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default LaporanRekapPage;
