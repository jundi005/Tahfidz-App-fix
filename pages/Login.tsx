
import React, { useState } from 'react';
import { KeyRound, Mail, Lock, User, Building, ArrowRight, ClipboardCopy, Network } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const LOGO_URL = "https://i.ibb.co.com/KcYyzZRz/Tanpa-judul-1080-x-1080-piksel-20260116-084021-0000.png";

const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [regType, setRegType] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mahadName, setMahadName] = useState('');
  const [orgId, setOrgId] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // App.tsx handles redirect
    } catch (error: any) {
        setMessage({ type: 'error', text: error.error_description || error.message });
    } finally {
        setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!fullName) {
        setMessage({ type: 'error', text: "Nama Lengkap wajib diisi." });
        return;
    }
    if (regType === 'create' && !mahadName) {
        setMessage({ type: 'error', text: "Nama Ma'had wajib diisi." });
        return;
    }
    if (regType === 'join' && !orgId) {
        setMessage({ type: 'error', text: "ID Organisasi wajib diisi untuk bergabung." });
        return;
    }

    setLoading(true);
    setMessage(null);

    try {
        // Prepare Metadata
        const metaData: any = {
            full_name: fullName,
            role: 'pending' // Always pending until approved
        };

        if (regType === 'create') {
            metaData.mahad_name = mahadName;
        } else {
            metaData.target_organization_id = orgId.trim();
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metaData
            }
        });

        if (error) throw error;

        setMessage({ 
            type: 'success', 
            text: "Pendaftaran berhasil! Akun Anda sedang ditinjau oleh Super Admin. Mohon hubungi admin untuk persetujuan." 
        });
        
        // Reset form
        setPassword('');
        // Switch back to login after delay
        setTimeout(() => setMode('login'), 4000);

    } catch (error: any) {
        setMessage({ type: 'error', text: error.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-primary rounded-xl shadow-lg border border-slate-200">
        <div className="flex flex-col items-center text-center">
            <div className="mb-4 w-24 h-24">
                <img 
                    src={LOGO_URL} 
                    alt="Logo Ma'had" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                         (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Logo";
                    }}
                />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Tahfidz App</h1>
            <p className="text-sm text-slate-500">Sistem Absensi & Laporan</p>
        </div>

        {/* Tab Switcher (Login vs Register) */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => { setMode('login'); setMessage(null); }}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'login' ? 'border-secondary text-secondary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
                Masuk
            </button>
            <button 
                onClick={() => { setMode('register'); setMessage(null); }}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'register' ? 'border-secondary text-secondary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
                Daftar Baru
            </button>
        </div>

        {message && (
            <div className={`p-3 rounded-md text-xs border ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                {message.text}
            </div>
        )}

        {mode === 'login' ? (
            <form className="space-y-4" onSubmit={handleLogin}>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center mb-4">
                    <p className="text-xs text-blue-700 font-medium flex items-center justify-center gap-2">
                        <Lock size={12} />
                        Login Admin / Pengurus
                    </p>
                </div>
                <div className="space-y-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
                        <input
                            type="email"
                            required
                            className="block w-full rounded-md border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><KeyRound className="h-5 w-5 text-slate-400" /></div>
                        <input
                            type="password"
                            required
                            className="block w-full rounded-md border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full justify-center rounded-md border border-transparent bg-secondary py-2.5 px-4 text-sm font-semibold text-white hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors disabled:bg-slate-400 shadow-sm"
                >
                    {loading ? 'Memproses...' : 'Masuk Aplikasi'}
                </button>
            </form>
        ) : (
            <form className="space-y-4" onSubmit={handleRegister}>
                {/* Opsi Tipe Pendaftaran */}
                <div className="flex gap-4 mb-4">
                    <label className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${regType === 'create' ? 'border-secondary bg-blue-50 text-secondary' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" name="regType" className="hidden" checked={regType === 'create'} onChange={() => setRegType('create')} />
                        <div className="text-center">
                            <Building size={20} className="mx-auto mb-1" />
                            <span className="text-xs font-semibold">Buat Ma'had Baru</span>
                        </div>
                    </label>
                    <label className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${regType === 'join' ? 'border-secondary bg-blue-50 text-secondary' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" name="regType" className="hidden" checked={regType === 'join'} onChange={() => setRegType('join')} />
                        <div className="text-center">
                            <Network size={20} className="mx-auto mb-1" />
                            <span className="text-xs font-semibold">Gabung Ma'had</span>
                        </div>
                    </label>
                </div>

                <div className="space-y-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-400" /></div>
                        <input
                            type="text"
                            required
                            className="block w-full rounded-md border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm"
                            placeholder="Nama Lengkap Admin"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>

                    {/* Conditional Input based on Type */}
                    {regType === 'create' ? (
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building className="h-5 w-5 text-slate-400" /></div>
                            <input
                                type="text"
                                className="block w-full rounded-md border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm"
                                placeholder="Nama Ma'had Baru"
                                value={mahadName}
                                onChange={(e) => setMahadName(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ClipboardCopy className="h-5 w-5 text-slate-400" /></div>
                            <input
                                type="text"
                                className="block w-full rounded-md border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm font-mono"
                                placeholder="Masukkan ID Organisasi (Minta ke Admin)"
                                value={orgId}
                                onChange={(e) => setOrgId(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-500 mt-1 ml-1">
                                *ID Organisasi bisa didapatkan dari Super Admin Ma'had Anda.
                            </p>
                        </div>
                    )}

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
                        <input
                            type="email"
                            required
                            className="block w-full rounded-md border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm"
                            placeholder="Email Login"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><KeyRound className="h-5 w-5 text-slate-400" /></div>
                        <input
                            type="password"
                            required
                            className="block w-full rounded-md border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm"
                            placeholder="Password (Min. 6 karakter)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-md border border-transparent bg-green-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:bg-slate-400 shadow-sm"
                    >
                        {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-2 text-center">
                        *Akun baru memerlukan persetujuan Super Admin sebelum bisa digunakan.
                    </p>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default Login;
