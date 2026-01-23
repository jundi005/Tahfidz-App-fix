
import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { AttendanceStatus, Marhalah, HalaqahType, Waktu, Peran } from '../types';
import type { Halaqah as HalaqahData, Person } from '../types';
import { ALL_MARHALAH, ALL_WAKTU, ALL_HALAQAH_TYPE } from '../constants';
import { format } from 'date-fns';

const AttendanceRow: React.FC<{
    person: Person;
    role: Peran; // Explicitly pass role to prevent ambiguity
    halaqahId: number;
    status: AttendanceStatus;
    onStatusChange: (personId: number, role: Peran, halaqahId: number, status: AttendanceStatus) => void;
}> = React.memo(({ person, role, halaqahId, status, onStatusChange }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg space-y-2 sm:space-y-0">
        <div className="flex items-center">
            <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${role === Peran.Musammi ? 'bg-indigo-600 text-white' : 'bg-secondary text-white'}`}>
                {person.nama.charAt(0)}
            </div>
            <div className="ml-3">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{person.nama}</p>
                    {person.kode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono">
                            {person.kode}
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-500">{person.marhalah} - {person.kelas} ({role})</p>
            </div>
        </div>
        <select
            value={status}
            onChange={(e) => onStatusChange(person.id, role, halaqahId, e.target.value as AttendanceStatus)}
            className="block w-full sm:w-36 pl-3 pr-8 py-2 text-sm border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm"
        >
            {Object.values(AttendanceStatus).map(s => (
                <option key={s} value={s}>{s}</option>
            ))}
        </select>
    </div>
));

const HalaqahCard: React.FC<{
    halaqah: HalaqahData;
    attendanceData: Record<string, { status: AttendanceStatus; halaqahId: number }>;
    onStatusChange: (personId: number, role: Peran, halaqahId: number, status: AttendanceStatus) => void;
}> = React.memo(({ halaqah, attendanceData, onStatusChange }) => {
    
    // Helper to generate composite key
    const getKey = (id: number, role: Peran) => `${role}_${id}`;

    return (
        <Card>
            <div className="border-b border-slate-200 -mt-6 -mx-6 px-6 pb-4 mb-4">
                <h3 className="text-lg font-bold text-slate-800">{halaqah.nama}</h3>
                <p className="text-sm text-slate-500">{halaqah.marhalah} - {halaqah.jenis}</p>
            </div>
            <div className="space-y-2">
                <div>
                    <p className="text-xs uppercase text-slate-500 font-semibold mb-2 px-2.5">Musammi'</p>
                    <AttendanceRow
                        person={halaqah.musammi}
                        role={Peran.Musammi}
                        halaqahId={halaqah.id}
                        status={attendanceData[getKey(halaqah.musammi.id, Peran.Musammi)]?.status || AttendanceStatus.Hadir}
                        onStatusChange={onStatusChange}
                    />
                </div>
                <div className="pt-2">
                    <p className="text-xs uppercase text-slate-500 font-semibold mt-4 mb-2 px-2.5">Santri ({halaqah.santri.length})</p>
                    <div className="space-y-1">
                        {halaqah.santri.map(s => (
                            <AttendanceRow
                                key={s.id}
                                person={s}
                                role={Peran.Santri}
                                halaqahId={halaqah.id}
                                status={attendanceData[getKey(s.id, Peran.Santri)]?.status || AttendanceStatus.Hadir}
                                onStatusChange={onStatusChange}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
});


const Attendance: React.FC = () => {
    const { halaqah, addAttendanceRecords, loading, error } = useSupabaseData();
    // FIX: Using string key (Composite key: "Role_ID") to prevent collision between Musammi ID 1 and Santri ID 1
    const [attendanceData, setAttendanceData] = useState<Record<string, {status: AttendanceStatus, halaqahId: number}>>({});
    const [isSaving, setIsSaving] = useState(false);
    
    // Filters
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedMarhalah, setSelectedMarhalah] = useState<Marhalah | 'all'>('all');
    const [selectedType, setSelectedType] = useState<HalaqahType | 'all'>('all');
    const [selectedWaktu, setSelectedWaktu] = useState<Waktu | 'all'>('all');

    // Calculate dynamic available types based on data + defaults
    const availableTypes = useMemo(() => {
        const types = new Set<string>(ALL_HALAQAH_TYPE);
        if (halaqah && halaqah.length > 0) {
            halaqah.forEach(h => {
                if (h.jenis) types.add(h.jenis);
            });
        }
        return Array.from(types).sort();
    }, [halaqah]);

    const filteredHalaqah = useMemo(() => {
        return halaqah
            .filter(h => {
                if (selectedMarhalah !== 'all' && h.marhalah !== selectedMarhalah) return false;
                if (selectedType !== 'all' && h.jenis !== selectedType) return false;
                if (selectedWaktu !== 'all' && !h.waktu.includes(selectedWaktu)) return false;
                return true;
            })
            .sort((a, b) => a.nama.localeCompare(b.nama));
    }, [halaqah, selectedMarhalah, selectedType, selectedWaktu]);
    
    const handleStatusChange = (personId: number, role: Peran, halaqahId: number, status: AttendanceStatus) => {
        // Use composite key to ensure uniqueness
        const key = `${role}_${personId}`;
        setAttendanceData(prev => ({ ...prev, [key]: { status, halaqahId } }));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        
        const allPeopleToRecord: { person: Person; role: Peran; halaqahId: number }[] = [];
        filteredHalaqah.forEach(h => {
            allPeopleToRecord.push({ person: h.musammi, role: Peran.Musammi, halaqahId: h.id });
            h.santri.forEach(s => {
                allPeopleToRecord.push({ person: s, role: Peran.Santri, halaqahId: h.id });
            });
        });

        const recordsToSave = allPeopleToRecord.map(({ person, role, halaqahId }) => {
            // Retrieve status using composite key
            const key = `${role}_${person.id}`;
            const status = attendanceData[key]?.status || AttendanceStatus.Hadir;

            return {
                date: selectedDate,
                waktu: selectedWaktu as Waktu,
                personId: person.id,
                peran: role,
                status: status,
                halaqahId: halaqahId
            }
        });

        if (recordsToSave.length === 0) {
            alert('Tidak ada data absensi untuk disimpan.');
            setIsSaving(false);
            return;
        }

        if (selectedWaktu === 'all') {
            alert('Silakan pilih waktu absensi yang spesifik.');
            setIsSaving(false);
            return;
        }

        try {
            await addAttendanceRecords(recordsToSave);
            alert('Absensi berhasil disimpan!');
            setAttendanceData({});
        } catch(e: any) {
            console.error("Failed to save attendance:", e);
            alert(`Gagal menyimpan absensi: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <p>Loading Halaqah data...</p>;
    if (error) return <p className="text-error">Error: {error}</p>;

    return (
        <div className="space-y-6">
            <Card title="Filter Absensi">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700">Tanggal</label>
                        <input type="date" id="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 block w-full text-sm border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm" />
                    </div>
                     <div>
                        <label htmlFor="marhalah" className="block text-sm font-medium text-slate-700">Marhalah</label>
                        <select id="marhalah" value={selectedMarhalah} onChange={e => setSelectedMarhalah(e.target.value as Marhalah | 'all')} className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm">
                            <option value="all">Semua</option>
                            {ALL_MARHALAH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-slate-700">Jenis Halaqah</label>
                        <select id="type" value={selectedType} onChange={e => setSelectedType(e.target.value as HalaqahType | 'all')} className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm">
                            <option value="all">Semua</option>
                            {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="waktu" className="block text-sm font-medium text-slate-700">Waktu</label>
                        <select id="waktu" value={selectedWaktu} onChange={e => setSelectedWaktu(e.target.value as Waktu | 'all')} className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-secondary focus:border-secondary rounded-md shadow-sm">
                            <option value="all">Semua</option>
                            {ALL_WAKTU.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-center md:justify-end">
                    <button onClick={handleSaveAll} disabled={isSaving} className="w-full md:w-auto bg-secondary text-white font-bold py-2.5 px-6 rounded-lg hover:bg-accent transition-colors disabled:bg-slate-400 shadow-sm">
                        {isSaving ? 'Menyimpan...' : 'Simpan Semua Absensi'}
                    </button>
                </div>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredHalaqah.map(h => 
                    <HalaqahCard 
                        key={h.id} 
                        halaqah={h} 
                        attendanceData={attendanceData} 
                        onStatusChange={handleStatusChange} 
                    />
                )}
                 {filteredHalaqah.length === 0 && (
                    <div className="text-center py-8 text-slate-500 xl:col-span-2">
                        Tidak ada data halaqah yang sesuai dengan filter.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Attendance;
