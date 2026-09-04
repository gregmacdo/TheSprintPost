"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProgressionChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#9ca3af" />
        <YAxis domain={['auto', 'auto']} fontSize={12} tickLine={false} axisLine={false} stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
          formatter={(value) => [`${value}s`, 'Time']} 
          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
        />
        <Line type="monotone" dataKey="time" stroke="#000" strokeWidth={3} dot={{ r: 4, fill: '#000' }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
