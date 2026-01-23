import { Marhalah, Waktu } from './types';

export const KELAS_BY_MARHALAH: Record<Marhalah, string[]> = {
  Mutawassithah: ['1A', '1B', '1D', '2A', '2B', '3A', '3B', '3C'],
  Aliyah: ['1A', '1B', '1C', '2A', '2B', '3A', '3B'],
  Jamiah: ['TQS', 'KHS'],
};

export const ALL_MARHALAH = ['Mutawassithah', 'Aliyah', 'Jamiah'];
// FIX: Changed ALL_WAKTU to use the Waktu enum for type safety. This resolves an error in HalaqahData.tsx where a string was passed to a function expecting a Waktu enum.
export const ALL_WAKTU: Waktu[] = [Waktu.Shubuh, Waktu.Dhuha, Waktu.Ashar, Waktu.Isya];
export const ALL_HALAQAH_TYPE = ['Halaqah Utama', 'Halaqah Pagi'];
export const ALL_ATTENDANCE_STATUS = ['Hadir', 'Izin', 'Sakit', 'Alpa', 'Terlambat'];
export const ALL_PERAN = ['Santri', 'Musammi'];