import React, { useMemo } from 'react';
import Card, { WidgetCard } from '../components/Card';
import { AttendanceColumnChart } from '../components/Chart';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { AttendanceStatus, Marhalah } from '../types';
import { Users, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ALL_MARHALAH, ALL_ATTENDANCE_STATUS } from '../constants';

const Dashboard: React.FC = () => {
    const { santri, musammi, halaqah, attendance, loading, error } = useSupabaseData();

    // --- Data Calculations ---
    
    // 1. Summary Cards Data
    const santriByMarhalah = useMemo(() => santri.reduce((acc, s) => {
        acc[s.marhalah] = (acc[s.marhalah] || 0) + 1;
        return acc;
    }, {} as Record<Marhalah, number>), [santri]);

    // 2. Today's Attendance Statistics by Marhalah
    const todayString = format(new Date(), 'yyyy-MM-dd');
    
    const todaysStats = useMemo(() => {
        const todaysAttendance = attendance.filter(a => a.date === todayString);
        
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
        todaysAttendance.forEach(record => {
            if (stats[record.marhalah] && stats[record.marhalah][record.status] !== undefined) {
                stats[record.marhalah][record.status]++;
            }
        });

        return stats;
    }, [attendance, todayString]);

    // 3. Weekly Attendance Stacked Bar Chart Data
    const weeklyAttendanceData = useMemo(() => {
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
          <Card title="Statistik Absensi Hari Ini">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center border-collapse">
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
            <p className="text-xs text-slate-400 mt-4 text-right">*Data berdasarkan absensi tanggal {todayString}</p>
          </Card>

          <Card title="Tren Kehadiran Seminggu Terakhir">
            <AttendanceColumnChart data={weeklyAttendanceData} />
          </Card>
      </div>
    </div>
  );
};

export default Dashboard;