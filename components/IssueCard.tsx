import React from 'react';
import { Issue, EvidenceItem } from '../types';
import { AlertTriangle, CheckCircle, Clock, Camera, Loader2 } from 'lucide-react';

interface IssueCardProps {
  issue: Issue;
  evidence: EvidenceItem[];
  onAddEvidence: (issueId: string) => void;
  isUploading?: boolean;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, evidence, onAddEvidence, isUploading = false }) => {
  const severityColor = {
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    emergency: 'bg-red-100 text-red-800 border-red-200',
  }[issue.severity];

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-900">{issue.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${severityColor} uppercase tracking-wide`}>
              {issue.severity}
            </span>
          </div>
          <div className="text-sm text-slate-500 flex gap-4">
            <span>{issue.category} • {issue.room}</span>
            <span>Noticed: {issue.first_noticed_at}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {issue.status === 'resolved' ? (
                <span className="flex items-center text-green-600 text-sm font-medium"><CheckCircle size={16} className="mr-1" /> Resolved</span>
            ) : (
                <span className="flex items-center text-amber-600 text-sm font-medium"><AlertTriangle size={16} className="mr-1" /> Ongoing</span>
            )}
        </div>
      </div>

      <p className="text-slate-700 mb-4 whitespace-pre-wrap">{issue.description}</p>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Habitability Impact</h4>
        <div className="flex flex-wrap gap-2">
          {issue.habitability_categories.map((cat, idx) => (
            <span key={idx} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded border border-slate-200">
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evidence ({evidence.length})</h4>
            <button 
                onClick={() => onAddEvidence(issue.id)}
                disabled={isUploading}
                className={`text-sm flex items-center gap-1 font-medium transition-colors ${
                    isUploading ? 'text-indigo-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'
                }`}
            >
                {isUploading ? (
                    <>
                        <Loader2 size={14} className="animate-spin" /> 
                        <span className="animate-pulse">Analyzing...</span>
                    </>
                ) : (
                    <>
                        <Camera size={14} /> Add Photo
                    </>
                )}
            </button>
        </div>
        
        {evidence.length === 0 && !isUploading ? (
            <div className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded text-center">No evidence uploaded yet.</div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {evidence.map(item => (
                <div key={item.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={item.file_reference} alt="evidence" className="w-full h-24 object-cover" />
                    <div className="p-2 bg-slate-50 text-xs text-slate-600 border-t border-slate-200">
                        <p className="line-clamp-2" title={item.ai_caption || item.user_caption}>
                            {item.ai_caption || item.user_caption}
                        </p>
                    </div>
                </div>
            ))}
            
            {/* Visual Progress Indicator for Upload */}
            {isUploading && (
                <div className="relative rounded-lg overflow-hidden border border-indigo-200 bg-indigo-50 h-auto min-h-[6rem] flex flex-col items-center justify-center animate-pulse">
                     <Loader2 size={24} className="text-indigo-400 animate-spin mb-2" />
                     <span className="text-xs text-indigo-500 font-medium">Processing Image...</span>
                </div>
            )}
            </div>
        )}
      </div>
    </div>
  );
};

export default IssueCard;