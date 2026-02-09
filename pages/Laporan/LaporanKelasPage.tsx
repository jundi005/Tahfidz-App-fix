
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { StackedBarChart, StudentStackedBarChart } from '../../components/Chart';
import { exportToExcel } from '../../lib/utils';
import { ALL_MARHALAH, KELAS_BY_MARHALAH, ALL_ATTENDANCE_STATUS } from '../../constants';
import { Marhalah, AttendanceStatus } from '../../types';
import { Download, Send, CheckSquare, Square, BarChart2, AlertCircle, Copy, Filter, MoreVertical } from 'lucide-react';
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
    
    // Chart Menu
    const [isChartMenuOpen, setIsChartMenuOpen] = useState(false);
    const chartMenuRef = useRef<HTMLDivElement>(null);
    const mainChartRef = useRef<HTMLDivElement>(null);
    const hiddenChartRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (chartMenuRef.current && !chartMenuRef.current.contains(event.target as Node)) {
                setIsChartMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

        // Sorting: Marhalah -> Kelas
        return Object.values(groups).sort((a: any, b: any) => {
            const mIdxA = ALL_MARHALAH.indexOf(a.Marhalah);
            const mIdxB = ALL_MARHALAH.indexOf(b.Marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            return a.Kelas.localeCompare(b.Kelas, undefined, { numeric: true });
        });
    }, [filteredData]);

    const chartData = useMemo(() => classRecapData.map((item: any) => ({ ...item, name: `${item.Kelas} (${item.Marhalah})` })), [classRecapData]);

    // --- Actions ---
    const handleDownloadMainChart = async () => {
        if (mainChartRef.current) {
            try {
                const canvas = await html2canvas(mainChartRef.current, { scale: 2, backgroundColor: '#ffffff' });
                const link = document.createElement('a');
                link.download = `Grafik_Kelas_${new Date().toISOString()}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
                setIsChartMenuOpen(false);
            } catch (e) { console.error(e); }
        }
    };

    // --- WA REPORTING LOGIC ---
    const handleGenerateWAReports = async () => {
        setIsGenerating(true);
        setGeneratedReports({});
        await new Promise(r => setTimeout(r, 800)); // Wait for DOM

        const formatDateIndo = (dateStr: string) => {
            if (!dateStr) return '...';
            const parts = dateStr.split('-');
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        };

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
            
            let periodStr = formatDateIndo(dateRange.start);
            if (dateRange.start !== dateRange.end && dateRange.end) {
                periodStr += ` s.d ${formatDateIndo(dateRange.end)}`;
            }

            let caption = `*LAPORAN ABSENSI KELAS*\n`;
            caption += `Kelas: ${classItem.Kelas} (${classItem.Marhalah})\n`;
            caption += `Periode: ${periodStr}\n\n`;
            
            caption += `*Rekap Kehadiran*\n`;
            caption += `Hadir: ${classItem.Hadir}\n`;
            caption += `Izin: ${classItem.Izin}\n`;
            caption += `Sakit: ${classItem.Sakit}\n`;
            caption += `Alpa: ${classItem.Alpa}\n`;
            caption += `Terlambat: ${classItem.Terlambat}\n\n`;
            
            caption += `*Santri Bermasalah*\n\n`;

            // AGGREGATE ABSENCE COUNTS PER STUDENT
            const problematicStudents = filteredData.filter(r => 
                r.marhalah === classItem.Marhalah && r.kelas === classItem.Kelas && r.status !== 'Hadir'
            ).reduce((acc: any, curr) => {
                if(!acc[curr.nama]) acc[curr.nama] = {};
                // Initialize status count if not exists
                if(!acc[curr.nama][curr.status]) acc[curr.nama][curr.status] = 0;
                acc[curr.nama][curr.status]++;
                return acc;
            }, {});

            if (Object.keys(problematicStudents).length === 0) caption += `(Nihil - Semua Hadir)\n`;
            else {
                Object.entries(problematicStudents).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, counts]: [string, any], idx) => {
                    // Format count: "Alpa (2), Izin (1)"
                    const details = Object.entries(counts)
                        .map(([status, count]) => `${status} (${count})`)
                        .join(', ');
                    caption += `${idx + 1}. ${name} — ${details}\n`;
                });
            }
            
            caption += `\n—\n`;
            caption += `Laporan ini digenerate otomatis oleh Tahfidz App – Sistem Informasi Tahfidz`;
            
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
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <div className="flex items-center mb-3">
                        <Filter size={16} className="text-slate-500 mr-2"/>
                        <h4 className="text-sm font-bold text-slate-700 uppercase">Filter & Aksi</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rentang Tanggal</label>
                            <div className="flex flex-col gap-2">
                                <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="w-full border-slate-300 rounded-md text-xs py-1.5"/>
                                <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="w-full border-slate-300 rounded-md text-xs py-1.5"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filter Marhalah</label>
                            <select value={selectedMarhalah} onChange={e => setSelectedMarhalah(e.target.value as any)} className="w-full border-slate-300 rounded-md text-xs py-1.5">
                                <option value="all">Semua Marhalah</option>
                                {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="lg:col-span-2 flex items-end gap-2 flex-wrap">
                            <button onClick={() => exportToExcel(classRecapData, 'Rekap_Kelas')} className="bg-white border text-slate-700 px-4 py-2 rounded-lg text-sm flex items-center hover:bg-slate-50 font-semibold shadow-sm h-9">
                                <Download size={16} className="mr-2"/> Export Excel
                            </button>
                            <button onClick={handleGenerateWAReports} disabled={selectedClassKeys.length === 0 || isGenerating} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center hover:bg-green-700 disabled:bg-slate-300 font-semibold shadow-sm h-9">
                                <Send size={16} className="mr-2"/> {isGenerating ? 'Memproses...' : `Buat Laporan WA (${selectedClassKeys.length})`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
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
                                    <td className="px-6 py-4 font-bold text-slate-800">{item.Kelas} <span className="text-xs font-normal text-slate-500">({item.Marhalah})</span></td>
                                    <td className="px-6 py-4 text-center text-green-600 font-bold">{item.Hadir}</td>
                                    <td className="px-6 py-4 text-center text-blue-600">{item.Izin}</td>
                                    <td className="px-6 py-4 text-center text-yellow-600">{item.Sakit}</td>
                                    <td className="px-6 py-4 text-center text-red-600">{item.Alpa}</td>
                                    <td className="px-6 py-4 text-center font-bold bg-slate-50">{item.PersenKehadiran}</td>
                                </tr>
                            ))}
                            {classRecapData.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-8 text-slate-400">Tidak ada data.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Grafik Kehadiran Per Kelas">
                <div className="relative" ref={chartMenuRef}>
                    <div className="absolute right-0 top-0 z-10">
                        <button onClick={() => setIsChartMenuOpen(!isChartMenuOpen)} className="p-1 hover:bg-slate-100 rounded"><MoreVertical size={16}/></button>
                        {isChartMenuOpen && <div className="absolute right-0 w-32 bg-white shadow border rounded p-1 z-20"><button onClick={handleDownloadMainChart} className="text-left w-full px-3 py-2 text-xs hover:bg-slate-50 flex items-center"><Download size={12} className="mr-2"/> Download PNG</button></div>}
                    </div>
                    <div className="overflow-x-auto pb-4 custom-scrollbar" ref={mainChartRef}>
                        <div style={{ minWidth: Math.max(800, chartData.length * 60) }}>
                            <StackedBarChart 
                                data={chartData} 
                                rotateLabels={true}
                                bottomMargin={100}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Hidden Charts for Image Generation - MATCH REKAP STYLE */}
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
                        }, [])
                        // Sort internal chart data by Name
                        .sort((a: any, b: any) => a.name.localeCompare(b.name));

                    // Dynamic Width Calculation based on Student Count (Same as Rekap)
                    const calculatedWidth = Math.max(1000, classSpecificData.length * 60);

                    return (
                        <div key={`chart-${classKey}`} ref={(el) => { hiddenChartRefs.current[classKey] = el; }} className="bg-white p-8 flex flex-col gap-8" style={{ width: calculatedWidth }}>
                            <div className="text-center border-b pb-4"><h3 className="text-2xl font-bold">LAPORAN KELAS {classItem.Kelas}</h3></div>
                            <div className="h-[750px] border rounded p-4">
                                <StudentStackedBarChart 
                                    data={classSpecificData} 
                                    height={650} 
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Preview Laporan WA">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
                    {Object.entries(generatedReports).map(([key, data]) => {
                         const report = data as { image: string, caption: string, phone?: string };
                         return (
                            <div key={key} className="flex flex-col md:flex-row gap-4 border-b border-slate-200 pb-6 mb-4 last:border-0">
                                <div className="w-full md:w-1/2">
                                    <img src={report.image} alt="Chart" className="w-full border rounded shadow-sm" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="text-sm font-bold text-slate-700">Wali: {report.phone || 'N/A'}</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCopyImage(report.image)} className="bg-white border px-3 py-1.5 rounded text-xs font-bold text-slate-600 flex items-center hover:bg-slate-50"><Copy size={14} className="mr-1"/> Gambar</button>
                                            <button onClick={() => handleSendWA(report.phone, report.caption)} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center hover:bg-green-700"><Send size={14} className="mr-1"/> WA</button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-200">{report.caption}</div>
                                </div>
                            </div>
                         );
                    })}
                </div>
                <div className="flex justify-end pt-4">
                    <button onClick={() => setIsPreviewModalOpen(false)} className="bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-50">Tutup</button>
                </div>
            </Modal>
        </div>
    );
};

export default LaporanKelasPage;
