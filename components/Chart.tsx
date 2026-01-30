
import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AttendanceStatus } from '../types';

// Consistent colors for attendance statuses across all charts
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.Hadir]: '#22C55E',    // success (Green)
  [AttendanceStatus.Sakit]: '#F59E0B',    // warning (Yellow/Amber)
  [AttendanceStatus.Izin]: '#3B82F6',     // info (Blue)
  [AttendanceStatus.Alpa]: '#EF4444',     // error (Red)
  [AttendanceStatus.Terlambat]: '#F97316', // orange
};
const OTHER_COLORS = ['#6B7280', '#9CA3AF'];

// Palette for Bar Charts (Different months/categories)
const BAR_COLORS = [
    '#2563EB', // Blue 600
    '#10B981', // Emerald 500
    '#F59E0B', // Amber 500
    '#EF4444', // Red 500
    '#8B5CF6', // Violet 500
    '#EC4899', // Pink 500
    '#06B6D4', // Cyan 500
    '#F97316', // Orange 500
    '#6366F1', // Indigo 500
    '#84CC16', // Lime 500
];


interface BarChartProps {
  data: any[];
  barKey: string;
  xAxisKey: string;
}

export const SimpleBarChart: React.FC<BarChartProps> = ({ data, barKey, xAxisKey }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} />
      <YAxis axisLine={false} tickLine={false} />
      <Tooltip 
        cursor={{fill: '#f1f5f9'}}
        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
      />
      <Legend />
      <Bar dataKey={barKey} name="Nilai Rata-Rata" radius={[4, 4, 0, 0]}>
        {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

interface GroupedBarChartProps {
    data: any[];
    keys: string[]; // Array of keys (e.g., months) to create bars for
    xAxisKey: string;
}

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({ data, keys, xAxisKey }) => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
            dataKey={xAxisKey} 
            axisLine={false} 
            tickLine={false}
            interval={0}
        />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip 
          cursor={{fill: '#f1f5f9'}}
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Legend />
        {keys.map((key, index) => (
             <Bar 
                key={key} 
                dataKey={key} 
                name={key} // Used for Legend label
                fill={BAR_COLORS[index % BAR_COLORS.length]} 
                radius={[4, 4, 0, 0]} 
             />
        ))}
      </BarChart>
    </ResponsiveContainer>
);

interface PieChartProps {
    data: { name: string; value: number }[];
    height?: number;
    showLabel?: boolean;
}

export const SimplePieChart: React.FC<PieChartProps> = ({ data, height = 300, showLabel = true }) => (
    <ResponsiveContainer width="100%" height={height}>
        <PieChart>
            <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={height < 200 ? 50 : 80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={showLabel ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
            >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as AttendanceStatus] || OTHER_COLORS[index % OTHER_COLORS.length]} />
                ))}
            </Pie>
            <Tooltip />
            <Legend />
        </PieChart>
    </ResponsiveContainer>
);

interface StackedBarChartProps {
  data: any[];
  height?: number;
  bottomMargin?: number;
  rotateLabels?: boolean;
}

// KHUSUS UNTUK LAPORAN WAKTU / UMUM (Lebih Ramping)
export const StackedBarChart: React.FC<StackedBarChartProps> = ({ 
    data, 
    height = 350, 
    bottomMargin = 30, 
    rotateLabels = false 
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: bottomMargin }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis 
        dataKey="name" 
        interval={0} 
        angle={rotateLabels ? -45 : 0}  
        textAnchor={rotateLabels ? "end" : "middle"}
        height={bottomMargin}
        tick={{fontSize: 12, fill: '#475569', fontWeight: 600}}
        axisLine={false}
        tickLine={false}
        dx={rotateLabels ? -5 : 0} 
        dy={10}
      />
      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
      <Tooltip 
        cursor={{fill: '#f1f5f9'}} 
        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
      />
      <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} iconType="circle"/>
      <Bar barSize={40} dataKey={AttendanceStatus.Hadir} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Hadir]} name="Hadir" radius={[0,0,4,4]} />
      <Bar barSize={40} dataKey={AttendanceStatus.Sakit} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Sakit]} name="Sakit" />
      <Bar barSize={40} dataKey={AttendanceStatus.Izin} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Izin]} name="Izin" />
      <Bar barSize={40} dataKey={AttendanceStatus.Alpa} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Alpa]} name="Alpa" />
      <Bar barSize={40} dataKey={AttendanceStatus.Terlambat} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Terlambat]} name="Terlambat" radius={[4,4,0,0]} />
    </BarChart>
  </ResponsiveContainer>
);

