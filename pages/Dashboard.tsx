
import React, { useMemo, useState, useRef, useEffect } from 'react';
import Card, { WidgetCard } from '../components/Card';
import { AttendanceColumnChart } from '../components/Chart';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { AttendanceStatus, Marhalah } from '../types';
import { Users, BookOpen, MoreVertical, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ALL_MARHALAH, ALL_ATTENDANCE_STATUS } from '../constants';
import html2canvas from 'html2canvas';

const Dashboard: React.FC = () => {
    const { santri, musammi, halaqah, attendance, loading, error } = useSupabaseData();
    
    // Chart Menu State
    const [isChartMenuOpen, setIsChartMenuOpen] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsChartMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Data Calculations ---
    
    // 1. Summary Cards Data
    const santriByMarhalah = useMemo(() => santri.reduce((acc, s) => {
        acc[s.marhalah] = (acc[s.marhalah] || 0) + 1;
        return acc;
    }, {} as Record<Marhalah, number>), [santri]);

    // 2. Statistics Logic (With Fallback Date)
    const todayString = format(new Date(), 'yyyy-MM-dd');
    
    const displayDateInfo = useMemo(() => {
        // Check if we have data for today
        const hasTodayData = attendance.some(a => a.date === todayString);
        
        if (hasTodayData) {
            return { date: todayString, isToday: true };
        }

        // If no data today, find the latest date with data
        const sortedDates = Array.from(new Set(attendance.map(a => a.date)))
            .sort((a: string, b: string) => b.localeCompare(a)); // Descending sort (newest first)
        
        if (sortedDates.length > 0) {
            return { date: sortedDates[0], isToday: false };
        }

        // Default to today if database empty
        return { date: todayString, isToday: true };
    }, [attendance, todayString]);

    
    const todaysStats = useMemo(() => {
        const targetDate = displayDateInfo.date;
        const targetAttendance = attendance.filter(a => a.date === targetDate);
        
        // Initialize structure
        const stats: Record<string, Record<AttendanceStatus, number>> = {};
        
        // Setup initial zeros for all Marhalah and Statuses
        ALL_MARHALAH.forEach(m => {
            stats[m] = {
                [AttendanceStatus.Hadir]: 0,
                [AttendanceStatus.Izin]: 0,
                [AttendanceStatus.Sakit]: 0,
                [AttendanceStatus.Alpa]: 0,
                [AttendanceStatus.Terlambat]: 0,
            };
        });

        // Populate counts
        targetAttendance.forEach(record => {
            if (stats[record.marhalah] && stats[record.marhalah][record.status] !== undefined) {
                stats[record.marhalah][record.status]++;
            }
        });

        return stats;
    }, [attendance, displayDateInfo]);

    // 3. Weekly Attendance Stacked Bar Chart Data
    const weeklyAttendanceData = useMemo(() => {
        // Calculate based on the LAST 7 DAYS from Today (regardless of data availability to show real trend)
        // Or if you prefer relative to the last data point, logic would differ. Usually trends show current week.
        return Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = format(date, 'yyyy-MM-dd');
            const dayName = format(date, 'eee');
            const recordsOnDate = attendance.filter(a => a.date === dateString);
            
            const stats: Record<string, string | number> = { name: dayName };
            Object.values(AttendanceStatus).forEach(status => {
                stats[status] = recordsOnDate.filter(a => a.status === status).length;
            });

            return stats;
        }).reverse();
    }, [attendance]);

    // Helper for status colors
    const getStatusColor = (status: string) => {
        switch(status) {
            case AttendanceStatus.Hadir: return 'bg-green-50 text-green-700 border-green-200';
            case AttendanceStatus.Sakit: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case AttendanceStatus.Izin: return 'bg-blue-50 text-blue-700 border-blue-200';
            case AttendanceStatus.Alpa: return 'bg-red-50 text-red-700 border-red-200';
            case AttendanceStatus.Terlambat: return 'bg-orange-50 text-orange-700 border-orange-200';
            default: return 'bg-slate-50 text-slate-700';
        }
    };

    const handleDownloadChart = async () => {
        if (chartRef.current) {
            try {
                const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: '#ffffff' });
                const link = document.createElement('a');
                link.download = `Tren_Kehadiran_${format(new Date(), 'yyyy-MM-dd')}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
                setIsChartMenuOpen(false);
            } catch (err) {
                console.error("Failed to download chart", err);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                 <div className="text-center p-8">Memuat data dashboard...</div>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-center p-8 text-error">Error: {error}</div>;
    }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <WidgetCard className="flex flex-col justify-between">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Santri</p>
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="text-secondary" size={20}/>
                </div>
            </div>
            <div>
                <p className="text-3xl font-bold mt-2">{santri.length}</p>
                 <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                    <p>Mutawassithah: <span className="font-semibold text-slate-600">{santriByMarhalah[Marhalah.Mutawassithah] || 0}</span></p>
                    <p>Aliyah: <span className="font-semibold text-slate-600">{santriByMarhalah[Marhalah.Aliyah] || 0}</span></p>
                    <p>Jamiah: <span className="font-semibold text-slate-600">{santriByMarhalah[Marhalah.Jamiah] || 0}</span></p>
                </div>
            </div>
        </WidgetCard>
        <WidgetCard className="flex flex-col justify-between">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Musammi'</p>
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <Users className="text-indigo-500" size={20}/>
                </div>
            </div>
             <div>
                <p className="text-3xl font-bold mt-2">{musammi.length}</p>
                <p className="text-xs text-slate-400 mt-2">Pengajar aktif</p>
             </div>
        </WidgetCard>
        <WidgetCard className="flex flex-col justify-between">
             <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Halaqah</p>
                 <div className="p-2 bg-amber-100 rounded-lg">
                    <BookOpen className="text-amber-600" size={20}/>
                 </div>
            </div>
             <div>
                <p className="text-3xl font-bold mt-2">{halaqah.length}</p>
                <p className="text-xs text-slate-400 mt-2">Kelompok belajar</p>
             </div>
        </WidgetCard>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
          <Card 
            title={displayDateInfo.isToday ? "Statistik Absensi Hari Ini" : "Statistik Absensi Terakhir"}
          >
            <div className="overflow-x-auto pb-2">
                <table className="w-full text-sm text-center border-collapse whitespace-nowrap">
                    <thead>
                        <tr>
                            <th className="p-3 text-left font-semibold text-slate-600 border-b border-slate-200">Marhalah</th>
                            {ALL_ATTENDANCE_STATUS.map(status => (
                                <th key={status} className="p-3 font-semibold text-slate-600 border-b border-slate-200">
                                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
                                        {status}
                                    </span>
                                </th>
                            ))}
                            <th className="p-3 font-semibold text-slate-600 border-b border-slate-200 bg-slate-50">Total Input</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ALL_MARHALAH.map(marhalah => {
                            const counts = todaysStats[marhalah];
                            const totalRow = counts ? Object.values(counts).reduce((a: number, b: number) => a + b, 0) : 0;
                            
                            return (
                                <tr key={marhalah} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                    <td className="p-4 text-left font-medium text-slate-800">{marhalah}</td>
                                    {ALL_ATTENDANCE_STATUS.map(status => {
                                        const val = counts?.[status as AttendanceStatus] || 0;
                                        return (
                                            <td key={status} className="p-4">
                                                {val > 0 ? (
                                                    <span className="font-bold text-slate-700">{val}</span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="p-4 font-bold text-slate-800 bg-slate-50">{totalRow}</td>
                                </tr>
                            );
                        })}
                        {/* Summary Row */}
                        <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                            <td className="p-4 text-left text-slate-800">TOTAL</td>
                            {ALL_ATTENDANCE_STATUS.map(status => {
                                const totalCol = ALL_MARHALAH.reduce((sum: number, m) => sum + (todaysStats[m]?.[status as AttendanceStatus] || 0), 0);
                                return (
                                    <td key={status} className="p-4 text-slate-800">{totalCol}</td>
                                );
                            })}
                            <td className="p-4 text-slate-900 bg-slate-100">
                                {ALL_MARHALAH.reduce((sum: number, m: string) => {
                                    const stats = todaysStats[m];
                                    const rowTotal = stats ? (Object.values(stats) as number[]).reduce((a: number, b: number) => a + b, 0) : 0;
                                    return sum + rowTotal;
                                }, 0)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-right">
                {displayDateInfo.isToday 
                    ? `*Data berdasarkan absensi hari ini (${displayDateInfo.date})`
                    : `*Data hari ini kosong. Menampilkan data tanggal: ${displayDateInfo.date}`
                }
            </p>
          </Card>

          <Card className="relative">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center -mx-6 -mt-6 mb-4 rounded-t-xl bg-primary">
                <h2 className="text-lg font-semibold text-slate-800">Tren Kehadiran Seminggu Terakhir</h2>
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsChartMenuOpen(!isChartMenuOpen)}
                        className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    >
                        <MoreVertical size={20}/>
                    </button>
                    {isChartMenuOpen && (
                        <div className="absolute right-0 top-8 w-40 bg-white shadow-lg border border-slate-200 rounded-lg z-10 py-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                            <button 
                                onClick={handleDownloadChart}
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700"
                            >
                                <Download size={14} className="mr-2"/> Download PNG
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="overflow-x-auto pb-4" ref={chartRef}>
                <div className="min-w-[500px]">
                    <AttendanceColumnChart data={weeklyAttendanceData} />
                </div>
            </div>
          </Card>
      </div>
    </div>
  );
};

export default Dashboard;
