
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../../components/Card';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { StackedBarChart } from '../../components/Chart';
import { exportToExcel } from '../../lib/utils';
import { ALL_WAKTU } from '../../constants';
import { Trash, Download, Filter, MoreVertical } from 'lucide-react';
import html2canvas from 'html2canvas';

const LaporanWaktuPage: React.FC = () => {
    const { attendance, deleteAttendanceBatch, loading, error } = useSupabaseData();
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
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

    const globalTimeData = useMemo(() => {
        const groups: Record<string, any> = {};
        ALL_WAKTU.forEach(w => { groups[w] = { name: w, Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Terlambat: 0 }; });
        filteredData.forEach(r => { if (groups[r.waktu]) groups[r.waktu][r.status]++; });
        return Object.values(groups);
    }, [filteredData]);

    const handleDeleteTimeRecap = async (date: string, waktu: string) => {
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
                                <tr key={idx} className="border-b hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{item.date}</td>
                                    <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-bold uppercase">{item.waktu}</span></td>
                                    <td className="px-6 py-4 text-center text-green-600 font-bold">{item.Hadir}</td>
                                    <td className="px-6 py-4 text-center text-blue-600">{item.Izin}</td>
                                    <td className="px-6 py-4 text-center text-yellow-600">{item.Sakit}</td>
                                    <td className="px-6 py-4 text-center text-red-600">{item.Alpa}</td>
                                    <td className="px-6 py-4 text-center text-orange-600">{item.Terlambat}</td>
                                    <td className="px-6 py-4 text-center font-bold bg-slate-50">{item.Total}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDeleteTimeRecap(item.date, item.waktu)} className="text-slate-400 hover:text-error p-1 hover:bg-red-50 rounded transition-colors"><Trash size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {timeRecapData.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-slate-400">Tidak ada data.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Grafik Total Absensi Per Sesi (Global)">
                <div className="relative" ref={chartMenuRef}>
                    <div className="absolute right-0 top-0 z-10">
                        <button onClick={() => setIsChartMenuOpen(!isChartMenuOpen)} className="p-1 hover:bg-slate-100 rounded"><MoreVertical size={16}/></button>
                        {isChartMenuOpen && <div className="absolute right-0 w-32 bg-white shadow border rounded p-1 z-20"><button onClick={handleDownloadChart} className="text-left w-full px-3 py-2 text-xs hover:bg-slate-50 flex items-center"><Download size={12} className="mr-2"/> Download PNG</button></div>}
                    </div>
                    <div ref={chartRef}>
                        <StackedBarChart data={globalTimeData} />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default LaporanWaktuPage;