// KHUSUS UNTUK LAPORAN REKAP SANTRI (Banyak Data, Margin Bawah Besar, Bar Tebal)
export const StudentStackedBarChart: React.FC<StackedBarChartProps> = ({ 
    data, 
    height = 500 
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
      {/* Grid Horizontal Saja (Putus-putus) */}
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
      
      {/* Sumbu X (Nama Santri) */}
      <XAxis 
        dataKey="name" 
        interval={0} 
        angle={-45} 
        height={120} 
        tick={{fontSize: 11, fill: '#475569', fontWeight: 600, textAnchor: "end"}}
        axisLine={false}
        tickLine={false}
        //dx={-8} 
        //dy={10}
      />
      
      {/* Sumbu Y (Angka) */}
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{fontSize: 11, fill: '#64748b'}} 
      />
      
      <Tooltip 
        cursor={{fill: '#f1f5f9'}} 
        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
      />
      <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} iconType="circle"/>
      
      {/* Stacked Bars - Urutan: Hadir paling bawah */}
      <Bar barSize={35} dataKey={AttendanceStatus.Hadir} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Hadir]} name="Hadir" radius={[0,0,0,0]} />
      <Bar barSize={35} dataKey={AttendanceStatus.Izin} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Izin]} name="Izin" />
      <Bar barSize={35} dataKey={AttendanceStatus.Sakit} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Sakit]} name="Sakit" />
      <Bar barSize={35} dataKey={AttendanceStatus.Alpa} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Alpa]} name="Alpa" />
      <Bar barSize={35} dataKey={AttendanceStatus.Terlambat} stackId="a" fill={STATUS_COLORS[AttendanceStatus.Terlambat]} name="Terlambat" radius={[4,4,0,0]} />
    </BarChart>
  </ResponsiveContainer>
);

export const AttendanceColumnChart: React.FC<StackedBarChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="name" axisLine={false} tickLine={false} />
      <YAxis axisLine={false} tickLine={false} />
      <Tooltip cursor={{fill: '#f1f5f9'}} />
      <Legend />
      <Bar dataKey={AttendanceStatus.Hadir} fill={STATUS_COLORS[AttendanceStatus.Hadir]} name="Hadir" radius={[4, 4, 0, 0]} />
      <Bar dataKey={AttendanceStatus.Sakit} fill={STATUS_COLORS[AttendanceStatus.Sakit]} name="Sakit" radius={[4, 4, 0, 0]} />
      <Bar dataKey={AttendanceStatus.Izin} fill={STATUS_COLORS[AttendanceStatus.Izin]} name="Izin" radius={[4, 4, 0, 0]} />
      <Bar dataKey={AttendanceStatus.Alpa} fill={STATUS_COLORS[AttendanceStatus.Alpa]} name="Alpa" radius={[4, 4, 0, 0]} />
      <Bar dataKey={AttendanceStatus.Terlambat} fill={STATUS_COLORS[AttendanceStatus.Terlambat]} name="Terlambat" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export const MultiLineChart: React.FC<{ data: any[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10}} minTickGap={30} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={AttendanceStatus.Hadir} stroke={STATUS_COLORS[AttendanceStatus.Hadir]} strokeWidth={2} dot={false} name="Hadir" />
            <Line type="monotone" dataKey={AttendanceStatus.Izin} stroke={STATUS_COLORS[AttendanceStatus.Izin]} strokeWidth={2} dot={false} name="Izin" />
            <Line type="monotone" dataKey={AttendanceStatus.Sakit} stroke={STATUS_COLORS[AttendanceStatus.Sakit]} strokeWidth={2} dot={false} name="Sakit" />
            <Line type="monotone" dataKey={AttendanceStatus.Alpa} stroke={STATUS_COLORS[AttendanceStatus.Alpa]} strokeWidth={2} dot={false} name="Alpa" />
            <Line type="monotone" dataKey={AttendanceStatus.Terlambat} stroke={STATUS_COLORS[AttendanceStatus.Terlambat]} strokeWidth={2} dot={false} name="Terlambat" />
        </LineChart>
    </ResponsiveContainer>
);
