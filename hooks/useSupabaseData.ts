
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Santri, Musammi, Halaqah, AttendanceRecord, HalaqahType, Waktu, StudentProgress, ProgressType, WaliKelas, ClassTarget, StudentEvaluation, EvaluationSetting } from '../types';
import { Marhalah, Peran, AttendanceStatus } from '../types';

export const useSupabaseData = () => {
    const [santri, setSantri] = useState<Santri[]>([]);
    const [musammi, setMusammi] = useState<Musammi[]>([]);
    const [waliKelas, setWaliKelas] = useState<WaliKelas[]>([]);
    const [halaqah, setHalaqah] = useState<Halaqah[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
    const [classTargets, setClassTargets] = useState<ClassTarget[]>([]);
    const [studentEvaluations, setStudentEvaluations] = useState<StudentEvaluation[]>([]);
    const [evaluationSettings, setEvaluationSettings] = useState<EvaluationSetting[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Store Org ID to avoid repeated fetching
    const orgIdRef = useRef<string | null>(null);

    // Helper: Get Current User's Organization ID
    const getOrgId = async (): Promise<string> => {
        if (orgIdRef.current) return orgIdRef.current;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.organization_id) {
            throw new Error("User does not have an organization assigned.");
        }

        orgIdRef.current = profile.organization_id;
        return profile.organization_id;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Core Data (Parallel)
            const [
                { data: santriData, error: santriError },
                { data: musammiData, error: musammiError },
                { data: waliKelasData, error: waliKelasError },
                { data: halaqahData, error: halaqahError },
                { data: attendanceData, error: attendanceError },
                { data: halaqahSantriData, error: halaqahSantriError },
                { data: progressData, error: progressError },
                { data: evaluationData, error: evalError },
                { data: settingsData, error: settingsError }
            ] = await Promise.all([
                supabase.from('santri').select('*').order('nama', { ascending: true }),
                supabase.from('musammi').select('*').order('nama', { ascending: true }),
                supabase.from('wali_kelas').select('*').order('kelas', { ascending: true }),
                supabase.from('halaqah').select('*').order('no_urut', { ascending: true }),
                supabase.from('attendance').select('*'),
                supabase.from('halaqah_santri').select('*'),
                supabase.from('student_progress').select('*'),
                supabase.from('student_evaluation').select('*'),
                supabase.from('evaluation_settings').select('*').order('score', { ascending: false })
            ]);

            if (santriError) throw santriError;
            if (musammiError) throw musammiError;
            if (halaqahError) throw halaqahError;
            if (attendanceError) throw attendanceError;
            if (halaqahSantriError) throw halaqahSantriError;
            
            // Allow progressError/evalError to be ignored if table missing, else log it
            if (progressError && progressError.code !== '42P01') console.error("Error fetching progress:", progressError);
            if (evalError && evalError.code !== '42P01') console.error("Error fetching evaluations:", evalError);
            if (settingsError && settingsError.code !== '42P01') console.error("Error fetching settings:", settingsError);

            // 2. Fetch Class Targets
            let targetsList: ClassTarget[] = [];
            try {
                const { data: targetsData, error: targetsError } = await supabase.from('class_targets').select('*');
                if (!targetsError && targetsData) {
                    targetsList = targetsData.map((t: any) => ({
                        id: t.id,
                        marhalah: t.marhalah as Marhalah,
                        kelas: t.kelas,
                        target_ziyadah_start: t.target_ziyadah_start,
                        target_ziyadah_end: t.target_ziyadah_end,
                        target_murojaah_start: t.target_murojaah_start,
                        target_murojaah_end: t.target_murojaah_end,
                        target_hafalan_start: t.target_hafalan_start,
                        target_hafalan_end: t.target_hafalan_end
                    }));
                }
            } catch (e) {
                console.warn("Class targets table might be missing or error", e);
            }

            // 3. Process Data
            const santriList: Santri[] = (santriData || []).map(s => ({ 
                ...s, 
                marhalah: s.marhalah as Marhalah,
                nama_wali: s.nama_wali || undefined,
                no_hp_wali: s.no_hp_wali || undefined
            }));
            const musammiList: Musammi[] = (musammiData || []).map(m => ({ ...m, marhalah: m.marhalah as Marhalah }));
            const waliKelasList: WaliKelas[] = (waliKelasData || []).map(w => ({ ...w, marhalah: w.marhalah as Marhalah }));

            setSantri(santriList);
            setMusammi(musammiList);
            setWaliKelas(waliKelasList);
            setClassTargets(targetsList);
            setStudentEvaluations((evaluationData as unknown as StudentEvaluation[]) || []);
            setEvaluationSettings((settingsData as unknown as EvaluationSetting[]) || []);

            // Map santri to their halaqah
            const halaqahWithSantri: Halaqah[] = (halaqahData || []).map(h => {
                const santriIds = (halaqahSantriData || [])
                    .filter(hs => hs.halaqah_id === h.id)
                    .map(hs => hs.santri_id);
                
                const musammiForHalaqah = musammiList.find(m => m.id === h.musammi_id);

                if (!musammiForHalaqah) return null;

                return {
                    id: h.id,
                    nama: h.nama,
                    musammi: musammiForHalaqah,
                    santri: santriList.filter(s => santriIds.includes(s.id)),
                    marhalah: h.marhalah as Marhalah,
                    jenis: h.jenis as HalaqahType,
                    waktu: h.waktu as Waktu[],
                    no_urut: h.no_urut || 999,
                };
            }).filter((h): h is Halaqah => h !== null);
            
            setHalaqah(halaqahWithSantri);
            
            const attendanceWithNames: AttendanceRecord[] = (attendanceData || [])
                .map(a => {
                    const person = a.peran === 'Santri' 
                        ? santriList.find(p => p.id === a.person_id)
                        : musammiList.find(p => p.id === a.person_id);
                    
                    if (!person || a.halaqah_id === null) {
                        return null;
                    }

                    return {
                        id: a.id,
                        date: a.date,
                        waktu: a.waktu as Waktu,
                        personId: a.person_id,
                        nama: person.nama,
                        marhalah: person.marhalah,
                        kelas: person.kelas,
                        peran: a.peran as Peran,
                        status: a.status as AttendanceStatus,
                        halaqahId: a.halaqah_id,
                    };
                })
                .filter((a): a is AttendanceRecord => a !== null);
            setAttendance(attendanceWithNames);

            const progressList: StudentProgress[] = (progressData || []).map(p => ({
                id: p.id,
                santri_id: p.santri_id,
                month_key: p.month_key,
                progress_type: p.progress_type as ProgressType,
                value: p.value
            }));
            setStudentProgress(progressList);

        } catch (err: any) {
            setError(err.message);
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- MUTATION FUNCTIONS ---
    
    const addSantri = async (santriData: Omit<Santri, 'id'>) => {
        const orgId = await getOrgId();
        const { data, error } = await supabase.from('santri').insert({ ...santriData, organization_id: orgId }).select().single();
        if (error) throw error;
        if (data) setSantri(prev => [...prev, { ...data, marhalah: data.marhalah as Marhalah }]);
        return data;
    }
    
    const addHalaqah = useCallback(async (newHalaqahData: Omit<Halaqah, 'id' | 'musammi' | 'no_urut'> & { musammi_id: number, no_urut?: number }) => {
        const orgId = await getOrgId();
        const { nama, santri: santriList, marhalah, jenis, waktu, no_urut } = newHalaqahData;
        const { data: halaqahResult, error: halaqahError } = await supabase.from('halaqah').insert({
            organization_id: orgId, nama, marhalah, jenis, waktu, musammi_id: newHalaqahData.musammi_id, no_urut: no_urut || 999
        }).select().single();

        if (halaqahError) throw halaqahError;

        if (halaqahResult && santriList.length > 0) {
            const santriLinks = santriList.map(s => ({
                organization_id: orgId, halaqah_id: halaqahResult.id, santri_id: s.id
            }));
            const { error: linkError } = await supabase.from('halaqah_santri').insert(santriLinks);
            if (linkError) throw linkError;
        }
        await fetchData();
    }, [fetchData]);

    const updateHalaqah = useCallback(async (id: number, updatedData: {
        musammi_id?: number, 
        jenis?: HalaqahType, 
        nama?: string,
        marhalah?: Marhalah,
        no_urut?: number,
        waktu?: Waktu[]
    }) => {
         const { error } = await supabase.from('halaqah').update(updatedData).eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteHalaqah = useCallback(async (id: number) => {
        const { error: linkError } = await supabase.from('halaqah_santri').delete().eq('halaqah_id', id);
        if (linkError) throw linkError;
        const { error: attError } = await supabase.from('attendance').delete().eq('halaqah_id', id);
        if (attError) throw attError;
        const { error } = await supabase.from('halaqah').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const removeSantriFromHalaqah = useCallback(async (halaqahId: number, santriId: number) => {
        const { error } = await supabase.from('halaqah_santri').delete().eq('halaqah_id', halaqahId).eq('santri_id', santriId);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const addSantriToHalaqah = useCallback(async (halaqahId: number, newSantri: Santri) => {
         const orgId = await getOrgId();
         const { error } = await supabase.from('halaqah_santri').insert({ organization_id: orgId, halaqah_id: halaqahId, santri_id: newSantri.id });
        if (error) throw error;
        await fetchData();
    }, [fetchData]);
    
    const addAttendanceRecords = async (records: Omit<AttendanceRecord, 'id' | 'nama' | 'marhalah' | 'kelas'>[]) => {
        const orgId = await getOrgId();
        const recordsToInsert = records.map(r => ({
            organization_id: orgId, date: r.date, waktu: r.waktu, person_id: r.personId, peran: r.peran, status: r.status, halaqah_id: r.halaqahId,
        }));
        const { error } = await supabase.from('attendance').insert(recordsToInsert);
        if (error) throw error;
        await fetchData();
    }

    const updateAttendanceRecord = useCallback(async (id: number, updates: { status?: AttendanceStatus, date?: string, waktu?: Waktu }) => {
        const { error } = await supabase.from('attendance').update(updates as any).eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteAttendanceRecord = useCallback(async (id: number) => {
        const { error } = await supabase.from('attendance').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);
    
    const deleteAttendanceBatch = useCallback(async (date: string, waktu: string) => {
        const { error } = await supabase.from('attendance').delete().eq('date', date).eq('waktu', waktu as Waktu);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    // Student Progress Mutations
    const addStudentProgressBatch = useCallback(async (progressRecords: Omit<StudentProgress, 'id'>[]) => {
        const orgId = await getOrgId();
        const recordsWithOrg = progressRecords.map(p => ({ ...p, organization_id: orgId }));
        const { error } = await supabase.from('student_progress').upsert(recordsWithOrg, { onConflict: 'santri_id, month_key, progress_type' });
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteStudentProgress = useCallback(async (id: number) => {
        const { error } = await supabase.from('student_progress').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteStudentProgressByMonth = useCallback(async (month: string, type: ProgressType) => {
        const { error } = await supabase.from('student_progress').delete().eq('month_key', month).eq('progress_type', type);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    // Class Target Mutation
    const saveClassTarget = useCallback(async (targetData: Omit<ClassTarget, 'id'>) => {
        const orgId = await getOrgId();
        const { error } = await supabase.from('class_targets').upsert(
            { ...targetData, organization_id: orgId },
            { onConflict: 'organization_id, marhalah, kelas' }
        );
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    // --- EVALUATION MUTATIONS ---
    const updateEvaluation = useCallback(async (evalData: Partial<StudentEvaluation> & { santri_id: number, month_key: string }) => {
        const orgId = await getOrgId();
        const { error } = await supabase.from('student_evaluation').upsert(
            { ...evalData, organization_id: orgId },
            { onConflict: 'santri_id, month_key' }
        );
        if (error) throw error;
        // Don't refetch all, update local state optimistically or silently
        await fetchData();
    }, [fetchData]);

    const saveEvaluationSetting = useCallback(async (setting: Omit<EvaluationSetting, 'id'>) => {
        const orgId = await getOrgId();
        const { error } = await supabase.from('evaluation_settings').insert({ ...setting, organization_id: orgId });
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteEvaluationSetting = useCallback(async (id: number) => {
        const { error } = await supabase.from('evaluation_settings').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    return { 
        santri, musammi, waliKelas, halaqah, attendance, studentProgress, classTargets, 
        studentEvaluations, evaluationSettings,
        loading, error, fetchData, 
        addHalaqah, updateHalaqah, deleteHalaqah, removeSantriFromHalaqah, 
        addSantriToHalaqah, addAttendanceRecords, updateAttendanceRecord, deleteAttendanceRecord, deleteAttendanceBatch,
        addStudentProgressBatch, deleteStudentProgress, deleteStudentProgressByMonth, saveClassTarget,
        updateEvaluation, saveEvaluationSetting, deleteEvaluationSetting,
        getOrgId 
    };
};
