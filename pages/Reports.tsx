
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal'; 
import { useSupabaseData } from '../hooks/useSupabaseData';
import { SimplePieChart, StackedBarChart, SimpleBarChart } from '../components/Chart'; 
import { exportToExcel, exportToPDF } from '../lib/utils';
import { ALL_MARHALAH, KELAS_BY_MARHALAH, ALL_PERAN, ALL_ATTENDANCE_STATUS, ALL_WAKTU } from '../constants';
import { Marhalah, Peran, AttendanceStatus, Waktu, AttendanceRecord } from '../types';
import { Download, Edit, Trash, FileText, MoreVertical, ChevronDown, ChevronsDown, Clock, Layers, Send, Copy, CheckSquare, Square, AlertCircle, BarChart2 } from 'lucide-react';
import html2canvas from 'html2canvas';

// Add Props Interface
interface ReportsProps {
    initialView?: 'recap' | 'time_recap' | 'class_recap';
}

const Reports: React.FC<ReportsProps> = ({ initialView }) => {
    const { attendance, santri, waliKelas, loading, error, updateAttendanceRecord, deleteAttendanceRecord, deleteAttendanceBatch } = useSupabaseData();
    
    // UI State
    const [viewMode, setViewMode] = useState<'recap' | 'time_recap' | 'class_recap'>('recap');
    const [displayLimit, setDisplayLimit] = useState(1000);
    
    // Sync with prop
    useEffect(() => {
        if (initialView) {
            setViewMode(initialView);
        }
    }, [initialView]);

    // Export Dropdown State
    const [showExcelMenu, setShowExcelMenu] = useState(false);
    const [showPdfMenu, setShowPdfMenu] = useState(false);
    const excelBtnRef = useRef<HTMLDivElement>(null);
    const pdfBtnRef = useRef<HTMLDivElement>(null);

    // State specific for Time Recap Detail Modal
    const [selectedTimeRecap, setSelectedTimeRecap] = useState<{date: string, waktu: string} | null>(null);

    // State specific for Student Detail Modal (from Recap view)
    const [selectedStudentDetail, setSelectedStudentDetail] = useState<{id: number, nama: string, peran: string} | null>(null);

    // --- WA REPORTING STATE ---
    const [selectedClassKeys, setSelectedClassKeys] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReports, setGeneratedReports] = useState<Record<string, { image: string, caption: string, phone?: string }>>({});
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const hiddenChartRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedMarhalah, setSelectedMarhalah] = useState<Marhalah | 'all'>('all');
    const [selectedKelas, setSelectedKelas] = useState<string | 'all'>('all');
    const [selectedPeran, setSelectedPeran] = useState<Peran | 'all'>('all');
    const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | 'all'>('all');
    const [searchName, setSearchName] = useState('');

    // Editing State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Chart Download State (Attendance)
    const chartRef = useRef<HTMLDivElement>(null);
    const [isChartMenuOpen, setIsChartMenuOpen] = useState(false);
    const chartMenuRef = useRef<HTMLDivElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (chartMenuRef.current && !chartMenuRef.current.contains(event.target as Node)) setIsChartMenuOpen(false);
            if (excelBtnRef.current && !excelBtnRef.current.contains(event.target as Node)) setShowExcelMenu(false);
            if (pdfBtnRef.current && !pdfBtnRef.current.contains(event.target as Node)) setShowPdfMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset display limit when filters or view mode changes
    useEffect(() => {
        setDisplayLimit(1000);
    }, [viewMode, dateRange, selectedMarhalah, selectedKelas, selectedPeran, selectedStatus, searchName]);

    // 1. Filter Attendance Data (Applied to all views)
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

    // 2. Aggregate Data for Recap View (By Student)
    const recapData = useMemo(() => {
        const groups: Record<string, {
            id: number,
            Peran: string,
            Marhalah: string,
            Kelas: string,
            Nama: string,
            Hadir: number,
            Izin: number,
            Sakit: number,
            Terlambat: number,
            Alpa: number,
            Total: number
        }> = {};

        filteredData.forEach(r => {
            const key = `${r.peran}_${r.personId}`;
            if (!groups[key]) {
                groups[key] = {
                    id: r.personId,
                    Peran: r.peran,
                    Marhalah: r.marhalah,
                    Kelas: r.kelas,
                    Nama: r.nama,
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

        return Object.values(groups).sort((a, b) => {
            const mIdxA = ALL_MARHALAH.indexOf(a.Marhalah as Marhalah);
            const mIdxB = ALL_MARHALAH.indexOf(b.Marhalah as Marhalah);
            if (mIdxA !== mIdxB) {
                if (mIdxA === -1) return 1;
                if (mIdxB === -1) return -1;
                return mIdxA - mIdxB;
            }
            const kelasList = KELAS_BY_MARHALAH[a.Marhalah as Marhalah] || [];
            const kIdxA = kelasList.indexOf(a.Kelas);
            const kIdxB = kelasList.indexOf(b.Kelas);
            if (kIdxA !== -1 && kIdxB !== -1) {
                if (kIdxA !== kIdxB) return kIdxA - kIdxB;
            } else {
                 if (a.Kelas !== b.Kelas) return a.Kelas.localeCompare(b.Kelas);
            }
            return a.Nama.localeCompare(b.Nama);
        });
    }, [filteredData]);

    // 3. Aggregate Data for Time Recap View (By Date & Time)
    const timeRecapData = useMemo(() => {
        const groups: Record<string, {
            date: string,
            waktu: string,
            Hadir: number,
            Izin: number,
            Sakit: number,
            Terlambat: number,
            Alpa: number,
            Total: number
        }> = {};

        filteredData.forEach(r => {
            const key = `${r.date}_${r.waktu}`;
            if (!groups[key]) {
                groups[key] = {
                    date: r.date,
                    waktu: r.waktu,
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

        return Object.values(groups).sort((a, b) => {
            const dateComp = b.date.localeCompare(a.date);
            if (dateComp !== 0) return dateComp;
            return ALL_WAKTU.indexOf(a.waktu as Waktu) - ALL_WAKTU.indexOf(b.waktu as Waktu);
        });
    }, [filteredData]);

    // 4. Aggregate Data for Class Recap View (By Marhalah & Kelas) - ATTENDANCE ONLY
    const classRecapData = useMemo(() => {
        const groups: Record<string, {
            key: string,
            Marhalah: string,
            Kelas: string,
            Hadir: number,
            Izin: number,
            Sakit: number,
            Terlambat: number,
            Alpa: number,
            Total: number,
            PersenKehadiran: string
        }> = {};

        // A. Attendance Aggregation
        filteredData.forEach(r => {
            const key = `${r.marhalah}-${r.kelas}`;
            if (!groups[key]) {
                groups[key] = {
                    key: key,
                    Marhalah: r.marhalah,
                    Kelas: r.kelas,
                    Hadir: 0, Izin: 0, Sakit: 0, Terlambat: 0, Alpa: 0, Total: 0,
                    PersenKehadiran: '0%'
                };
            }
            if (r.status === 'Hadir') groups[key].Hadir++;
            else if (r.status === 'Izin') groups[key].Izin++;
            else if (r.status === 'Sakit') groups[key].Sakit++;
            else if (r.status === 'Terlambat') groups[key].Terlambat++;
            else if (r.status === 'Alpa') groups[key].Alpa++;
            groups[key].Total++;
        });

        // Calculate Percentage
        Object.values(groups).forEach(group => {
            group.PersenKehadiran = group.Total > 0 ? `${Math.round((group.Hadir / group.Total) * 100)}%` : '0%';
        });

        return Object.values(groups).sort((a, b) => {
            const mIdxA = ALL_MARHALAH.indexOf(a.Marhalah as Marhalah);
            const mIdxB = ALL_MARHALAH.indexOf(b.Marhalah as Marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            
            const kelasList = KELAS_BY_MARHALAH[a.Marhalah as Marhalah] || [];
            const kIdxA = kelasList.indexOf(a.Kelas);
            const kIdxB = kelasList.indexOf(b.Kelas);
            if (kIdxA !== -1 && kIdxB !== -1) return kIdxA - kIdxB;
            
            return a.Kelas.localeCompare(b.Kelas);
        });
    }, [filteredData]);

    // 5. Global Time Recap Data
    const globalTimeData = useMemo(() => {
        const groups: Record<string, any> = {};
        ALL_WAKTU.forEach(w => {
            groups[w] = { name: w, Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Terlambat: 0 };
        });

        filteredData.forEach(r => {
            if (groups[r.waktu]) {
                groups[r.waktu][r.status]++;
            }
        });

        return Object.values(groups);
    }, [filteredData]);

    // Data for charts
    const studentAttendanceChartData = useMemo(() => {
        return recapData.map(item => ({ ...item, name: item.Nama }));
    }, [recapData]);

    const classAttendanceChartData = useMemo(() => {
        return classRecapData.map(item => ({ ...item, name: `${item.Kelas} (${item.Marhalah})` }));
    }, [classRecapData]);

    // Calculate dynamic width for chart container
    const chartMinWidth = useMemo(() => {
         const calculated = studentAttendanceChartData.length * 40;
         return calculated < 600 ? '100%' : `${calculated}px`;
    }, [studentAttendanceChartData]);

    const classChartMinWidth = useMemo(() => {
        const calculated = classAttendanceChartData.length * 50;
        return calculated < 600 ? '100%' : `${calculated}px`;
   }, [classAttendanceChartData]);

   const pieChartData = useMemo(() => {
        const stats = {
            [AttendanceStatus.Hadir]: 0,
            [AttendanceStatus.Izin]: 0,
            [AttendanceStatus.Sakit]: 0,
            [AttendanceStatus.Alpa]: 0,
            [AttendanceStatus.Terlambat]: 0,
        };
        filteredData.forEach(r => {
            if (stats[r.status] !== undefined) stats[r.status]++;
        });
        return Object.entries(stats).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    const timeRecapClassStats = useMemo(() => {
        if (!selectedTimeRecap) return [];
        const groups: Record<string, any> = {};
        const relevantRecords = filteredData.filter(r => 
            r.date === selectedTimeRecap.date && r.waktu === selectedTimeRecap.waktu
        );

        relevantRecords.forEach(r => {
            const key = `${r.marhalah}-${r.kelas}`;
            if (!groups[key]) {
                groups[key] = {
                    marhalah: r.marhalah,
                    kelas: r.kelas,
                    Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, Terlambat: 0, Total: 0
                };
            }
            if (groups[key][r.status] !== undefined) groups[key][r.status]++;
            groups[key].Total++;
        });

        return Object.values(groups).sort((a, b) => {
            const mIdxA = ALL_MARHALAH.indexOf(a.marhalah as Marhalah);
            const mIdxB = ALL_MARHALAH.indexOf(b.marhalah as Marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            return a.kelas.localeCompare(b.kelas);
        });
    }, [selectedTimeRecap, filteredData]);

    const studentDetailData = useMemo(() => {
        if (!selectedStudentDetail) return [];
        return filteredData
            .filter(r => r.personId === selectedStudentDetail.id && r.peran === selectedStudentDetail.peran)
            .sort((a, b) => {
                 const dateComp = b.date.localeCompare(a.date);
                 if (dateComp !== 0) return dateComp;
                 return ALL_WAKTU.indexOf(a.waktu as Waktu) - ALL_WAKTU.indexOf(b.waktu as Waktu);
            });
    }, [selectedStudentDetail, filteredData]);


    // Choose Data based on view
    let sourceData: any[] = [];
    if (viewMode === 'recap') sourceData = recapData;
    else if (viewMode === 'time_recap') sourceData = timeRecapData;
    else if (viewMode === 'class_recap') sourceData = classRecapData;
    
    // Pagination
    const visibleData = useMemo(() => sourceData.slice(0, displayLimit), [sourceData, displayLimit]);

    // --- WA REPORTING ACTIONS (Class Recap) ---

    const toggleSelectClass = (key: string) => {
        setSelectedClassKeys(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleSelectAllClasses = () => {
        if (selectedClassKeys.length === classRecapData.length) {
            setSelectedClassKeys([]);
        } else {
            setSelectedClassKeys(classRecapData.map(r => r.key));
        }
    };

    const handleGenerateWAReports = async () => {
        setIsGenerating(true);
        setGeneratedReports({});
        
        // Extended delay to allow Charts to fully render in the hidden container
        await new Promise(r => setTimeout(r, 800));

        const reports: Record<string, { image: string, caption: string, phone?: string }> = {};

        for (const classKey of selectedClassKeys) {
            const classItem = classRecapData.find(c => c.key === classKey);
            if (!classItem) continue;

            const chartEl = hiddenChartRefs.current[classKey];
            let imageUrl = '';
            
            if (chartEl) {
                try {
                    const canvas = await html2canvas(chartEl, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        width: chartEl.scrollWidth, // Ensure full width capture
                        height: chartEl.scrollHeight // Ensure full height capture
                    });
                    imageUrl = canvas.toDataURL('image/png');
                } catch (e) {
                    console.error(`Failed to capture chart for ${classKey}`, e);
                }
            }

            // Find Wali Kelas Phone
            const wali = waliKelas.find(w => w.marhalah === classItem.Marhalah && w.kelas === classItem.Kelas);
            
            // Build Caption (ATTENDANCE ONLY)
            let caption = `*LAPORAN ABSENSI KELAS*\n`;
            caption += `Kelas: ${classItem.Kelas} (${classItem.Marhalah})\n`;
            caption += `Periode: ${dateRange.start || '...'} s.d ${dateRange.end || '...'}\n`;
            caption += `--------------------------------\n\n`;
            
            caption += `*RINGKASAN KEHADIRAN*\n`;
            caption += `Hadir: ${classItem.Hadir} | Izin: ${classItem.Izin} | Sakit: ${classItem.Sakit} | Alpa: ${classItem.Alpa} | Terlambat: ${classItem.Terlambat}\n\n`;
            
            caption += `*DAFTAR SANTRI BERMASALAH*\n`;

            // Filter students in this class who have issues
            const studentsInClass = recapData.filter(s => s.Marhalah === classItem.Marhalah && s.Kelas === classItem.Kelas);
            const problematicStudents = studentsInClass.filter(s => 
                s.Sakit > 0 || s.Izin > 0 || s.Alpa > 0 || s.Terlambat > 0
            );

            if (problematicStudents.length === 0) {
                caption += `(Nihil - Semua Hadir)\n`;
            } else {
                problematicStudents.forEach((s, idx) => {
                    const notes = [];
                    if(s.Sakit > 0) notes.push(`Sakit: ${s.Sakit}`);
                    if(s.Izin > 0) notes.push(`Izin: ${s.Izin}`);
                    if(s.Alpa > 0) notes.push(`Alpa: ${s.Alpa}`);
                    if(s.Terlambat > 0) notes.push(`Telat: ${s.Terlambat}`);
                    
                    caption += `${idx + 1}. ${s.Nama} (${notes.join(', ')})\n`;
                });
            }

            caption += `\n--------------------------------\n`;
            caption += `Dikirim otomatis oleh Sistem Informasi Tahfidz.`;

            reports[classKey] = {
                image: imageUrl,
                caption: caption,
                phone: wali?.no_hp
            };
        }

        setGeneratedReports(reports);
        setIsGenerating(false);
        setIsPreviewModalOpen(true);
    };

    const handleSendWA = (phone: string | undefined, caption: string) => {
        if (!phone) {
            alert("Nomor HP Wali Kelas tidak ditemukan.");
            return;
        }
        let formatted = phone.replace(/\D/g, '');
        if (formatted.startsWith('0')) formatted = '62' + formatted.substring(1);
        window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(caption)}`, '_blank');
    };

    const handleCopyImage = async (dataUrl: string) => {
        try {
           const res = await fetch(dataUrl);
           const blob = await res.blob();
           await navigator.clipboard.write([
               new ClipboardItem({ 'image/png': blob })
           ]);
           alert("Gambar disalin! Paste (Ctrl+V) di WhatsApp Web.");
       } catch (e) {
           alert("Gagal copy gambar. Browser tidak support.");
       }
   };

    // --- Exports Functions ---
    const handleExportDetailExcel = () => {
        const dataToExport = filteredData.map(r => ({
            Tanggal: r.date, Waktu: r.waktu, Nama: r.nama, Marhalah: r.marhalah, Kelas: r.kelas, Peran: r.peran, Status: r.status
        }));
        exportToExcel(dataToExport, 'Laporan_Detail_Absensi');
        setShowExcelMenu(false);
    };
    
    const handleExportDetailPDF = () => {
        const columns = ['Tanggal', 'Waktu', 'Nama', 'Marhalah', 'Kelas', 'Peran', 'Status'];
        const rows = filteredData.map(item => [item.date, item.waktu, item.nama, item.marhalah, item.kelas, item.peran, item.status]);
        exportToPDF('Laporan Detail Absensi', columns, rows, 'Laporan_Detail_Absensi');
        setShowPdfMenu(false);
    };

    const handleExportRecapExcel = () => {
        const dataToExport = recapData.map(({ id, ...rest }) => rest);
        exportToExcel(dataToExport, 'Laporan_Rekapitulasi_Absensi');
        setShowExcelMenu(false);
    };

    const handleExportRecapPDF = () => {
        const columns = ['Peran', 'Marhalah', 'Kelas', 'Nama', 'Hadir', 'Izin', 'Sakit', 'Terlambat', 'Alpa', 'Total'];
        const rows = recapData.map(item => [item.Peran, item.Marhalah, item.Kelas, item.Nama, item.Hadir, item.Izin, item.Sakit, item.Terlambat, item.Alpa, item.Total]);
        exportToPDF('Laporan Rekapitulasi Absensi', columns, rows, 'Laporan_Rekapitulasi_Absensi');
        setShowPdfMenu(false);
    };
    
    const handleExportTimeRecapExcel = () => {
        const dataToExport = timeRecapData.map(r => ({
            Tanggal: r.date, Waktu: r.waktu, Hadir: r.Hadir, Izin: r.Izin, Sakit: r.Sakit, Alpa: r.Alpa, Terlambat: r.Terlambat, Total: r.Total
        }));
        exportToExcel(dataToExport, 'Laporan_Rekap_Per_Waktu');
    };

    const handleExportTimeRecapPDF = () => {
        const columns = ['Tanggal', 'Waktu', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Terlambat', 'Total'];
        const rows = timeRecapData.map(item => [item.date, item.waktu, item.Hadir, item.Izin, item.Sakit, item.Alpa, item.Terlambat, item.Total]);
        exportToPDF('Laporan Rekapitulasi Per Waktu', columns, rows, 'Laporan_Rekap_Per_Waktu');
    };

    const handleExportClassRecapExcel = () => {
        exportToExcel(classRecapData, 'Laporan_Rekap_Per_Kelas');
    };

    const handleExportClassRecapPDF = () => {
        const columns = ['Marhalah', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Terlambat', 'Total', '% Hadir'];
        const rows = classRecapData.map(item => [item.Marhalah, item.Kelas, item.Hadir, item.Izin, item.Sakit, item.Alpa, item.Terlambat, item.Total, item.PersenKehadiran]);
        exportToPDF('Laporan Rekapitulasi Per Kelas', columns, rows, 'Laporan_Rekap_Per_Kelas');
    };

    // Generic Download Handlers based on Tab
    const handleDownloadExcel = () => {
        if (viewMode === 'time_recap') handleExportTimeRecapExcel();
        else if (viewMode === 'class_recap') handleExportClassRecapExcel();
    };

    const handleDownloadPDF = () => {
        if (viewMode === 'time_recap') handleExportTimeRecapPDF();
        else if (viewMode === 'class_recap') handleExportClassRecapPDF();
    };

    // --- Chart Download Handler (Generic) ---
    const downloadChartAsImage = async (ref: React.RefObject<HTMLDivElement>, fileName: string) => {
        if (ref.current) {
            try {
                // Ensure menu is closed before capture (logic handled by data-html2canvas-ignore)
                const canvas = await html2canvas(ref.current, {
                    backgroundColor: '#ffffff',
                    scale: 2, 
                    windowWidth: ref.current.scrollWidth + 50,
                    width: ref.current.scrollWidth
                });
                const url = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.png`;
                link.href = url;
                link.click();
            } catch (err) {
                console.error("Failed to download chart", err);
                alert("Gagal mendownload grafik.");
            }
        }
    };

    // --- Actions Handlers (Edit/Delete) ---
    const handleEditClick = (record: AttendanceRecord) => {
        setEditingRecord(record);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = async (id: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data absensi ini?')) {
            try {
                if (deleteAttendanceRecord) await deleteAttendanceRecord(id);
            } catch (e: any) {
                alert(`Gagal menghapus: ${e.message}`);
            }
        }
    };

    const handleUpdateSubmit = async () => {
        if (!editingRecord) return;
        setIsSubmitting(true);
        try {
            if (updateAttendanceRecord) {
                await updateAttendanceRecord(editingRecord.id, {
                    status: editingRecord.status,
                    date: editingRecord.date,
                    waktu: editingRecord.waktu
                });
            }
            setIsEditModalOpen(false);
            setEditingRecord(null);
        } catch (e: any) {
            alert(`Gagal update: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTimeRecap = async (date: string, waktu: string) => {
        if (window.confirm(`PERINGATAN: Anda akan menghapus SELURUH data absensi untuk:\nTanggal: ${date}\nWaktu: ${waktu}\n\nTindakan ini tidak dapat dibatalkan. Lanjutkan?`)) {
            try {
                if (deleteAttendanceBatch) await deleteAttendanceBatch(date, waktu);
            } catch (e: any) {
                alert(`Gagal menghapus data: ${e.message}`);
            }
        }
    };
    
    if (loading) return <p>Loading report data...</p>;
    if (error) return <p className="text-error">Error: {error}</p>;

    return (
        <div className="space-y-6">
            {/* ... (Existing Filter and Control Components remain unchanged) ... */}
            <Card title="Filter Laporan">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {/* Filters Input ... (Same as before) */}
                    <div className="md:col-span-2 lg:col-span-1">
                        <label className="block text-sm font-medium text-slate-700">Rentang Tanggal</label>
                        <div className="flex items-center space-x-2 mt-1">
                            <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="w-full border-slate-300 rounded-md shadow-sm text-sm"/>
                            <span className="text-slate-500">-</span>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="w-full border-slate-300 rounded-md shadow-sm text-sm"/>
                        </div>
                    </div>
                    <div>
                         <label htmlFor="marhalah" className="block text-sm font-medium text-slate-700">Marhalah</label>
                        <select id="marhalah" value={selectedMarhalah} onChange={e => { setSelectedMarhalah(e.target.value as Marhalah | 'all'); setSelectedKelas('all');}} className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm">
                            <option value="all">Semua Marhalah</option>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                         <label htmlFor="kelas" className="block text-sm font-medium text-slate-700">Kelas</label>
                        <select id="kelas" disabled={selectedMarhalah === 'all'} value={selectedKelas} onChange={e => setSelectedKelas(e.target.value as string | 'all')} className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm disabled:bg-slate-100">
                            <option value="all">Semua Kelas</option>
                            {selectedMarhalah !== 'all' && KELAS_BY_MARHALAH[selectedMarhalah].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                     <div>
                         <label htmlFor="peran" className="block text-sm font-medium text-slate-700">Peran</label>
                        <select id="peran" value={selectedPeran} onChange={e => setSelectedPeran(e.target.value as Peran | 'all')} className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm">
                            <option value="all">Semua Peran</option>
                            {ALL_PERAN.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                         <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status Kehadiran</label>
                        <select id="status" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as AttendanceStatus | 'all')} className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm">
                            <option value="all">Semua Status</option>
                            {ALL_ATTENDANCE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="nama" className="block text-sm font-medium text-slate-700">Cari Nama</label>
                        <input type="text" id="nama" placeholder="Ketik nama..." value={searchName} onChange={e => setSearchName(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm"/>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 -mt-6 -mx-6 mb-6 p-6 border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={() => setViewMode('recap')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'recap' ? 'bg-white shadow text-secondary' : 'text-slate-600 hover:bg-white/50'}`}
                        >
                            <FileText size={18} />
                            <span>Rekapitulasi</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('class_recap')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'class_recap' ? 'bg-white shadow text-secondary' : 'text-slate-600 hover:bg-white/50'}`}
                        >
                            <Layers size={18} />
                            <span>Rekap Per Kelas</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('time_recap')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'time_recap' ? 'bg-white shadow text-secondary' : 'text-slate-600 hover:bg-white/50'}`}
                        >
                            <Clock size={18} />
                            <span>Rekap Per Waktu</span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 w-full sm:w-auto">
                        {viewMode === 'class_recap' && (
                            <button 
                                onClick={handleGenerateWAReports}
                                disabled={selectedClassKeys.length === 0 || isGenerating}
                                className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center text-sm disabled:bg-slate-400"
                            >
                                <Send size={16} className="mr-2"/> {isGenerating ? 'Memproses...' : `Buat Laporan WA (${selectedClassKeys.length})`}
                            </button>
                        )}

                        {/* Export Buttons Logic (Excel/PDF) */}
                        {viewMode === 'recap' ? (
                            <>
                                <div className="relative" ref={excelBtnRef}>
                                    <button onClick={() => setShowExcelMenu(!showExcelMenu)} className="w-full bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center justify-center text-sm">
                                        <Download size={16} className="mr-2"/> Excel <ChevronDown size={14} className="ml-1" />
                                    </button>
                                    {showExcelMenu && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-50">
                                            <button onClick={handleExportRecapExcel} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Unduh Ringkasan</button>
                                            <button onClick={handleExportDetailExcel} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Unduh Detail</button>
                                        </div>
                                    )}
                                </div>
                                <div className="relative" ref={pdfBtnRef}>
                                    <button onClick={() => setShowPdfMenu(!showPdfMenu)} className="w-full bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center justify-center text-sm">
                                        <Download size={16} className="mr-2"/> PDF <ChevronDown size={14} className="ml-1" />
                                    </button>
                                    {showPdfMenu && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-50">
                                            <button onClick={handleExportRecapPDF} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Unduh Ringkasan</button>
                                            <button onClick={handleExportDetailPDF} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Unduh Detail</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <button onClick={handleDownloadExcel} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center justify-center text-sm"><Download size={16} className="mr-2"/> Excel</button>
                                <button onClick={handleDownloadPDF} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center justify-center text-sm"><Download size={16} className="mr-2"/> PDF</button>
                            </>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[600px]">
                    {/* View: Recap */}
                    {viewMode === 'recap' && (
                        <table className="w-full text-sm text-left text-slate-500">
                            {/* ... Existing Recap Table ... */}
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3">Peran</th><th className="px-6 py-3">Marhalah</th><th className="px-6 py-3">Kelas</th>
                                    <th className="px-6 py-3">Nama</th><th className="px-6 py-3 text-center bg-red-50 text-red-700">Alpa</th>
                                    <th className="px-6 py-3 text-center bg-green-50 text-green-700">Hadir</th><th className="px-6 py-3 text-center bg-blue-50 text-blue-700">Izin</th>
                                    <th className="px-6 py-3 text-center bg-yellow-50 text-yellow-700">Sakit</th><th className="px-6 py-3 text-center bg-orange-50 text-orange-700">Terlambat</th>
                                    <th className="px-6 py-3 text-center font-bold bg-slate-100">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {(visibleData as any[]).map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-200 hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => setSelectedStudentDetail({id: item.id, nama: item.Nama, peran: item.Peran})}>
                                        <td className="px-6 py-4">{item.Peran}</td><td className="px-6 py-4">{item.Marhalah}</td><td className="px-6 py-4">{item.Kelas}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{item.Nama}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-red-600">{item.Alpa}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-green-600">{item.Hadir}</td>
                                        <td className="px-6 py-4 text-center text-blue-600">{item.Izin}</td>
                                        <td className="px-6 py-4 text-center text-yellow-600">{item.Sakit}</td>
                                        <td className="px-6 py-4 text-center text-orange-600">{item.Terlambat}</td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-900 bg-slate-50">{item.Total}</td>
                                    </tr>
                                ))}
                                {visibleData.length === 0 && <tr><td colSpan={10} className="px-6 py-8 text-center text-slate-400">Tidak ada data untuk direkap.</td></tr>}
                            </tbody>
                        </table>
                    )}

                    {/* View: Class Recap (ATTENDANCE ONLY) */}
                    {viewMode === 'class_recap' && (
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <button onClick={toggleSelectAllClasses}>
                                            {selectedClassKeys.length === classRecapData.length && classRecapData.length > 0 ? <CheckSquare size={18} className="text-secondary"/> : <Square size={18}/>}
                                        </button>
                                    </th>
                                    <th className="px-6 py-3">Marhalah</th>
                                    <th className="px-6 py-3">Kelas</th>
                                    <th className="px-6 py-3 text-center bg-green-50 text-green-700">Hadir</th>
                                    <th className="px-6 py-3 text-center bg-blue-50 text-blue-700">Izin</th>
                                    <th className="px-6 py-3 text-center bg-yellow-50 text-yellow-700">Sakit</th>
                                    <th className="px-6 py-3 text-center bg-red-50 text-red-700">Alpa</th>
                                    <th className="px-6 py-3 text-center bg-orange-50 text-orange-700">Terlambat</th>
                                    <th className="px-6 py-3 text-center font-bold bg-slate-100">Total Input</th>
                                    <th className="px-6 py-3 text-center">% Hadir</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {(visibleData as any[]).map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => toggleSelectClass(item.key)}>
                                        <td className="px-4 py-3">
                                            {selectedClassKeys.includes(item.key) ? <CheckSquare size={18} className="text-secondary"/> : <Square size={18} className="text-slate-300"/>}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{item.Marhalah}</td>
                                        <td className="px-6 py-4 font-bold">{item.Kelas}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-green-600">{item.Hadir}</td>
                                        <td className="px-6 py-4 text-center text-blue-600">{item.Izin}</td>
                                        <td className="px-6 py-4 text-center text-yellow-600">{item.Sakit}</td>
                                        <td className="px-6 py-4 text-center text-red-600">{item.Alpa}</td>
                                        <td className="px-6 py-4 text-center text-orange-600">{item.Terlambat}</td>
                                        <td className="px-6 py-4 text-center font-bold bg-slate-50">{item.Total}</td>
                                        <td className="px-6 py-4 text-center font-bold text-secondary">{item.PersenKehadiran}</td>
                                    </tr>
                                ))}
                                {visibleData.length === 0 && <tr><td colSpan={10} className="px-6 py-8 text-center text-slate-400">Tidak ada data untuk direkap.</td></tr>}
                            </tbody>
                        </table>
                    )}

                    {/* View: Time Recap */}
                    {viewMode === 'time_recap' && (
                         <table className="w-full text-sm text-left text-slate-500">
                             {/* ... Existing Time Recap Table ... */}
                             <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                                 <tr>
                                     <th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">Waktu</th>
                                     <th className="px-6 py-3 text-center bg-green-50 text-green-700">Hadir</th>
                                     <th className="px-6 py-3 text-center bg-blue-50 text-blue-700">Izin</th>
                                     <th className="px-6 py-3 text-center bg-yellow-50 text-yellow-700">Sakit</th>
                                     <th className="px-6 py-3 text-center bg-red-50 text-red-700">Alpa</th>
                                     <th className="px-6 py-3 text-center bg-orange-50 text-orange-700">Terlambat</th>
                                     <th className="px-6 py-3 text-center font-bold bg-slate-100">Total Input</th>
                                     <th className="px-6 py-3 text-right">Aksi</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-white">
                                 {(visibleData as any[]).map((item, idx) => (
                                     <tr key={idx} className="border-b border-slate-200 hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => setSelectedTimeRecap({date: item.date, waktu: item.waktu})}>
                                         <td className="px-6 py-4 font-medium text-slate-900">{item.date}</td>
                                         <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium text-xs">{item.waktu}</span></td>
                                         <td className="px-6 py-4 text-center font-semibold text-green-600">{item.Hadir}</td>
                                         <td className="px-6 py-4 text-center text-blue-600">{item.Izin}</td>
                                         <td className="px-6 py-4 text-center text-yellow-600">{item.Sakit}</td>
                                         <td className="px-6 py-4 text-center text-red-600 font-semibold">{item.Alpa}</td>
                                         <td className="px-6 py-4 text-center text-orange-600">{item.Terlambat}</td>
                                         <td className="px-6 py-4 text-center font-bold text-slate-900 bg-slate-50">{item.Total}</td>
                                         <td className="px-6 py-4 text-right">
                                             <button onClick={(e) => { e.stopPropagation(); handleDeleteTimeRecap(item.date, item.waktu); }} className="text-slate-400 hover:text-error p-1 rounded hover:bg-red-50"><Trash size={16} /></button>
                                         </td>
                                     </tr>
                                 ))}
                                 {visibleData.length === 0 && <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-400">Tidak ada data rekap per waktu.</td></tr>}
                             </tbody>
                         </table>
                    )}
                </div>

                {/* Pagination Controls ... (Same) */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl gap-4">
                    <div className="text-sm text-slate-500">
                        Menampilkan <span className="font-semibold text-slate-800">{Math.min(displayLimit, sourceData.length)}</span> dari <span className="font-semibold text-slate-800">{sourceData.length}</span> baris data.
                    </div>
                    {sourceData.length > displayLimit && (
                        <div className="flex gap-2">
                             <button onClick={() => setDisplayLimit(prev => prev + 1000)} className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"><ChevronDown size={16} className="mr-2" /> Tampilkan 1000 Berikutnya</button>
                            <button onClick={() => setDisplayLimit(sourceData.length)} className="flex items-center px-4 py-2 bg-secondary text-white text-sm font-medium rounded-lg hover:bg-accent transition-colors shadow-sm"><ChevronsDown size={16} className="mr-2" /> Tampilkan Semua</button>
                        </div>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Chart Kehadiran Per Anak */}
                <Card className="lg:col-span-2">
                     <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Grafik Kehadiran Per Anak</h3>
                        {/* Added data-html2canvas-ignore to hide menu on capture */}
                        <div className="relative" ref={chartMenuRef} data-html2canvas-ignore="true">
                            <button onClick={() => setIsChartMenuOpen(!isChartMenuOpen)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                                <MoreVertical size={20} />
                            </button>
                            {isChartMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-slate-200">
                                    <button onClick={() => { setIsChartMenuOpen(false); downloadChartAsImage(chartRef, 'Grafik_Kehadiran'); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                        <Download size={16} className="mr-2" /> Download PNG
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto pb-4">
                        <div ref={chartRef} className="bg-white p-2 rounded-lg" style={{ minWidth: chartMinWidth }}>
                            {studentAttendanceChartData.length > 0 ? <StackedBarChart data={studentAttendanceChartData} /> : <div className="h-[300px] flex items-center justify-center text-slate-400">Tidak ada data untuk ditampilkan di grafik.</div>}
                        </div>
                    </div>
                </Card>

                {/* --- Chart Rekap Per Waktu (Global) --- */}
                <Card>
                    <div className="mb-4 border-b border-slate-200 pb-2">
                        <h3 className="text-lg font-semibold text-slate-800">Rekap Kehadiran Per Waktu (Global)</h3>
                    </div>
                    {globalTimeData.length > 0 ? <StackedBarChart data={globalTimeData} /> : <div className="h-[300px] flex items-center justify-center text-slate-400">Tidak ada data.</div>}
                </Card>

                {/* --- Chart Rekap Per Kelas --- */}
                <Card>
                    <div className="mb-4 border-b border-slate-200 pb-2">
                        <h3 className="text-lg font-semibold text-slate-800">Rekap Kehadiran Per Kelas</h3>
                    </div>
                    <div className="overflow-x-auto pb-4">
                        <div style={{ minWidth: classChartMinWidth }}>
                            {classAttendanceChartData.length > 0 ? <StackedBarChart data={classAttendanceChartData} /> : <div className="h-[300px] flex items-center justify-center text-slate-400">Tidak ada data.</div>}
                        </div>
                    </div>
                </Card>
                <Card title="Proporsi Status Kehadiran">
                     <SimplePieChart data={pieChartData} />
                </Card>
            </div>

            {/* Hidden Charts Area for WA Generation (Attendance Only) */}
            <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
                {selectedClassKeys.map(classKey => {
                    // Extract marhalah and kelas from key
                    const classItem = classRecapData.find(c => c.key === classKey);
                    if (!classItem) return null;

                    // Filter Attendance Data for this class
                    const classSpecificData = recapData.filter(s => s.Marhalah === classItem.Marhalah && s.Kelas === classItem.Kelas)
                        .map(item => ({ ...item, name: item.Nama }));

                    return (
                        <div 
                            key={`chart-${classKey}`} 
                            ref={(el) => { hiddenChartRefs.current[classKey] = el; }}
                            className="bg-white p-8 w-[1000px] flex flex-col gap-8"
                        >
                            <div className="text-center border-b border-slate-200 pb-4">
                                <h3 className="text-2xl font-bold text-slate-800">LAPORAN KELAS {classItem.Kelas} ({classItem.Marhalah})</h3>
                                <p className="text-lg text-slate-500 mt-2">Periode: {dateRange.start || '...'} - {dateRange.end || '...'}</p>
                            </div>

                            {/* Attendance Chart */}
                            <div>
                                <h4 className="text-lg font-bold text-slate-600 mb-4 uppercase flex items-center"><BarChart2 size={24} className="mr-2"/> Grafik Kehadiran Siswa</h4>
                                <div className="h-[500px] w-full border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                                    {classSpecificData.length > 0 ? (
                                        <StackedBarChart data={classSpecificData} />
                                    ) : <p className="text-center text-gray-400 mt-20">Tidak ada data kehadiran</p>}
                                </div>
                            </div>
                            
                            <div className="text-right text-xs text-slate-400 italic mt-4">
                                Generated by Sistem Informasi Tahfidz
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modals (Edit, Time Detail, Student Detail, Preview) - Kept mostly same */}
            <Modal isOpen={isEditModalOpen} onClose={() => {setIsEditModalOpen(false); setEditingRecord(null);}} title="Edit Data Absensi">
                {/* ... Edit Modal Content ... */}
                {editingRecord && (
                    <div className="space-y-4">
                        <div><p className="text-sm text-slate-500 mb-2">Mengedit data untuk: <span className="font-bold text-slate-800">{editingRecord.nama}</span> ({editingRecord.kelas})</p></div>
                        <div><label className="block text-sm font-medium text-slate-700">Tanggal</label><input type="date" value={editingRecord.date} onChange={(e) => setEditingRecord({...editingRecord, date: e.target.value})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" /></div>
                        <div><label className="block text-sm font-medium text-slate-700">Waktu</label><select value={editingRecord.waktu} onChange={(e) => setEditingRecord({...editingRecord, waktu: e.target.value as Waktu})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">{ALL_WAKTU.map(w => <option key={w} value={w}>{w}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-slate-700">Status</label><select value={editingRecord.status} onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value as AttendanceStatus})} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm">{ALL_ATTENDANCE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div className="pt-4 flex justify-end space-x-2"><button onClick={() => {setIsEditModalOpen(false); setEditingRecord(null);}} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50">Batal</button><button onClick={handleUpdateSubmit} disabled={isSubmitting} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent disabled:bg-slate-400">{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button></div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!selectedTimeRecap} onClose={() => setSelectedTimeRecap(null)} title={`Detail Absensi: ${selectedTimeRecap?.date} - ${selectedTimeRecap?.waktu}`}>
                 {/* ... Time Recap Modal Content ... */}
                 <div className="overflow-x-auto max-h-[70vh]">
                     <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                            <tr><th className="px-4 py-2">Marhalah</th><th className="px-4 py-2">Kelas</th><th className="px-4 py-2 text-center bg-green-50 text-green-700">Hadir</th><th className="px-4 py-2 text-center bg-blue-50 text-blue-700">Izin</th><th className="px-4 py-2 text-center bg-yellow-50 text-yellow-700">Sakit</th><th className="px-4 py-2 text-center bg-red-50 text-red-700">Alpa</th><th className="px-4 py-2 text-center bg-orange-50 text-orange-700">Terlambat</th><th className="px-4 py-2 text-center font-bold bg-slate-100">Total</th></tr>
                        </thead>
                        <tbody className="bg-white">
                            {timeRecapClassStats.map((item, index) => (
                                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-4 py-2 font-medium text-slate-900">{item.marhalah}</td><td className="px-4 py-2">{item.kelas}</td><td className="px-4 py-2 text-center font-semibold text-green-600">{item.Hadir}</td><td className="px-4 py-2 text-center text-blue-600">{item.Izin}</td><td className="px-4 py-2 text-center text-yellow-600">{item.Sakit}</td><td className="px-4 py-2 text-center text-red-600 font-bold">{item.Alpa}</td><td className="px-4 py-2 text-center text-orange-600">{item.Terlambat}</td><td className="px-4 py-2 text-center font-bold bg-slate-50">{item.Total}</td></tr>
                            ))}
                        </tbody>
                     </table>
                </div>
                <div className="pt-4 flex justify-end"><button onClick={() => setSelectedTimeRecap(null)} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent">Tutup</button></div>
            </Modal>

            <Modal isOpen={!!selectedStudentDetail} onClose={() => setSelectedStudentDetail(null)} title={`Detail Absensi: ${selectedStudentDetail?.nama}`}>
                {/* ... Student Detail Modal Content ... */}
                <div className="overflow-x-auto max-h-[70vh]">
                    <div className="mb-4 text-sm text-slate-500"><button onClick={handleExportDetailExcel} className="text-secondary hover:underline mr-4"><Download size={14} className="inline mr-1"/> Download Excel</button></div>
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm"><tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3">Waktu</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Aksi</th></tr></thead>
                        <tbody className="bg-white">
                            {studentDetailData.map(record => (
                                <tr key={record.id} className="border-b border-slate-200 hover:bg-slate-50"><td className="px-6 py-4 whitespace-nowrap">{record.date}</td><td className="px-6 py-4">{record.waktu}</td><td className="px-6 py-4"><span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'Hadir' ? 'bg-green-100 text-green-800' : record.status === 'Izin' ? 'bg-blue-100 text-blue-800' : record.status === 'Sakit' ? 'bg-yellow-100 text-yellow-800' : record.status === 'Terlambat' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{record.status}</span></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleEditClick(record as AttendanceRecord)} className="text-secondary hover:text-blue-700 p-1 rounded hover:bg-blue-50" title="Edit"><Edit size={16} /></button><button onClick={() => handleDeleteClick(record.id)} className="text-error hover:text-red-700 p-1 rounded hover:bg-red-50" title="Hapus"><Trash size={16} /></button></div></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="pt-4 flex justify-end"><button onClick={() => setSelectedStudentDetail(null)} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent">Tutup</button></div>
            </Modal>

            {/* Preview & Send Modal */}
            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Preview Laporan WA">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
                    {Object.keys(generatedReports).length === 0 && <p className="text-center text-slate-500">Tidak ada laporan yang dipilih.</p>}
                    
                    {Object.entries(generatedReports).map(([key, data]) => {
                         // Fix: Explicitly type data to resolve 'unknown' error
                         const reportDataTyped = data as { image: string, caption: string, phone?: string };
                         
                         const item = classRecapData.find(c => c.key === key);
                         if (!item) return null;

                         return (
                            <div key={key} className="flex flex-col md:flex-row gap-4 border-b border-slate-200 pb-6 last:border-0">
                                <div className="w-full md:w-1/2 flex-shrink-0">
                                    <img src={reportDataTyped.image} alt="Chart Preview" className="w-full border border-slate-200 rounded shadow-sm" />
                                </div>
                                <div className="flex-grow space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800">{item.Kelas} ({item.Marhalah})</h3>
                                            <p className="text-sm text-slate-600">No. Wali: {reportDataTyped.phone || <span className="text-red-500">Belum Ada</span>}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCopyImage(reportDataTyped.image)} className="p-2 bg-white border border-slate-300 text-slate-600 rounded hover:bg-slate-50 text-xs flex items-center" title="Copy Gambar"><Copy size={16} className="mr-1"/> Gambar</button>
                                            <button onClick={() => handleSendWA(reportDataTyped.phone, reportDataTyped.caption)} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs flex items-center font-bold"><Send size={16} className="mr-1"/> Kirim WA</button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 p-3 rounded text-xs font-mono text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-200">{reportDataTyped.caption}</div>
                                    {!reportDataTyped.phone && (<div className="flex items-center text-xs text-red-500 bg-red-50 p-2 rounded"><AlertCircle size={14} className="mr-1"/> Nomor HP Wali Kelas tidak tersedia.</div>)}
                                </div>
                            </div>
                         );
                    })}
                </div>
                <div className="flex justify-end pt-4"><button onClick={() => setIsPreviewModalOpen(false)} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-6 rounded-lg hover:bg-slate-50">Tutup</button></div>
            </Modal>

        </div>
    );
};

export default Reports;
