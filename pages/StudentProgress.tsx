
/*
================================================================================
SCRIPT SQL UNTUK TABEL STUDENT_PROGRESS & TARGET
Pastikan Anda sudah menjalankan script 'target_settings_schema.sql' di Supabase.
================================================================================
*/

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Marhalah, ProgressType, WaliKelas } from '../types';
import { ALL_MARHALAH, KELAS_BY_MARHALAH } from '../constants';
import { Download, Upload, FileText, Search, Plus, Save, Trash2, X, TrendingUp, MoreVertical, Eye, EyeOff, Send, Copy, AlertCircle, Layout, CheckSquare, Square, BarChart2, Settings, Target } from 'lucide-react';
import { exportToExcel, exportToPDF, parseCSV } from '../lib/utils';
import { format, isValid } from 'date-fns';
import html2canvas from 'html2canvas';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';

// Modified SchemeOption to include 'All'
type SchemeOption = ProgressType | 'All';
type ViewMode = 'detail' | 'recap_class';

const LOGO_URL = "https://i.ibb.co.com/KcYyzZRz/Tanpa-judul-1080-x-1080-piksel-20260116-084021-0000.png";

// --- Internal Chart Component with Menu ---
const ComposedProgressChart: React.FC<{
    data: any[];
    dataKey: string;
    title: string;
    color: string;
    unit: string;
    targetStart?: number; // Start of target line
    targetEnd?: number;   // End of target line
    height?: number;
    showMenu?: boolean;
    fixedWidth?: boolean; // New prop to force fixed width in hidden mode
    fullWidth?: boolean; // For report template
}> = ({ data, dataKey, title, color, unit, targetStart, targetEnd, height = 250, showMenu = true, fixedWidth = false, fullWidth = false }) => {
    const [showLine, setShowLine] = useState(true);
    const [showBar, setShowBar] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDownload = async () => {
        if (chartRef.current) {
            try {
                const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
                const url = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.download = `${title.replace(/\s/g, '_')}_Chart.png`;
                link.href = url;
                link.click();
            } catch (err) {
                console.error("Error downloading chart", err);
            }
        }
        setIsMenuOpen(false);
    };

    // Interpolate Target Data
    const chartDataWithTarget = useMemo(() => {
        if (targetStart === undefined || targetEnd === undefined || data.length === 0) return data;
        
        const count = data.length;
        return data.map((item, index) => {
            // Linear Interpolation: y = start + (end - start) * (index / (count - 1))
            // If only 1 data point, use end target
            const progress = count > 1 ? index / (count - 1) : 1;
            const targetVal = targetStart + (targetEnd - targetStart) * progress;
            return { ...item, target: parseFloat(targetVal.toFixed(1)) };
        });
    }, [data, targetStart, targetEnd]);

    let containerClass = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 relative";
    if (fixedWidth) containerClass += " w-[250px]";
    else if (fullWidth) containerClass += " w-full";
    else containerClass += " min-w-[300px]";

    return (
        <div ref={chartRef} className={containerClass}>
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-bold text-slate-700 flex items-center uppercase tracking-wide">
                    <TrendingUp size={16} className="mr-2" style={{ color }} /> 
                    {title}
                </h4>
                {showMenu && (
                    <div className="relative" ref={menuRef} data-html2canvas-ignore="true">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <MoreVertical size={18} />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 top-6 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                                <button onClick={handleDownload} className="flex items-center w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700">
                                    <Download size={14} className="mr-2"/> Download Chart
                                </button>
                                <button onClick={() => { setShowLine(!showLine); setIsMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700">
                                    {showLine ? <EyeOff size={14} className="mr-2"/> : <Eye size={14} className="mr-2"/>}
                                    {showLine ? 'Sembunyikan Line' : 'Tampilkan Line'}
                                </button>
                                <button onClick={() => { setShowBar(!showBar); setIsMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700">
                                    {showBar ? <EyeOff size={14} className="mr-2"/> : <Eye size={14} className="mr-2"/>}
                                    {showBar ? 'Sembunyikan Batang' : 'Tampilkan Batang'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div style={{ height: height, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartDataWithTarget} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#64748b' }} 
                            dy={5}
                            interval={0}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#64748b' }} 
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any, name: any) => [
                                `${value} ${unit}`, 
                                name === 'target' ? 'Target' : ''
                            ]}
                            cursor={{ fill: '#f8fafc' }}
                        />
                        
                        {/* Render Target Line Interpolated */}
                        {(targetStart !== undefined && targetEnd !== undefined) && (
                             <Line 
                                type="linear"
                                dataKey="target"
                                stroke="red"
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                dot={false}
                                activeDot={false}
                                name="Target"
                             />
                        )}

                        {showBar && (
                            <Bar 
                                dataKey="value" 
                                fill={color} 
                                fillOpacity={0.2} 
                                barSize={30} 
                                radius={[4, 4, 0, 0]}
                                stroke={color}
                                strokeOpacity={0.5}
                            />
                        )}
                        {showLine && (
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={color} 
                                strokeWidth={2} 
                                dot={{ r: 3, fill: color, strokeWidth: 1, stroke: '#fff' }} 
                                activeDot={{ r: 5 }} 
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const StudentProgress: React.FC = () => {
    const { santri, studentProgress, waliKelas, classTargets, addStudentProgressBatch, deleteStudentProgressByMonth, saveClassTarget, loading } = useSupabaseData();

    // UI State
    const [viewMode, setViewMode] = useState<ViewMode>('detail');
    const [selectedScheme, setSelectedScheme] = useState<SchemeOption>('Hafalan'); 
    
    const [filterMarhalah, setFilterMarhalah] = useState<Marhalah | 'all'>('all');
    const [filterKelas, setFilterKelas] = useState<string | 'all'>('all');
    const [searchName, setSearchName] = useState('');
    
    // Manual Month Management
    const [manuallyAddedMonths, setManuallyAddedMonths] = useState<string[]>([]);
    const [isAddingMonth, setIsAddingMonth] = useState(false);
    const [newMonthValue, setNewMonthValue] = useState(format(new Date(), 'yyyy-MM'));

    // Local Matrix State for Batch Editing
    const [localMatrix, setLocalMatrix] = useState<Record<number, Record<string, string>>>({});
    const [originalMatrix, setOriginalMatrix] = useState<Record<number, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);
    
    // Report State
    const [selectedClassKeys, setSelectedClassKeys] = useState<string[]>([]);
    const [generatedReports, setGeneratedReports] = useState<Record<string, { image: string, caption: string, phone?: string }>>({});
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const settingsMenuRef = useRef<HTMLDivElement>(null);
    
    // Settings Form Data
    const [settingMarhalah, setSettingMarhalah] = useState<Marhalah>(Marhalah.Mutawassithah);
    const [settingKelas, setSettingKelas] = useState<string>(KELAS_BY_MARHALAH[Marhalah.Mutawassithah][0]);
    
    const [targetZiyadahStart, setTargetZiyadahStart] = useState('');
    const [targetZiyadahEnd, setTargetZiyadahEnd] = useState('');
    const [targetMurojaahStart, setTargetMurojaahStart] = useState('');
    const [targetMurojaahEnd, setTargetMurojaahEnd] = useState('');
    const [targetHafalanStart, setTargetHafalanStart] = useState('');
    const [targetHafalanEnd, setTargetHafalanEnd] = useState('');

    // Refs
    const hiddenReportRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Determine the actual type needed for Table Editing
    const activeTableType: ProgressType = selectedScheme === 'All' ? 'Hafalan' : selectedScheme;

    // --- 0. Settings Logic ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
                setIsSettingsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load existing targets when opening settings or changing selections in settings modal
    useEffect(() => {
        if (isSettingsOpen) {
            const exist = classTargets.find(t => t.marhalah === settingMarhalah && t.kelas === settingKelas);
            if (exist) {
                setTargetZiyadahStart(String(exist.target_ziyadah_start));
                setTargetZiyadahEnd(String(exist.target_ziyadah_end));
                setTargetMurojaahStart(String(exist.target_murojaah_start));
                setTargetMurojaahEnd(String(exist.target_murojaah_end));
                setTargetHafalanStart(String(exist.target_hafalan_start));
                setTargetHafalanEnd(String(exist.target_hafalan_end));
            } else {
                setTargetZiyadahStart(''); setTargetZiyadahEnd('');
                setTargetMurojaahStart(''); setTargetMurojaahEnd('');
                setTargetHafalanStart(''); setTargetHafalanEnd('');
            }
        }
    }, [isSettingsOpen, settingMarhalah, settingKelas, classTargets]);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await saveClassTarget({
                marhalah: settingMarhalah,
                kelas: settingKelas,
                target_ziyadah_start: parseFloat(targetZiyadahStart) || 0,
                target_ziyadah_end: parseFloat(targetZiyadahEnd) || 0,
                target_murojaah_start: parseFloat(targetMurojaahStart) || 0,
                target_murojaah_end: parseFloat(targetMurojaahEnd) || 0,
                target_hafalan_start: parseFloat(targetHafalanStart) || 0,
                target_hafalan_end: parseFloat(targetHafalanEnd) || 0,
            });
            alert("Target berhasil disimpan!");
            setIsSettingsOpen(false);
        } catch (e: any) {
            alert(`Gagal menyimpan: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Get Active Targets for Charts based on Filter
    const activeChartTargets = useMemo(() => {
        if (filterKelas !== 'all') {
            const target = classTargets.find(t => t.marhalah === filterMarhalah && t.kelas === filterKelas);
            if (target) return target;
        }
        return null;
    }, [filterMarhalah, filterKelas, classTargets]);


    // --- 1. Initialize Local Matrix when Data Changes ---
    useEffect(() => {
        const matrix: Record<number, Record<string, string>> = {};
        studentProgress.forEach(p => {
            if (p.progress_type === activeTableType) {
                if (!matrix[p.santri_id]) matrix[p.santri_id] = {};
                matrix[p.santri_id][p.month_key] = p.value;
            }
        });
        setLocalMatrix(JSON.parse(JSON.stringify(matrix)));
        setOriginalMatrix(JSON.parse(JSON.stringify(matrix)));
    }, [studentProgress, activeTableType]);

    // Reset selection when changing filters/view
    useEffect(() => {
        setSelectedClassKeys([]);
    }, [viewMode, filterMarhalah, filterKelas]);

    // Check for unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(localMatrix) !== JSON.stringify(originalMatrix);
    }, [localMatrix, originalMatrix]);

    // --- 2. Filtered & Sorted Students List ---
    const filteredSantri = useMemo(() => {
        let filtered = santri.filter(s => {
            if (filterMarhalah !== 'all' && s.marhalah !== filterMarhalah) return false;
            if (filterKelas !== 'all' && s.kelas !== filterKelas) return false;
            if (searchName && !s.nama.toLowerCase().includes(searchName.toLowerCase())) return false;
            return true;
        });

        return filtered.sort((a, b) => {
            const rankMarhalahA = ALL_MARHALAH.indexOf(a.marhalah);
            const rankMarhalahB = ALL_MARHALAH.indexOf(b.marhalah);
            if (rankMarhalahA !== rankMarhalahB) return rankMarhalahA - rankMarhalahB;

            const kelasList = KELAS_BY_MARHALAH[a.marhalah] || [];
            const rankKelasA = kelasList.indexOf(a.kelas);
            const rankKelasB = kelasList.indexOf(b.kelas);
            if (rankKelasA !== -1 && rankKelasB !== -1) return rankKelasA - rankKelasB;
            
            return a.nama.localeCompare(b.nama);
        });
    }, [santri, filterMarhalah, filterKelas, searchName]);

    // --- 3. Build Columns (Months) ---
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        studentProgress.forEach(p => {
             // In recap mode OR if "All" is selected, we want all available months
             if (viewMode === 'recap_class' || selectedScheme === 'All' || p.progress_type === activeTableType) {
                 months.add(p.month_key);
             }
        });
        if (months.size === 0) months.add(format(new Date(), 'yyyy-MM'));
        manuallyAddedMonths.forEach(m => months.add(m));
        
        // CHANGED: Sort Ascending (Oldest Left -> Newest Right)
        return Array.from(months).sort(); 
    }, [studentProgress, manuallyAddedMonths, activeTableType, viewMode, selectedScheme]);

    // --- 4. Class Recap Data Aggregation ---
    const classRecapData = useMemo(() => {
        if (viewMode !== 'recap_class') return [];

        const groups: Record<string, { key: string, marhalah: string, kelas: string, months: Record<string, { total: number, count: number }> }> = {};

        // Loop through all filtered santri to build structure
        const targetSantri = filteredSantri;

        targetSantri.forEach(s => {
            const key = `${s.marhalah}-${s.kelas}`;
            if (!groups[key]) {
                groups[key] = { key: key, marhalah: s.marhalah, kelas: s.kelas, months: {} };
            }
        });

        // Loop progress data to calculate sums
        studentProgress.forEach(p => {
            const s = santri.find(s => s.id === p.santri_id);
            if (!s) return;
            
            const key = `${s.marhalah}-${s.kelas}`;
            if (groups[key] && p.progress_type === activeTableType) {
                if (!groups[key].months[p.month_key]) groups[key].months[p.month_key] = { total: 0, count: 0 };
                
                const val = parseFloat(p.value);
                if (!isNaN(val)) {
                    groups[key].months[p.month_key].total += val;
                    groups[key].months[p.month_key].count += 1;
                }
            }
        });

        // Convert to array and sort
        return Object.values(groups).sort((a, b) => {
            const mIdxA = ALL_MARHALAH.indexOf(a.marhalah as Marhalah);
            const mIdxB = ALL_MARHALAH.indexOf(b.marhalah as Marhalah);
            if (mIdxA !== mIdxB) return mIdxA - mIdxB;
            return a.kelas.localeCompare(b.kelas);
        });

    }, [viewMode, filteredSantri, studentProgress, activeTableType, santri]);

    // --- 5. Report Chart Data Generation ---
    const getReportChartData = (marhalah: string, kelas: string) => {
        const months = availableMonths.slice(0, 12).sort(); 
        
        const getData = (type: ProgressType) => {
            return months.map(m => {
                const studentsInClass = santri.filter(s => s.marhalah === marhalah && s.kelas === kelas);
                const relevantProgress = studentProgress.filter(p => 
                    p.month_key === m && 
                    p.progress_type === type &&
                    studentsInClass.some(s => s.id === p.santri_id)
                );
                
                let avg = 0;
                if (relevantProgress.length > 0) {
                    const sum = relevantProgress.reduce((a, b) => a + parseFloat(b.value), 0);
                    avg = parseFloat((sum / relevantProgress.length).toFixed(1));
                }
                
                const [y, mon] = m.split('-');
                const monthName = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][parseInt(mon)-1];
                const label = `${monthName} ${y.slice(2)}`;

                return { name: label, value: avg };
            });
        };

        // Find Target for this specific class
        const target = classTargets.find(t => t.marhalah === marhalah && t.kelas === kelas);

        return {
            ziyadah: getData('Ziyadah'),
            murojaah: getData('Murojaah'),
            hafalan: getData('Hafalan'),
            targets: target
        };
    };

    // --- Helpers ---
    const generateChartData = (type: ProgressType) => {
        const sortedMonths = [...availableMonths].sort(); 
        return sortedMonths.map(month => {
            let total = 0;
            let count = 0;
            filteredSantri.forEach(s => {
                const entry = studentProgress.find(p => p.santri_id === s.id && p.month_key === month && p.progress_type === type);
                if (entry && entry.value) {
                    const val = parseFloat(entry.value);
                    if (!isNaN(val)) { total += val; count++; }
                }
            });
            const avg = count > 0 ? parseFloat((total / count).toFixed(2)) : 0;
            return { name: formatMonthIndo(month), value: avg };
        });
    };

    const formatMonthIndo = (yyyyMM: string) => {
        try {
            const [year, month] = yyyyMM.split('-');
            const mIndex = parseInt(month, 10) - 1;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            if (mIndex >= 0 && mIndex < 12) return `${months[mIndex]} ${year}`;
            return yyyyMM;
        } catch (e) { return yyyyMM; }
    };

    const getUnitLabel = (type: ProgressType) => {
        switch (type) {
            case 'Hafalan': return 'Juz';
            case 'Murojaah': return 'Juz';
            case 'Ziyadah': return 'Hal';
            default: return '';
        }
    };
    
    const getDescription = () => {
         if (viewMode === 'recap_class') return 'Menampilkan semua grafik rata-rata kelas.';
         switch (selectedScheme) {
            case 'All': return 'Menampilkan semua grafik. Tabel di bawah digunakan untuk menginput data Hafalan.';
            case 'Hafalan': return 'Total hafalan santri saat ini (Angka Juz).';
            case 'Murojaah': return 'Jumlah murojaah yang disetorkan bulan ini (Angka Juz).';
            case 'Ziyadah': return 'Penambahan hafalan baru bulan ini (Angka Halaman).';
            default: return '';
        }
    };

    // --- Actions ---

    const handleInputChange = (santriId: number, month: string, value: string) => {
        setLocalMatrix(prev => ({
            ...prev,
            [santriId]: {
                ...prev[santriId],
                [month]: value
            }
        }));
    };

    const handleBatchSave = async () => {
        setIsSaving(true);
        try {
            const recordsToSave: any[] = [];
            Object.keys(localMatrix).forEach(sIdStr => {
                const sId = parseInt(sIdStr);
                const monthsData = localMatrix[sId];
                Object.keys(monthsData).forEach(month => {
                    const val = monthsData[month];
                    const originalVal = originalMatrix[sId]?.[month];
                    if (val !== originalVal) {
                         recordsToSave.push({
                            santri_id: sId,
                            month_key: month,
                            progress_type: activeTableType,
                            value: val
                        });
                    }
                });
            });

            if (recordsToSave.length > 0) {
                await addStudentProgressBatch(recordsToSave);
                alert("Data berhasil disimpan!");
            } else {
                alert("Tidak ada perubahan data.");
            }
        } catch (e) {
            console.error("Failed to save progress", e);
            alert("Gagal menyimpan data.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Checkbox Logic ---
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

    // --- Report Generation (Bulk) ---
    const handleGenerateBatchReports = async () => {
        if (selectedClassKeys.length === 0) return;
        setIsGenerating(true);
        setGeneratedReports({});

        await new Promise(r => setTimeout(r, 800));

        const reports: Record<string, { image: string, caption: string, phone?: string }> = {};

        for (const classKey of selectedClassKeys) {
            const [marhalah, kelas] = classKey.split('-');
            const element = hiddenReportRefs.current[classKey];
            
            if (element) {
                try {
                    const canvas = await html2canvas(element, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        width: 600, 
                    });
                    
                    const wali = waliKelas.find(w => w.kelas === kelas && w.marhalah === marhalah);
                    const currentMonth = availableMonths[0]; // Newest month
                    
                    let caption = `*LAPORAN PERKEMBANGAN KELAS*\n`;
                    caption += `Kelas: ${kelas} (${marhalah})\n`;
                    caption += `Bulan: ${formatMonthIndo(currentMonth)}\n`;
                    caption += `--------------------------------\n\n`;
                    caption += `Berikut adalah grafik perkembangan rata-rata hafalan, murojaah, dan ziyadah santri di kelas ${kelas} selama 1 tahun terakhir.\n\n`;
                    caption += `Mohon dicek dan dievaluasi.\n`;
                    caption += `--------------------------------\n`;
                    caption += `Sistem Informasi Tahfidz`;

                    reports[classKey] = {
                        image: canvas.toDataURL('image/png'),
                        caption: caption,
                        phone: wali?.no_hp
                    };
                } catch (e) {
                    console.error(`Failed to generate report for ${classKey}`, e);
                }
            }
        }

        setGeneratedReports(reports);
        setIsGenerating(false);
        setIsPreviewModalOpen(true);
    };

    const handleSendWA = (phone: string | undefined, caption: string) => {
        if (!phone) {
            alert("Nomor Wali Kelas tidak ditemukan.");
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
           await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
           alert("Gambar disalin!");
       } catch (e) {
           alert("Browser tidak support copy gambar otomatis.");
       }
   };

    // --- Improved CSV Import ---
    const normalizeString = (str: string | undefined) => {
        return str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    };

    const parseMonthFromCSV = (rawDate: string | number): string | null => {
        if (!rawDate) return null;
        
        const str = String(rawDate).trim();
        
        // 1. Try standard YYYY-MM
        if (/^\d{4}-\d{2}$/.test(str)) return str;

        // 2. Try MM/YYYY or M/YYYY (e.g., 1/2024 or 01/2024)
        const slashParts = str.split('/');
        if (slashParts.length === 2) {
             const m = slashParts[0].padStart(2, '0');
             const y = slashParts[1].length === 2 ? `20${slashParts[1]}` : slashParts[1];
             if (!isNaN(Number(m)) && !isNaN(Number(y))) return `${y}-${m}`;
        }
        
        // 3. Try format like 1-Jan-24 or Jan-24 or 2024
        try {
            const date = new Date(str);
            if (isValid(date)) {
                return format(date, 'yyyy-MM');
            }
        } catch (e) { /* ignore */ }
        
        return null;
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
            const csvData = await parseCSV(file);
            const recordsToSave: any[] = [];
            let errorCount = 0;
            let successCount = 0;

            console.log("Raw CSV Data:", csvData); // Debug log

            csvData.forEach((row: any) => {
                // Get values with fallback keys
                const rowName = normalizeString(row.nama_santri || row.Nama || row.nama);
                const rowKelas = normalizeString(row.kelas || row.Kelas);
                const rowMarhalah = normalizeString(row.marhalah || row.Marhalah);
                const rowBulan = row.bulan || row.Bulan;
                const rowTipe = row.tipe || row.Tipe;
                const rowNilai = row.nilai || row.Nilai;

                if (!rowName || !rowBulan || !rowTipe || rowNilai === undefined) {
                    console.warn("Skipping row due to missing required fields:", row);
                    return;
                }

                // Enhanced Find Logic
                const s = santri.find(p => {
                    const dbName = normalizeString(p.nama);
                    
                    // 1. Exact Name Match
                    if (dbName === rowName) {
                        // If CSV provides class/marhalah, verify them. If not, assume strict name match is enough.
                        const classMatch = rowKelas ? normalizeString(p.kelas) === rowKelas : true;
                        const marhalahMatch = rowMarhalah ? normalizeString(p.marhalah) === rowMarhalah : true;
                        return classMatch && marhalahMatch;
                    }
                    return false;
                });

                const parsedMonth = parseMonthFromCSV(rowBulan);

                if (s && parsedMonth) {
                    recordsToSave.push({ 
                        santri_id: s.id, 
                        month_key: parsedMonth, 
                        progress_type: rowTipe, 
                        value: String(rowNilai) 
                    });
                    successCount++;
                } else {
                    console.warn(`Could not find santri or parse date for row: ${rowName}, Bulan: ${rowBulan}, Parsed: ${parsedMonth}`);
                    errorCount++;
                }
            });

            if (recordsToSave.length > 0) { 
                await addStudentProgressBatch(recordsToSave); 
                alert(`Berhasil mengimport ${successCount} data. Gagal/Dilewati: ${errorCount}`); 
            } else {
                alert(`Tidak ada data valid yang ditemukan (${errorCount} baris dilewati). \n\nTips:\n1. Pastikan nama santri sama persis.\n2. Format tanggal bulan bisa 'YYYY-MM' atau '1/2024'.\n3. Kolom wajib: nama, bulan, tipe, nilai.`);
            }

        } catch (e: any) { 
            console.error("Import Error:", e);
            alert(`Gagal import: ${e.message}`); 
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDownloadTemplate = () => {
        const link = document.createElement("a");
        // Update template to include Kelas and Marhalah
        const content = "nama_santri,kelas,marhalah,bulan,tipe,nilai\nAhmad,1A,Mutawassithah,2024-01,Hafalan,30\n";
        link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + content));
        link.setAttribute("download", "template_progress_update.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleExportExcel = () => {
        const data = filteredSantri.map(s => {
            const row: any = { No: s.id, Nama: s.nama, Kelas: s.kelas, Marhalah: s.marhalah };
            availableMonths.forEach(m => { row[m] = localMatrix[s.id]?.[m] || '-'; });
            return row;
        });
        exportToExcel(data, `Perkembangan_${activeTableType}`);
    };
    const handleExportPDF = () => {
        const columns = ['No', 'Nama', 'Kelas', ...availableMonths.slice(0, 5)]; 
        const rows = filteredSantri.map((s, idx) => [idx + 1, s.nama, s.kelas, ...availableMonths.slice(0, 5).map(m => localMatrix[s.id]?.[m] || '-')]);
        exportToPDF(`Laporan ${activeTableType}`, columns, rows, `Laporan_${activeTableType}`);
    };
    const handleAddMonth = () => { if (!availableMonths.includes(newMonthValue)) setManuallyAddedMonths(prev => [...prev, newMonthValue]); setIsAddingMonth(false); };
    const handleDeleteMonth = async (month: string) => { if (confirm(`Hapus data bulan ${month}?`)) { await deleteStudentProgressByMonth(month, activeTableType); } };


    if (loading) return <p>Loading...</p>;

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-start mb-4 -mt-2">
                    <h3 className="text-lg font-bold text-slate-800">Filter & Kontrol</h3>
                    <div className="relative" ref={settingsMenuRef}>
                        <button 
                            onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-500 hover:text-secondary transition-colors"
                        >
                            <MoreVertical size={20} />
                        </button>
                        {isSettingsMenuOpen && (
                            <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={() => { setIsSettingsOpen(true); setIsSettingsMenuOpen(false); }} 
                                    className="flex items-center w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-700"
                                >
                                    <Settings size={16} className="mr-2"/> Atur Target Kelas
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mode Tampilan</label>
                        <select 
                            value={viewMode} 
                            onChange={(e) => setViewMode(e.target.value as ViewMode)} 
                            className="block w-full text-sm border-slate-300 rounded-md focus:ring-secondary focus:border-secondary font-bold text-slate-800 bg-slate-50"
                        >
                            <option value="detail">Detail Santri</option>
                            <option value="recap_class">Rekap Per Kelas</option>
                        </select>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Skema Data (Tabel)</label>
                        <select 
                            value={selectedScheme} 
                            onChange={e => setSelectedScheme(e.target.value as SchemeOption)} 
                            className="block w-full text-sm border-slate-300 rounded-md focus:ring-secondary focus:border-secondary font-semibold text-slate-800 bg-slate-50"
                        >
                            <option value="All">Semua Skema (Semua Grafik)</option>
                            <option value="Hafalan">Jumlah Hafalan</option>
                            <option value="Murojaah">Jumlah Murojaah</option>
                            <option value="Ziyadah">Jumlah Ziyadah</option>
                        </select>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Filter Marhalah</label>
                        <select value={filterMarhalah} onChange={e => { setFilterMarhalah(e.target.value as Marhalah | 'all'); setFilterKelas('all'); }} className="block w-full text-sm border-slate-300 rounded-md focus:ring-secondary focus:border-secondary">
                            <option value="all">Semua Marhalah</option>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    {/* New Class Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Filter Kelas</label>
                        <select 
                            value={filterKelas} 
                            onChange={e => setFilterKelas(e.target.value as string | 'all')} 
                            disabled={filterMarhalah === 'all'}
                            className="block w-full text-sm border-slate-300 rounded-md focus:ring-secondary focus:border-secondary disabled:bg-slate-100"
                        >
                            <option value="all">Semua Kelas</option>
                            {filterMarhalah !== 'all' && KELAS_BY_MARHALAH[filterMarhalah].map(k => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cari {viewMode === 'detail' ? 'Santri' : 'Kelas'}</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder={viewMode === 'detail' ? "Cari santri..." : "Cari kelas..."} className="pl-10 block w-full text-sm border-slate-300 rounded-md focus:ring-secondary focus:border-secondary" />
                        </div>
                    </div>
                </div>

                {viewMode === 'detail' && (
                    <div className="flex flex-col md:flex-row justify-between items-center border-t border-slate-100 pt-4 gap-4">
                         <div className="flex flex-wrap gap-2 w-full md:w-auto">
                             <input type="file" ref={fileInputRef} onChange={handleCSVImport} accept=".csv" className="hidden" />
                             <button onClick={handleDownloadTemplate} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center text-sm shadow-sm h-10">
                                 <FileText size={16} className="mr-2" /> Template
                             </button>
                             <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center text-sm shadow-sm h-10">
                                 <Upload size={16} className="mr-2" /> Import
                             </button>
                         </div>
                         <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                             <button onClick={handleExportExcel} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm shadow-sm h-10">
                                 <Download size={16} className="mr-2" /> Excel
                             </button>
                             <button onClick={handleExportPDF} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center text-sm shadow-sm h-10">
                                 <Download size={16} className="mr-2" /> PDF
                             </button>
                         </div>
                    </div>
                )}
            </Card>

            {/* CHART SECTION */}
            {/* Logic: Show chart if Recap, OR if "All" is selected, OR if the specific scheme matches */}
            <div className="flex flex-wrap gap-6">
                {(viewMode === 'recap_class' || selectedScheme === 'All' || selectedScheme === 'Hafalan') && (
                    <ComposedProgressChart 
                        data={generateChartData('Hafalan')} 
                        dataKey="value" title="Rata-rata Hafalan (Semua)" color="#10B981" unit="Juz"
                        targetStart={activeChartTargets?.target_hafalan_start}
                        targetEnd={activeChartTargets?.target_hafalan_end}
                    />
                )}
                {(viewMode === 'recap_class' || selectedScheme === 'All' || selectedScheme === 'Murojaah') && (
                    <ComposedProgressChart 
                        data={generateChartData('Murojaah')} 
                        dataKey="value" title="Rata-rata Murojaah (Semua)" color="#F59E0B" unit="Juz"
                        targetStart={activeChartTargets?.target_murojaah_start}
                        targetEnd={activeChartTargets?.target_murojaah_end}
                    />
                )}
                {(viewMode === 'recap_class' || selectedScheme === 'All' || selectedScheme === 'Ziyadah') && (
                    <ComposedProgressChart 
                        data={generateChartData('Ziyadah')} 
                        dataKey="value" title="Rata-rata Ziyadah (Semua)" color="#3B82F6" unit="Hal"
                        targetStart={activeChartTargets?.target_ziyadah_start}
                        targetEnd={activeChartTargets?.target_ziyadah_end}
                    />
                )}
            </div>

            <Card>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {viewMode === 'detail' ? `Input Data: ${activeTableType}` : `Rekap Rata-Rata Kelas: ${activeTableType}`}
                        </h3>
                        <p className="text-xs text-slate-500 italic mt-1">{getDescription()}</p>
                    </div>
                    
                    {viewMode === 'detail' && (
                        <button 
                            onClick={handleBatchSave}
                            disabled={!hasUnsavedChanges || isSaving}
                            className={`flex items-center px-6 py-2.5 rounded-lg font-bold shadow-md transition-all
                                ${hasUnsavedChanges 
                                    ? 'bg-secondary text-white hover:bg-accent hover:scale-105' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                            `}
                        >
                            <Save size={18} className="mr-2" />
                            {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                        </button>
                    )}

                    {viewMode === 'recap_class' && (
                        <button 
                            onClick={handleGenerateBatchReports}
                            disabled={selectedClassKeys.length === 0 || isGenerating}
                            className="bg-green-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm shadow-md disabled:bg-slate-400"
                        >
                            <Send size={18} className="mr-2" /> 
                            {isGenerating ? 'Memproses...' : `Buat Laporan WA (${selectedClassKeys.length})`}
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                {viewMode === 'recap_class' ? (
                                    <th className="px-4 py-3 sticky left-0 bg-slate-50 z-20 w-12 border-b border-r border-slate-200">
                                        <button onClick={toggleSelectAllClasses}>
                                            {selectedClassKeys.length > 0 && selectedClassKeys.length === classRecapData.length ? <CheckSquare size={18} className="text-secondary"/> : <Square size={18}/>}
                                        </button>
                                    </th>
                                ) : (
                                    <th className="px-4 py-3 sticky left-0 bg-slate-50 z-20 w-12 border-b border-r border-slate-200">No</th>
                                )}
                                
                                {viewMode === 'detail' ? (
                                    <th className="px-4 py-3 sticky left-12 bg-slate-50 z-20 min-w-[200px] border-b border-r border-slate-200">Nama Santri</th>
                                ) : (
                                    <th className="px-4 py-3 sticky left-12 bg-slate-50 z-20 min-w-[150px] border-b border-r border-slate-200">Kelas (Marhalah)</th>
                                )}
                                
                                {viewMode === 'detail' && <th className="px-4 py-3 border-b border-slate-200">Kelas</th>}
                                {viewMode === 'detail' && <th className="px-4 py-3 border-b border-slate-200">Marhalah</th>}
                                
                                {availableMonths.map(month => (
                                    <th key={month} className="px-2 py-3 min-w-[100px] text-center border-l border-b border-slate-200 bg-slate-50 group relative">
                                        <div className="flex flex-col items-center justify-center">
                                            <span>{formatMonthIndo(month)}</span>
                                            <span className="text-[10px] text-slate-400 font-normal lowercase">({getUnitLabel(activeTableType)})</span>
                                        </div>
                                        {viewMode === 'detail' && (
                                            <button onClick={() => handleDeleteMonth(month)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </th>
                                ))}
                                
                                {viewMode === 'detail' && (
                                    <th className="px-2 py-3 min-w-[60px] text-center border-l border-b border-slate-200 bg-slate-50 relative">
                                         {/* Add Month Button */}
                                         {isAddingMonth ? (
                                            <div className="absolute top-0 right-0 mt-8 mr-2 w-56 bg-white p-3 shadow-xl border border-slate-200 rounded-lg z-50 flex flex-col gap-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-700">Pilih Bulan</span>
                                                    <button onClick={() => setIsAddingMonth(false)}><X size={14} className="text-slate-400"/></button>
                                                </div>
                                                <input type="month" className="text-sm border border-slate-300 rounded px-2 py-1 w-full" value={newMonthValue} onChange={e => setNewMonthValue(e.target.value)} />
                                                <button onClick={handleAddMonth} className="w-full text-xs font-bold py-1.5 bg-secondary text-white rounded hover:bg-accent">+ Tambahkan</button>
                                            </div>
                                         ) : (
                                            <button onClick={() => setIsAddingMonth(true)} className="w-full h-full flex items-center justify-center p-2 hover:bg-slate-200 text-secondary transition-colors"><Plus size={20} /></button>
                                         )}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {viewMode === 'detail' ? (
                                filteredSantri.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50 group">
                                        <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 font-medium text-slate-900 border-r border-slate-100">{idx + 1}</td>
                                        <td className="px-4 py-3 sticky left-12 bg-white group-hover:bg-slate-50 z-10 font-medium text-slate-900 border-r border-slate-100">{s.nama}</td>
                                        <td className="px-4 py-3">{s.kelas}</td>
                                        <td className="px-4 py-3">{s.marhalah}</td>
                                        {availableMonths.map(month => (
                                            <td key={month} className="px-2 py-1 text-center border-l border-slate-100">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="w-full text-center border-0 bg-transparent py-2 focus:ring-2 focus:ring-inset focus:ring-secondary rounded-md text-sm text-slate-700 placeholder-slate-300"
                                                    placeholder="0"
                                                    value={localMatrix[s.id]?.[month] || ''}
                                                    onChange={(e) => handleInputChange(s.id, month, e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                                />
                                            </td>
                                        ))}
                                        <td className="px-2 py-1 border-l border-slate-100 bg-slate-50"></td>
                                    </tr>
                                ))
                            ) : (
                                classRecapData.map((cls, idx) => (
                                    <tr key={cls.key} className="hover:bg-slate-50 cursor-pointer" onClick={() => toggleSelectClass(cls.key)}>
                                        <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 text-center">
                                            {selectedClassKeys.includes(cls.key) ? <CheckSquare size={18} className="text-secondary inline"/> : <Square size={18} className="text-slate-300 inline"/>}
                                        </td>
                                        <td className="px-4 py-3 sticky left-12 bg-white group-hover:bg-slate-50 z-10 font-bold text-slate-800 border-r border-slate-100">
                                            {cls.kelas} <span className="text-xs font-normal text-slate-500">({cls.marhalah})</span>
                                        </td>
                                        {availableMonths.map(month => {
                                            const data = cls.months[month];
                                            const avg = data && data.count > 0 ? (data.total / data.count).toFixed(1) : '-';
                                            return (
                                                <td key={month} className="px-2 py-3 text-center border-l border-slate-100 text-sm font-mono text-slate-700">
                                                    {avg}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                            
                            {((viewMode === 'detail' && filteredSantri.length === 0) || (viewMode === 'recap_class' && classRecapData.length === 0)) && (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                                        <p>Tidak ada data yang ditampilkan.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Hidden Report Templates (Batch Rendering for Stability) */}
            <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
                {selectedClassKeys.map(classKey => {
                    const [marhalah, kelas] = classKey.split('-');
                    const data = getReportChartData(marhalah, kelas);
                    
                    return (
                        <div 
                            key={`report-${classKey}`}
                            ref={(el) => { hiddenReportRefs.current[classKey] = el; }}
                            className="bg-white p-8 w-[600px] flex flex-col gap-6 mb-10" 
                            style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                            <div className="text-center border-b-2 border-slate-800 pb-4 mb-2">
                                <h1 className="text-xl font-black text-slate-800 uppercase">GRAFIK PERKEMBANGAN 1 TAHUN TERAKHIR</h1>
                                <h2 className="text-lg font-bold text-slate-600 mt-1">{kelas} ({marhalah})</h2>
                            </div>

                            {/* Charts Grid - Vertical Layout */}
                            <div className="flex flex-col gap-6">
                                <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col">
                                    <p className="text-center font-bold text-xs text-blue-600 mb-2 uppercase">Rata-rata Ziyadah</p>
                                    <ComposedProgressChart data={data.ziyadah} dataKey="value" title="" color="#3B82F6" unit="Hal" height={180} showMenu={false} fullWidth={true} targetStart={data.targets?.target_ziyadah_start} targetEnd={data.targets?.target_ziyadah_end} />
                                </div>
                                <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col">
                                    <p className="text-center font-bold text-xs text-orange-500 mb-2 uppercase">Rata-rata Murojaah</p>
                                    <ComposedProgressChart data={data.murojaah} dataKey="value" title="" color="#F59E0B" unit="Juz" height={180} showMenu={false} fullWidth={true} targetStart={data.targets?.target_murojaah_start} targetEnd={data.targets?.target_murojaah_end} />
                                </div>
                                <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col">
                                    <p className="text-center font-bold text-xs text-green-600 mb-2 uppercase">Rata-rata Hafalan</p>
                                    <ComposedProgressChart data={data.hafalan} dataKey="value" title="" color="#10B981" unit="Juz" height={180} showMenu={false} fullWidth={true} targetStart={data.targets?.target_hafalan_start} targetEnd={data.targets?.target_hafalan_end} />
                                </div>
                            </div>

                            <div className="text-center text-[10px] text-slate-400 italic pt-4 border-t border-slate-100">
                                Digenerate otomatis oleh Sistem Informasi Tahfidz • {format(new Date(), 'dd MMM yyyy HH:mm')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Settings Modal */}
            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Pengaturan Target Kelas">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Atur target pencapaian untuk setiap kelas. Garis target akan muncul di grafik secara bertahap dari bulan pertama ke bulan terakhir.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Marhalah</label>
                            <select 
                                value={settingMarhalah} 
                                onChange={e => { setSettingMarhalah(e.target.value as Marhalah); setSettingKelas(KELAS_BY_MARHALAH[e.target.value as Marhalah][0]); }} 
                                className="block w-full text-sm border-slate-300 rounded-md focus:ring-secondary focus:border-secondary"
                            >
                                {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kelas</label>
                            <select 
                                value={settingKelas} 
                                onChange={e => setSettingKelas(e.target.value)} 
                                className="block w-full text-sm border-slate-300 rounded-md focus:ring-secondary focus:border-secondary"
                            >
                                {KELAS_BY_MARHALAH[settingMarhalah].map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 mt-2">
                        <div className="space-y-4">
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Target Ziyadah (Halaman)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-slate-500">Awal (Bln 1)</label>
                                        <input type="number" step="0.1" value={targetZiyadahStart} onChange={e => setTargetZiyadahStart(e.target.value)} className="w-full text-sm border-slate-300 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500">Akhir (Bln 12)</label>
                                        <input type="number" step="0.1" value={targetZiyadahEnd} onChange={e => setTargetZiyadahEnd(e.target.value)} className="w-full text-sm border-slate-300 rounded"/>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <h4 className="text-xs font-bold text-orange-700 uppercase mb-2">Target Murojaah (Juz)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-slate-500">Awal (Bln 1)</label>
                                        <input type="number" step="0.1" value={targetMurojaahStart} onChange={e => setTargetMurojaahStart(e.target.value)} className="w-full text-sm border-slate-300 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500">Akhir (Bln 12)</label>
                                        <input type="number" step="0.1" value={targetMurojaahEnd} onChange={e => setTargetMurojaahEnd(e.target.value)} className="w-full text-sm border-slate-300 rounded"/>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                <h4 className="text-xs font-bold text-green-700 uppercase mb-2">Target Hafalan (Juz)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-slate-500">Awal (Bln 1)</label>
                                        <input type="number" step="0.1" value={targetHafalanStart} onChange={e => setTargetHafalanStart(e.target.value)} className="w-full text-sm border-slate-300 rounded"/>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-500">Akhir (Bln 12)</label>
                                        <input type="number" step="0.1" value={targetHafalanEnd} onChange={e => setTargetHafalanEnd(e.target.value)} className="w-full text-sm border-slate-300 rounded"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button onClick={() => setIsSettingsOpen(false)} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">Batal</button>
                        <button onClick={handleSaveSettings} disabled={isSaving} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors disabled:bg-slate-400">
                            {isSaving ? 'Menyimpan...' : 'Simpan Target'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Preview Laporan Massal">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
                    {Object.entries(generatedReports).map(([key, data]) => {
                         // Fix: Explicitly type data to resolve 'unknown' error
                         const reportDataTyped = data as { image: string, caption: string, phone?: string };
                         
                         const [marhalah, kelas] = key.split('-');
                         return (
                            <div key={key} className="border-b border-slate-200 pb-6 mb-6 last:border-0 last:mb-0">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-lg text-slate-800">{kelas} ({marhalah})</h3>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleCopyImage(reportDataTyped.image)} 
                                            className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-bold flex items-center hover:bg-slate-50"
                                        >
                                            <Copy size={14} className="mr-1"/> Gambar
                                        </button>
                                        <button 
                                            onClick={() => handleSendWA(reportDataTyped.phone, reportDataTyped.caption)} 
                                            className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center hover:bg-green-700"
                                        >
                                            <Send size={14} className="mr-1"/> Kirim WA
                                        </button>
                                    </div>
                                </div>
                                <div className="border rounded-lg overflow-hidden shadow-sm mb-3">
                                    <img src={reportDataTyped.image} alt="Report Preview" className="w-full h-auto" />
                                </div>
                                <div className="bg-slate-100 p-3 rounded text-xs font-mono text-slate-600 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                    {reportDataTyped.caption}
                                </div>
                                {!reportDataTyped.phone && (
                                    <div className="flex items-center text-xs text-red-500 bg-red-50 p-2 rounded mt-2">
                                        <AlertCircle size={14} className="mr-1"/> Nomor HP Wali Kelas tidak tersedia.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="pt-4 flex justify-end">
                    <button onClick={() => setIsPreviewModalOpen(false)} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-6 rounded-lg hover:bg-slate-50">Tutup</button>
                </div>
            </Modal>
        </div>
    );
};

export default StudentProgress;
