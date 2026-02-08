
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { StackedBarChart } from '../../components/Chart';
import { exportToExcel } from '../../lib/utils';
import { ALL_WAKTU, ALL_MARHALAH, ALL_ATTENDANCE_STATUS } from '../../constants';
import { Trash, Download, Filter, MoreVertical, Eye } from 'lucide-react';
import html2canvas from 'html2canvas';

const LaporanWaktuPage: React.FC = () => {
    const { attendance, deleteAttendanceBatch, loading, error } = useSupabaseData();
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
    // Detail Modal State
    const [selectedSession, setSelectedSession] = useState<{date: string, waktu: string} | null>(null);

    // Chart Menu
    const [isChartMenuOpen, setIsChartMenuOpen] = useState(false);
    const chartMenuRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (chartMenuRef.current && !chartMenuRef.current.contains(event.target as Node)) {
                setIsChartMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredData = useMemo(() => {
        return attendance.filter(record => {
            if (dateRange.start && record.date < dateRange.start) return false;
            if (dateRange.end && record.date > dateRange.end) return false;
            return true;
        });
    }, [attendance, dateRange]);

    const timeRecapData = useMemo(() => {
        const groups: Record<string, any> = {};
        filteredData.forEach(r => {
            const key = `${r.date}_${r.waktu}`;
            if (!groups[key]) {
                groups[key] = {
                    date: r.date, waktu: r.waktu,
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
        // Sort by Date Descending
        return Object.values(groups).sort((a: any, b: any) => b.date.localeCompare(a.date));
    }, [filteredData]);

    // Data for Session Breakdown Modal
    const sessionDetailData = useMemo(() => {
        if (!selectedSession) return [];
        
        const sessionAttendance = attendance.filter(a => a.date === selectedSession.date && a.waktu === selectedSession.waktu);
        
        const classGroups: Record<string, any> = {};
        
        sessionAttendance.forEach(r => {
            const key = `${r.marhalah}-${r.kelas}`;
            if (!classGroups[key]) {
                classGroups[key] = {
                    kelas: r.kelas,
                    marhalah: r.marhalah,
                    Hadir: 0, Izin: 0, Sakit: 0, Terlambat: 0, Alpa: 0, Total: 0
                };
            }
            
            if (r.status === 'Hadir') classGroups[key].Hadir++;
            else if (r.status === 'Izin') classGroups[key].Izin++;
            else if (r.status === 'Sakit') classGroups[key].Sakit++;
            else if (r.status === 'Terlambat') classGroups[key].Terlambat++;
            else if (r.status === 'Alpa') classGroups[key].Alpa++;
            classGroups[key].Total++;
        });

        return Object.values(classGroups).sort((a: any, b: any) => {
            const mIdxA = ALL_MARHALAH.indexOf(a.marhalah);
            const mIdxB = ALL_MARHALAH.indexOf(b.marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            return a.kelas.localeCompare(b.kelas, undefined, { numeric: true });
        });
    }, [attendance, selectedSession]);

    const globalTimeData = useMemo(() => {
        const groups: Record<string, any> = {};
        ALL_WAKTU.forEach(w => { groups[w] = { name: w, Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Terlambat: 0 }; });
        filteredData.forEach(r => { if (groups[r.waktu]) groups[r.waktu][r.status]++; });
        return Object.values(groups);
    }, [filteredData]);

    const handleDeleteTimeRecap = async (e: React.MouseEvent, date: string, waktu: string) => {
        e.stopPropagation();
        if (confirm(`Hapus SEMUA data absensi ${date} - ${waktu}?`)) {
            await deleteAttendanceBatch(date, waktu);
        }
    };

    const handleDownloadChart = async () => {
        if (chartRef.current) {
            try {
                const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: '#ffffff' });
                const link = document.createElement('a');
                link.download = `Grafik_Sesi_Global.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
                setIsChartMenuOpen(false);
            } catch (e) { console.error(e); }
        }
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-error">{error}</p>;

    return (
        <div className="space-y-6">
            <Card title="Rekapitulasi Per Waktu">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-end gap-4">
                    <div className="w-full md:w-auto">
                        <div className="flex items-center mb-2">
                            <Filter size={16} className="text-slate-500 mr-2"/>
                            <label className="block text-sm font-bold text-slate-700 uppercase">Rentang Tanggal</label>
                        </div>
                        <div className="flex gap-2">
                            <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="border-slate-300 rounded-md text-sm p-2 w-full md:w-40"/>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="border-slate-300 rounded-md text-sm p-2 w-full md:w-40"/>
                        </div>
                    </div>
                    <button onClick={() => exportToExcel(timeRecapData, 'Rekap_Waktu')} className="bg-white border text-slate-700 px-4 py-2 rounded-lg text-sm flex items-center hover:bg-slate-50 font-semibold shadow-sm h-10 w-full md:w-auto justify-center">
                        <Download size={16} className="mr-2"/> Export Excel
                    </button>
                </div>

                <div className="overflow-x-auto max-h-[500px] border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="bg-slate-50 uppercase text-xs sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 border-b">Tanggal</th><th className="px-6 py-3 border-b">Waktu</th>
                                <th className="px-6 py-3 text-center bg-green-50 border-b">Hadir</th>
                                <th className="px-6 py-3 text-center bg-blue-50 border-b">Izin</th>
                                <th className="px-6 py-3 text-center bg-yellow-50 border-b">Sakit</th>
                                <th className="px-6 py-3 text-center bg-red-50 border-b">Alpa</th>
                                <th className="px-6 py-3 text-center bg-orange-50 border-b">Telat</th>
                                <th className="px-6 py-3 text-center font-bold bg-slate-100 border-b">Total</th>
                                <th className="px-6 py-3 text-right border-b">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {timeRecapData.map((item: any, idx: number) => (
                                <tr 
                                    key={idx} 
                                    className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedSession({ date: item.date, waktu: item.waktu })}
                                    title="Klik untuk lihat detail per kelas"
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center">
                                        <Eye size={14} className="mr-2 text-slate-400" />
                                        {item.date}
                                    </td>
                                    <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-bold uppercase">{item.waktu}</span></td>
                                    <td className="px-6 py-4 text-center text-green-600 font-bold">{item.Hadir}</td>
                                    <td className="px-6 py-4 text-center text-blue-600">{item.Izin}</td>
                                    <td className="px-6 py-4 text-center text-yellow-600">{item.Sakit}</td>
                                    <td className="px-6 py-4 text-center text-red-600">{item.Alpa}</td>
                                    <td className="px-6 py-4 text-center text-orange-600">{item.Terlambat}</td>
                                    <td className="px-6 py-4 text-center font-bold bg-slate-50">{item.Total}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={(e) => handleDeleteTimeRecap(e, item.date, item.waktu)} className="text-slate-400 hover:text-error p-1 hover:bg-red-50 rounded transition-colors"><Trash size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {timeRecapData.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-slate-400">Tidak ada data.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-slate-400 mt-2 italic">*Klik baris untuk melihat detail absensi per kelas pada sesi tersebut.</p>
            </Card>

            <Card title="Grafik Total Absensi Per Sesi (Global)">
                <div className="relative" ref={chartMenuRef}>
                    <div className="absolute right-0 top-0 z-10">
                        <button onClick={() => setIsChartMenuOpen(!isChartMenuOpen)} className="p-1 hover:bg-slate-100 rounded"><MoreVertical size={16}/></button>
                        {isChartMenuOpen && <div className="absolute right-0 w-32 bg-white shadow border rounded p-1 z-20"><button onClick={handleDownloadChart} className="text-left w-full px-3 py-2 text-xs hover:bg-slate-50 flex items-center"><Download size={12} className="mr-2"/> Download PNG</button></div>}
                    </div>
                    <div ref={chartRef}>
                        {/* Menggunakan props baru untuk chart yang lebih ramping */}
                        <StackedBarChart 
                            data={globalTimeData} 
                            height={350} 
                            bottomMargin={30} 
                            rotateLabels={false} 
                            barSize={100}
                        />
                    </div>
                </div>
            </Card>

            {/* MODAL DETAIL PER KELAS */}
            <Modal isOpen={!!selectedSession} onClose={() => setSelectedSession(null)} title={`Detail Absensi: ${selectedSession?.date} (${selectedSession?.waktu})`}>
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="bg-slate-50 uppercase text-xs sticky top-0 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2">Kelas</th>
                                <th className="px-4 py-2 text-center text-green-600">Hadir</th>
                                <th className="px-4 py-2 text-center text-blue-600">Izin</th>
                                <th className="px-4 py-2 text-center text-yellow-600">Sakit</th>
                                <th className="px-4 py-2 text-center text-red-600">Alpa</th>
                                <th className="px-4 py-2 text-center text-orange-600">Telat</th>
                                <th className="px-4 py-2 text-center font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessionDetailData.map((cls, idx) => (
                                <tr key={idx} className="border-b hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium text-slate-900">{cls.kelas} <span className="text-[10px] text-slate-400 font-normal">({cls.marhalah})</span></td>
                                    <td className="px-4 py-2 text-center bg-green-50 font-bold">{cls.Hadir}</td>
                                    <td className="px-4 py-2 text-center">{cls.Izin}</td>
                                    <td className="px-4 py-2 text-center">{cls.Sakit}</td>
                                    <td className="px-4 py-2 text-center">{cls.Alpa}</td>
                                    <td className="px-4 py-2 text-center">{cls.Terlambat}</td>
                                    <td className="px-4 py-2 text-center font-bold bg-slate-50">{cls.Total}</td>
                                </tr>
                            ))}
                            {sessionDetailData.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Tidak ada data untuk sesi ini.</td></tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold text-slate-800 text-xs uppercase">
                            <tr>
                                <td className="px-4 py-2">Total Global</td>
                                <td className="px-4 py-2 text-center">{sessionDetailData.reduce((a:number, b:any) => a + b.Hadir, 0)}</td>
                                <td className="px-4 py-2 text-center">{sessionDetailData.reduce((a:number, b:any) => a + b.Izin, 0)}</td>
                                <td className="px-4 py-2 text-center">{sessionDetailData.reduce((a:number, b:any) => a + b.Sakit, 0)}</td>
                                <td className="px-4 py-2 text-center">{sessionDetailData.reduce((a:number, b:any) => a + b.Alpa, 0)}</td>
                                <td className="px-4 py-2 text-center">{sessionDetailData.reduce((a:number, b:any) => a + b.Terlambat, 0)}</td>
                                <td className="px-4 py-2 text-center">{sessionDetailData.reduce((a:number, b:any) => a + b.Total, 0)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div className="mt-4 flex justify-end">
                    <button onClick={() => setSelectedSession(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition-colors">Tutup</button>
                </div>
            </Modal>
        </div>
    );
};

export default LaporanWaktuPage;
