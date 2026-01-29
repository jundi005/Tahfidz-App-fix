
import React, { useState } from 'react';
import { KeyRound, Mail, Lock, User, Building, ClipboardCopy, Network, ArrowLeft, ChevronDown } from 'lucide-react';
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center pt-8 px-8 pb-4">
            <div className="mb-4 w-20 h-20 bg-slate-50 rounded-full p-2 border border-slate-100 shadow-sm">
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
            <p className="text-sm text-slate-500 font-medium">Sistem Absensi & Evaluasi Santri</p>
        </div>

        {/* Content Area */}
        <div className="p-8 pt-2">
            {message && (
                <div className={`mb-6 p-3 rounded-lg text-xs font-medium border flex items-start ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                    {message.text}
                </div>
            )}

            {mode === 'login' ? (
                <div className="animate-in fade-in slide-in-from-right duration-300">
                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
                                    <input
                                        type="email"
                                        required
                                        className="block w-full rounded-lg border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary focus:border-secondary sm:text-sm bg-slate-50 focus:bg-white transition-colors"
                                        placeholder="nama@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><KeyRound className="h-5 w-5 text-slate-400" /></div>
                                    <input
                                        type="password"
                                        required
                                        className="block w-full rounded-lg border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary focus:border-secondary sm:text-sm bg-slate-50 focus:bg-white transition-colors"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-lg border border-transparent bg-secondary py-3 px-4 text-sm font-bold text-white hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Memproses...
                                </span>
                            ) : 'Masuk Aplikasi'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500 mb-2">Belum punya akun?</p>
                        <button 
                            onClick={() => { setMode('register'); setMessage(null); }}
                            className="inline-flex items-center justify-center px-6 py-2 border border-secondary text-secondary font-bold rounded-lg text-sm hover:bg-blue-50 transition-colors w-full sm:w-auto"
                        >
                            Daftar Sekarang
                        </button>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-left duration-300">
                    <button 
                        onClick={() => { setMode('login'); setMessage(null); }}
                        className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                        title="Kembali ke Login"
                    >
                        <ArrowLeft size={24} />
                    </button>

                    <form className="space-y-4 pt-2" onSubmit={handleRegister}>
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Pendaftaran Admin</h3>
                            <p className="text-xs text-slate-500">Lengkapi data untuk membuat akun baru</p>
                        </div>

                        {/* Opsi Tipe Pendaftaran via Dropdown */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 ml-1">Tipe Pendaftaran</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    {regType === 'create' ? <Building className="h-5 w-5 text-secondary" /> : <Network className="h-5 w-5 text-secondary" />}
                                </div>
                                <select 
                                    value={regType}
                                    onChange={(e) => setRegType(e.target.value as 'create' | 'join')}
                                    className="block w-full rounded-lg border-slate-300 py-2.5 pl-10 pr-8 text-slate-900 focus:ring-2 focus:ring-secondary focus:border-secondary sm:text-sm bg-slate-50 focus:bg-white appearance-none font-medium"
                                >
                                    <option value="create">Daftar Ma'had Baru</option>
                                    <option value="join">Gabung Ma'had (Sudah Ada)</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-400" /></div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full rounded-lg border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm bg-slate-50 focus:bg-white"
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
                                        className="block w-full rounded-lg border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm bg-slate-50 focus:bg-white"
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
                                        className="block w-full rounded-lg border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm font-mono bg-slate-50 focus:bg-white"
                                        placeholder="ID Organisasi (Minta ke Admin)"
                                        value={orgId}
                                        onChange={(e) => setOrgId(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
                                <input
                                    type="email"
                                    required
                                    className="block w-full rounded-lg border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm bg-slate-50 focus:bg-white"
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
                                    className="block w-full rounded-lg border-slate-300 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-secondary sm:text-sm bg-slate-50 focus:bg-white"
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
                                className="group relative flex w-full justify-center rounded-lg border border-transparent bg-green-600 py-3 px-4 text-sm font-bold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-70 shadow-md"
                            >
                                {loading ? 'Mendaftarkan...' : 'Daftar Akun'}
                            </button>
                            <p className="text-[10px] text-slate-400 mt-3 text-center leading-relaxed">
                                *Akun baru memerlukan persetujuan Super Admin sebelum bisa digunakan. Pastikan data yang dimasukkan benar.
                            </p>
                        </div>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;
