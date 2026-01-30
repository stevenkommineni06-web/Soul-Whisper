
import React from 'react';
import { Situation } from '../types';

interface SituationCardProps {
  situation: Situation;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export const SituationCard: React.FC<SituationCardProps> = ({ situation, isSelected, onClick }) => {
  return (
    <button
      onClick={() => onClick(situation.id)}
      className={`relative group flex flex-col p-6 rounded-[2rem] transition-all duration-500 border text-left w-full h-full
        ${isSelected 
          ? 'bg-amber-500 border-amber-500 shadow-[0_20px_40px_-10px_rgba(245,158,11,0.4)] translate-y-[-4px]' 
          : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-xl hover:translate-y-[-2px]'}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 transition-all duration-500
        ${isSelected ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-amber-50'}`}>
        {situation.icon}
      </div>
      
      <div className="space-y-2">
        <h3 className={`font-bold text-lg leading-tight transition-colors duration-500
          ${isSelected ? 'text-white' : 'text-slate-800'}`}>
          {situation.label}
        </h3>
        <p className={`text-xs leading-relaxed transition-colors duration-500
          ${isSelected ? 'text-amber-50' : 'text-slate-400'}`}>
          {situation.description}
        </p>
      </div>
      
      {isSelected && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
};
