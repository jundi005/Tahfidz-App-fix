
import React, { useState, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { StackedBarChart } from '../../components/Chart';
import { exportToExcel } from '../../lib/utils';
import { ALL_MARHALAH, KELAS_BY_MARHALAH, ALL_ATTENDANCE_STATUS } from '../../constants';
import { Marhalah, AttendanceStatus } from '../../types';
import { Download, Send, CheckSquare, Square, BarChart2, AlertCircle, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';

const LaporanKelasPage: React.FC = () => {
    const { attendance, waliKelas, loading, error } = useSupabaseData();
    
    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedMarhalah, setSelectedMarhalah] = useState<Marhalah | 'all'>('all');
    
    // Reporting States
    const [selectedClassKeys, setSelectedClassKeys] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReports, setGeneratedReports] = useState<Record<string, { image: string, caption: string, phone?: string }>>({});
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const hiddenChartRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // 1. Filter Data
    const filteredData = useMemo(() => {
        return attendance.filter(record => {
            if (dateRange.start && record.date < dateRange.start) return false;
            if (dateRange.end && record.date > dateRange.end) return false;
            if (selectedMarhalah !== 'all' && record.marhalah !== selectedMarhalah) return false;
            return true;
        });
    }, [attendance, dateRange, selectedMarhalah]);

    // 2. Aggregate Data per Class
    const classRecapData = useMemo(() => {
        const groups: Record<string, any> = {};
        filteredData.forEach(r => {
            const key = `${r.marhalah}-${r.kelas}`;
            if (!groups[key]) {
                groups[key] = {
                    key, Marhalah: r.marhalah, Kelas: r.kelas,
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

        Object.values(groups).forEach((g: any) => {
            g.PersenKehadiran = g.Total > 0 ? `${Math.round((g.Hadir / g.Total) * 100)}%` : '0%';
        });

        return Object.values(groups).sort((a: any, b: any) => a.Kelas.localeCompare(b.Kelas));
    }, [filteredData]);

    const chartData = useMemo(() => classRecapData.map((item: any) => ({ ...item, name: `${item.Kelas} (${item.Marhalah})` })), [classRecapData]);

    // --- WA REPORTING LOGIC ---
    const handleGenerateWAReports = async () => {
        setIsGenerating(true);
        setGeneratedReports({});
        await new Promise(r => setTimeout(r, 800)); // Wait for DOM

        const reports: Record<string, any> = {};
        for (const classKey of selectedClassKeys) {
            const classItem = classRecapData.find((c: any) => c.key === classKey);
            if (!classItem) continue;

            const chartEl = hiddenChartRefs.current[classKey];
            let imageUrl = '';
            if (chartEl) {
                try {
                    const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff', width: chartEl.scrollWidth, height: chartEl.scrollHeight });
                    imageUrl = canvas.toDataURL('image/png');
                } catch (e) { console.error(`Failed capture ${classKey}`, e); }
            }

            const wali = waliKelas.find(w => w.marhalah === classItem.Marhalah && w.kelas === classItem.Kelas);
            
            let caption = `*LAPORAN ABSENSI KELAS*\nKelas: ${classItem.Kelas} (${classItem.Marhalah})\nPeriode: ${dateRange.start || '...'} s.d ${dateRange.end || '...'}\n\n`;
            caption += `Hadir: ${classItem.Hadir} | Izin: ${classItem.Izin} | Sakit: ${classItem.Sakit} | Alpa: ${classItem.Alpa} | Telat: ${classItem.Terlambat}\n\n`;
            caption += `*DAFTAR SANTRI BERMASALAH*\n`;

            const problematicStudents = filteredData.filter(r => 
                r.marhalah === classItem.Marhalah && r.kelas === classItem.Kelas && r.status !== 'Hadir'
            ).reduce((acc: any, curr) => {
                if(!acc[curr.nama]) acc[curr.nama] = [];
                acc[curr.nama].push(curr.status);
                return acc;
            }, {});

            if (Object.keys(problematicStudents).length === 0) caption += `(Nihil - Semua Hadir)\n`;
            else {
                Object.entries(problematicStudents).forEach(([name, statuses]: [string, any], idx) => {
                    caption += `${idx + 1}. ${name} (${statuses.join(', ')})\n`;
                });
            }
            
            reports[classKey] = { image: imageUrl, caption, phone: wali?.no_hp };
        }
        setGeneratedReports(reports);
        setIsGenerating(false);
        setIsPreviewModalOpen(true);
    };

    const handleSendWA = (phone: string | undefined, caption: string) => {
        if (!phone) return alert("No HP Wali Kelas tidak ada.");
        const p = phone.replace(/\D/g, '').replace(/^0/, '62');
        window.open(`https://wa.me/${p}?text=${encodeURIComponent(caption)}`, '_blank');
    };

    const handleCopyImage = async (url: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            alert("Gambar disalin!");
        } catch(e) { alert("Gagal copy gambar."); }
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-error">{error}</p>;

    return (
        <div className="space-y-6">
            <Card title="Rekapitulasi Per Kelas">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm text-slate-700">Rentang Tanggal</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="w-full border rounded text-sm"/>
                            <span>-</span>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="w-full border rounded text-sm"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-700">Marhalah</label>
                        <select value={selectedMarhalah} onChange={e => setSelectedMarhalah(e.target.value as any)} className="w-full border rounded text-sm mt-1 p-2">
                            <option value="all">Semua</option>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={() => exportToExcel(classRecapData, 'Rekap_Kelas')} className="bg-white border text-slate-700 px-4 py-2 rounded text-sm flex items-center hover:bg-slate-50"><Download size={16} className="mr-2"/> Excel</button>
                        <button onClick={handleGenerateWAReports} disabled={selectedClassKeys.length === 0 || isGenerating} className="bg-green-600 text-white px-4 py-2 rounded text-sm flex items-center hover:bg-green-700 disabled:bg-slate-300">
                            <Send size={16} className="mr-2"/> {isGenerating ? 'Memproses...' : `Buat Laporan WA (${selectedClassKeys.length})`}
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="bg-slate-50 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <button onClick={() => setSelectedClassKeys(selectedClassKeys.length === classRecapData.length ? [] : classRecapData.map((c: any) => c.key))}>
                                        {selectedClassKeys.length > 0 ? <CheckSquare size={18} className="text-secondary"/> : <Square size={18}/>}
                                    </button>
                                </th>
                                <th className="px-6 py-3">Kelas</th><th className="px-6 py-3 text-center">Hadir</th><th className="px-6 py-3 text-center">Izin</th><th className="px-6 py-3 text-center">Sakit</th><th className="px-6 py-3 text-center">Alpa</th><th className="px-6 py-3 text-center">% Hadir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classRecapData.map((item: any) => (
                                <tr key={item.key} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedClassKeys(p => p.includes(item.key) ? p.filter(k => k !== item.key) : [...p, item.key])}>
                                    <td className="px-4 py-3">
                                        {selectedClassKeys.includes(item.key) ? <CheckSquare size={18} className="text-secondary"/> : <Square size={18}/>}
                                    </td>
                                    <td className="px-6 py-4 font-bold">{item.Kelas} <span className="text-xs font-normal text-slate-500">({item.Marhalah})</span></td>
                                    <td className="px-6 py-4 text-center text-green-600">{item.Hadir}</td>
                                    <td className="px-6 py-4 text-center text-blue-600">{item.Izin}</td>
                                    <td className="px-6 py-4 text-center text-yellow-600">{item.Sakit}</td>
                                    <td className="px-6 py-4 text-center text-red-600">{item.Alpa}</td>
                                    <td className="px-6 py-4 text-center font-bold">{item.PersenKehadiran}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Grafik Kehadiran Per Kelas">
                <div className="overflow-x-auto pb-4"><div style={{ minWidth: Math.max(100, chartData.length * 50) }}><StackedBarChart data={chartData} /></div></div>
            </Card>

            {/* Hidden Charts for Image Generation */}
            <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
                {selectedClassKeys.map(classKey => {
                    const classItem = classRecapData.find((c: any) => c.key === classKey);
                    if (!classItem) return null;
                    const classSpecificData = filteredData
                        .filter(r => r.marhalah === classItem.Marhalah && r.kelas === classItem.Kelas)
                        .reduce((acc: any[], curr) => {
                            const exist = acc.find(a => a.id === curr.personId);
                            if(exist) { exist[curr.status]++; exist.Total++; } 
                            else {
                                const newObj: any = { id: curr.personId, name: curr.nama, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, Terlambat: 0, Total: 1 };
                                newObj[curr.status]++;
                                acc.push(newObj);
                            }
                            return acc;
                        }, []);

                    return (
                        <div key={`chart-${classKey}`} ref={(el) => { hiddenChartRefs.current[classKey] = el; }} className="bg-white p-8 w-[1000px] flex flex-col gap-8">
                            <div className="text-center border-b pb-4"><h3 className="text-2xl font-bold">LAPORAN KELAS {classItem.Kelas}</h3></div>
                            <div className="h-[500px] border rounded p-4"><StackedBarChart data={classSpecificData} /></div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Preview Laporan WA">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
                    {Object.entries(generatedReports).map(([key, data]) => {
                         const report = data as { image: string, caption: string, phone?: string };
                         return (
                            <div key={key} className="flex gap-4 border-b pb-6">
                                <img src={report.image} alt="Chart" className="w-1/2 border rounded" />
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between">
                                        <p className="text-sm font-bold">No. Wali: {report.phone || 'N/A'}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCopyImage(report.image)} className="bg-white border px-2 rounded text-xs flex items-center"><Copy size={14} className="mr-1"/> Gambar</button>
                                            <button onClick={() => handleSendWA(report.phone, report.caption)} className="bg-green-600 text-white px-2 rounded text-xs flex items-center"><Send size={14} className="mr-1"/> WA</button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 p-2 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{report.caption}</div>
                                </div>
                            </div>
                         );
                    })}
                </div>
            </Modal>
        </div>
    );
};

export default LaporanKelasPage;
