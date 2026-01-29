
import React from 'react';

// DEPRECATED: This file has been split into pages/DataMaster/*.tsx
// Retained temporarily to prevent build errors if referenced elsewhere, 
// but App.tsx now routes to the new pages.

const DataManagement: React.FC<any> = () => {
    return (
        <div className="p-8 text-center text-slate-500">
            <h2 className="text-xl font-bold">File Deprecated</h2>
            <p>Halaman ini telah dipindahkan ke folder <code>pages/DataMaster/</code>.</p>
        </div>
    );
};

export default DataManagement;
