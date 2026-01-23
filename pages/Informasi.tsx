
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { Plus, Edit, Trash, Pin, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Define Interface locally to avoid complex generic issues in some environments
interface Informasi {
    id: number;
    organization_id: string;
    created_at: string;
    title: string;
    content: string;
    author_email: string | null;
    is_pinned: boolean;
}

const Informasi: React.FC = () => {
    const [informasiList, setInformasiList] = useState<Informasi[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingInformasi, setEditingInformasi] = useState<Informasi | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        is_pinned: false,
    });

    const fetchInformasi = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('informasi')
                .select('*')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setInformasiList(data as Informasi[] || []);
        } catch (err: any) {
            setError(err.message);
            console.error("Error fetching information:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInformasi();
    }, [fetchInformasi]);
    
    const openModal = (informasi: Informasi | null) => {
        setEditingInformasi(informasi);
        if (informasi) {
            setFormData({
                title: informasi.title,
                content: informasi.content,
                is_pinned: informasi.is_pinned,
            });
        } else {
            setFormData({ title: '', content: '', is_pinned: false });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingInformasi(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.title.trim() || !formData.content.trim()) {
            alert("Judul dan Konten tidak boleh kosong.");
            return;
        }
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated.");

            // Fetch Organization ID for current user
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();
            
            if (!profile || !profile.organization_id) throw new Error("Organization ID not found for user.");

            if (editingInformasi) {
                // Update
                const { error } = await supabase
                    .from('informasi')
                    .update({ ...formData })
                    .eq('id', editingInformasi.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('informasi')
                    .insert({ 
                        ...formData, 
                        author_email: user.email,
                        organization_id: profile.organization_id
                    });
                if (error) throw error;
            }
            await fetchInformasi();
            closeModal();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id: number) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus informasi ini?")) {
            try {
                const { error } = await supabase.from('informasi').delete().eq('id', id);
                if (error) throw error;
                await fetchInformasi();
            } catch (err: any) {
                alert(`Error: ${err.message}`);
            }
        }
    };

    const renderContent = () => {
        if (loading) {
            return <div className="text-center p-8">Memuat informasi...</div>;
        }
        if (error) {
            return <div className="text-center p-8 text-error">Error: {error}</div>;
        }
        if (informasiList.length === 0) {
            return (
                <div className="text-center py-16 px-6 border-2 border-dashed border-slate-300 rounded-xl">
                    <MessageSquare className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-lg font-medium text-slate-800">Belum Ada Informasi</h3>
                    <p className="mt-1 text-sm text-slate-500">Klik tombol di atas untuk membuat informasi baru.</p>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                {informasiList.map(info => (
                    <Card key={info.id} className={`transition-all duration-300 ${info.is_pinned ? 'border-secondary shadow-lg' : ''}`}>
                         <div className="flex justify-between items-start -mt-6 -mx-6 mb-4 px-6 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                                    {info.is_pinned && <Pin size={16} className="mr-2 text-secondary" />}
                                    {info.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Diposting oleh {info.author_email} • {formatDistanceToNow(new Date(info.created_at), { addSuffix: true })}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <button onClick={() => openModal(info)} className="p-2 text-slate-500 hover:text-secondary hover:bg-slate-100 rounded-full"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(info.id)} className="p-2 text-slate-500 hover:text-error hover:bg-red-50 rounded-full"><Trash size={16}/></button>
                            </div>
                        </div>
                        <p className="text-slate-600 whitespace-pre-wrap">{info.content}</p>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Pusat Informasi</h1>
                    <p className="text-sm text-slate-500 mt-1">Umumkan informasi penting untuk semua pihak terkait.</p>
                </div>
                <button onClick={() => openModal(null)} className="bg-secondary text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-accent transition-colors inline-flex items-center justify-center text-sm shadow-sm">
                   <Plus size={16} className="mr-2" /> Buat Informasi Baru
                </button>
            </div>

            {renderContent()}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingInformasi ? 'Edit Informasi' : 'Buat Informasi Baru'}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700">Judul</label>
                        <input type="text" name="title" id="title" value={formData.title} onChange={handleFormChange} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-slate-700">Konten</label>
                        <textarea name="content" id="content" value={formData.content} onChange={handleFormChange} rows={8} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm" />
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" name="is_pinned" id="is_pinned" checked={formData.is_pinned} onChange={handleFormChange} className="h-4 w-4 text-secondary border-slate-300 rounded focus:ring-secondary" />
                        <label htmlFor="is_pinned" className="ml-2 block text-sm text-slate-900">Sematkan informasi ini (selalu di atas)</label>
                    </div>
                    <div className="pt-4 flex justify-end space-x-2">
                        <button onClick={closeModal} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors">Batal</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="bg-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent transition-colors disabled:bg-slate-400">
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Informasi;
