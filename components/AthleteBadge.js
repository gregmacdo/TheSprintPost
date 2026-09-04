// components/AthleteBadge.js
import React from 'react';

export default function AthleteBadge({ sprint }) {
  // 1. Handle Unclaimed or Anonymous Sprints
  if (!sprint.is_claimed) {
    return <span className="text-gray-500 italic text-sm">Unclaimed Sprint</span>;
  }
  
  if (sprint.is_anonymous) {
    return <span className="text-gray-700 font-medium text-sm">Anonymous Athlete</span>;
  }

  // 2. Handle Claimed Sprints
  return (
    <div className="flex items-center gap-3">
      
      {/* THE BULLETPROOF AVATAR (Managed in one place forever!) */}
      {sprint.athlete_avatar ? (
        <img 
          src={sprint.athlete_avatar} 
          alt={sprint.display_name} 
          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' }} 
        />
      ) : (
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
          👤
        </div>
      )}
      
      {/* NAME AND MINI-TAGS */}
      <div className="flex flex-col justify-center">
        <span className="text-black font-bold text-sm leading-tight">
          {sprint.display_name}
        </span>
        
        {/* The row of dynamic badges */}
        <div className="flex items-center gap-1.5 mt-1">
          
          {/* Gender Tag */}
          {sprint.athlete_gender === 'Male' && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">M</span>
          )}
          {sprint.athlete_gender === 'Female' && (
            <span className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">F</span>
          )}
          
          {/* Masters Tag */}
          {sprint.athlete_over_40 && (
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider" title="Masters (40+)">40+</span>
          )}
          
          {/* Weight Category Tag (Dynamically says Athena for females, Clydesdale for males) */}
          {sprint.athlete_clydesdale && (
            <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {sprint.athlete_gender === 'Female' ? 'Athena' : 'Clydesdale'}
            </span>
          )}

        </div>
      </div>
    </div>
  );
}
