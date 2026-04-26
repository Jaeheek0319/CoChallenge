import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { UserProject } from '../types';

interface ProjectDialProps {
  projects?: UserProject[];
}

export function ProjectDial({ projects = [] }: ProjectDialProps) {
  // Calculate completed projects by difficulty
  const completed = projects.filter(p => p.currentStep === p.steps.length - 1);
  
  const easyCompleted = completed.filter(p => p.difficulty === 'Beginner').length;
  const mediumCompleted = completed.filter(p => p.difficulty === 'Intermediate').length;
  const hardCompleted = completed.filter(p => p.difficulty === 'Advanced').length;
  
  const totalCompleted = completed.length;
  
  // Calculate percentages
  const easyPercent = totalCompleted > 0 ? (easyCompleted / totalCompleted) * 100 : 0;
  const mediumPercent = totalCompleted > 0 ? (mediumCompleted / totalCompleted) * 100 : 0;
  const hardPercent = totalCompleted > 0 ? (hardCompleted / totalCompleted) * 100 : 0;

  // For a semi-circle cut at bottom, we use a path from 180 to 0 degrees (top)
  // SVG viewBox: 0 0 150 75 for a semi-circle
  const radius = 65;
  const centerX = 75;
  const centerY = 75;

  // Calculate arc angles (0 = right, 90 = bottom, 180 = left, 270 = top)
  // Semi-circle: start at 180 (left) and go to 0 (right) through top (270)
  let currentAngle = 180; // Start at left (180 degrees)

  // Helper function to convert angle to SVG arc
  const getArcPath = (startAngle: number, endAngle: number, rad: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + rad * Math.cos(startRad);
    const y1 = centerY + rad * Math.sin(startRad);
    const x2 = centerX + rad * Math.cos(endRad);
    const y2 = centerY + rad * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${rad} ${rad} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const easyAngle = easyPercent * 1.8; // 180 degrees total for semi-circle
  const mediumAngle = mediumPercent * 1.8;
  const hardAngle = hardPercent * 1.8;

  const easyEnd = currentAngle + easyAngle;
  const mediumEnd = easyEnd + mediumAngle;

  return (
    <div className="glass-panel rounded-3xl pt-[2.875rem] pb-[2.875rem] px-4">
      <div className="flex items-center justify-between">
        {/* Dial Section - Semi-circle */}
        <div className="relative w-42 h-24 flex items-center justify-center">
          <svg className="absolute" width="150" height="70" viewBox="0 0 150 75" preserveAspectRatio="none">
            {/* Background semi-circle */}
            <path
              d={getArcPath(180, 0, radius)}
              fill="none"
              stroke="rgba(51, 65, 85, 0.3)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            
            {/* Easy section (Green) */}
            {easyPercent > 0 && (
              <path
                d={getArcPath(currentAngle, easyEnd, radius)}
                fill="none"
                stroke="#10b981"
                strokeWidth="12"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
            
            {/* Medium section (Orange) */}
            {mediumPercent > 0 && (
              <path
                d={getArcPath(easyEnd, mediumEnd, radius)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="12"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
            
            {/* Hard section (Red) */}
            {hardPercent > 0 && (
              <path
                d={getArcPath(mediumEnd, mediumEnd + hardAngle, radius)}
                fill="none"
                stroke="#ef4444"
                strokeWidth="12"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
          </svg>

          {/* Center content - positioned at center of full circle */}
          <div className="absolute left-1/2 top-full transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="text-center absolute bottom-0">
              <div className="text-2xl font-bold text-white">
                {totalCompleted}
              </div>
              <div className="flex items-center justify-center gap-1 mt-1 text-sm text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Solved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="flex gap-4 ml-4">
          <div className="bg-emerald-400/20 rounded-lg p-2 border border-emerald-400/30 text-center min-w-16">
            <span className="text-xs font-semibold text-emerald-400">Easy</span>
            <span className="text-sm font-bold text-white block">{easyCompleted}</span>
          </div>
          <div className="bg-amber-400/20 rounded-lg p-2 border border-amber-400/30 text-center min-w-16">
            <span className="text-xs font-semibold text-amber-400">Medium</span>
            <span className="text-sm font-bold text-white block">{mediumCompleted}</span>
          </div>
          <div className="bg-red-400/20 rounded-lg p-2 border border-red-400/30 text-center min-w-16">
            <span className="text-xs font-semibold text-red-400">Hard</span>
            <span className="text-sm font-bold text-white block">{hardCompleted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}