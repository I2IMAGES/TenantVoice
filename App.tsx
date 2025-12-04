import React, { useState, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ShieldCheck, 
  Home, 
  AlertOctagon, 
  MessageSquare, 
  FileText, 
  Plus, 
  Upload,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { TenantCase, Issue, EvidenceItem, Communication, CommunicationMethod } from './types';
import { EMPTY_CASE, SYSTEM_INSTRUCTION } from './constants';
import { geminiService } from './services/geminiService';
import IssueCard from './components/IssueCard';
import TimelineChart from './components/TimelineChart';
import ReactMarkdown from 'react-markdown';

// --- Reducer for complex state ---
type Action = 
  | { type: 'UPDATE_META'; payload: any }
  | { type: 'ADD_ISSUE'; payload: Issue }
  | { type: 'ADD_EVIDENCE'; payload: EvidenceItem }
  | { type: 'ADD_COMMUNICATION'; payload: Communication }
  | { type: 'SET_REPORT'; payload: { snippet: string, timeline: string, pattern: string } };

const caseReducer = (state: TenantCase, action: Action): TenantCase => {
  switch (action.type) {
    case 'UPDATE_META':
      return { ...state, meta: { ...state.meta, ...action.payload } };
    case 'ADD_ISSUE':
      return { ...state, issues: [...state.issues, action.payload] };
    case 'ADD_EVIDENCE':
      return { ...state, evidence: [...state.evidence, action.payload] };
    case 'ADD_COMMUNICATION':
      return { ...state, communications: [...state.communications, action.payload] };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [tenantCase, dispatch] = useReducer(caseReducer, EMPTY_CASE);
  const [activeTab, setActiveTab] = useState<'meta' | 'issues' | 'comms' | 'report'>('meta');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Input States
  const [newIssueText, setNewIssueText] = useState('');
  const [newIssueImage, setNewIssueImage] = useState<File | null>(null);
  const [reportData, setReportData] = useState<{ snippet: string, timeline: string, pattern: string } | null>(null);

  // Communication Form State
  const [commDate, setCommDate] = useState(new Date().toISOString().split('T')[0]);
  const [commMethod, setCommMethod] = useState<CommunicationMethod>('text');
  const [commMessage, setCommMessage] = useState('');
  const [commResponse, setCommResponse] = useState('');

  // Handlers
  const handleUpdateMeta = (field: string, value: any) => {
    // Nested update logic specifically for this flat demo structure, 
    // normally use a more robust form library.
    if (field.includes('.')) {
        const [parent, child] = field.split('.');
        dispatch({
            type: 'UPDATE_META',
            payload: { [parent]: { ...tenantCase.meta[parent as keyof typeof tenantCase.meta], [child]: value } }
        });
    } else {
        dispatch({ type: 'UPDATE_META', payload: { [field]: value } });
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssueText && !newIssueImage) return;
    setIsAnalyzing(true);

    try {
      let imageBase64 = undefined;
      let mimeType = undefined;
      
      if (newIssueImage) {
        imageBase64 = await fileToBase64(newIssueImage);
        mimeType = newIssueImage.type;
      }

      const response = await geminiService.analyzeIssueWithEvidence(newIssueText, imageBase64, mimeType);
      
      const newIssue: Issue = {
        id: uuidv4(),
        title: response.issue?.title || 'New Issue',
        category: response.issue?.category || 'General',
        room: response.issue?.room || 'Unknown',
        severity: (response.issue?.severity as any) || 'medium',
        status: (response.issue?.status as any) || 'ongoing',
        first_noticed_at: response.issue?.first_noticed_at || new Date().toISOString().split('T')[0],
        description: response.issue?.description || newIssueText,
        habitability_categories: response.issue?.habitability_categories || [],
      };

      dispatch({ type: 'ADD_ISSUE', payload: newIssue });

      if (imageBase64 && response.evidence_items && response.evidence_items.length > 0) {
        const ev = response.evidence_items[0];
        dispatch({
            type: 'ADD_EVIDENCE',
            payload: {
                id: uuidv4(),
                issue_id: newIssue.id,
                file_reference: imageBase64,
                captured_at: new Date().toISOString(),
                uploaded_at: new Date().toISOString(),
                ai_caption: ev.ai_caption || 'Evidence image',
                user_caption: ''
            }
        });
      }

      setNewIssueText('');
      setNewIssueImage(null);
    } catch (e) {
      console.error(e);
      alert('Failed to analyze issue. Check console.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogCommunication = () => {
    if (!commMessage) return;
    const newComm: Communication = {
        id: uuidv4(),
        date: commDate,
        method: commMethod,
        tenant_message: commMessage,
        landlord_response: commResponse,
        linked_issue_ids: [],
        promises: []
    };
    dispatch({ type: 'ADD_COMMUNICATION', payload: newComm });
    setCommMessage('');
    setCommResponse('');
  };

  const handleGenerateReport = async () => {
    setIsAnalyzing(true);
    try {
        const response = await geminiService.generateReport(tenantCase);
        setReportData({
            snippet: response.report_snippet || '',
            timeline: response.timeline_summary || '',
            pattern: response.pattern_summary || ''
        });
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-700">
                <ShieldCheck className="h-6 w-6" />
                <h1 className="font-bold text-xl tracking-tight">TenantVoice</h1>
            </div>
            <div className="text-xs text-slate-400 hidden sm:block">
                Habitability Case Builder
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        
        {/* Progress Nav */}
        <div className="flex justify-between mb-8 overflow-x-auto pb-2">
            {[
                { id: 'meta', label: 'Property Info', icon: Home },
                { id: 'issues', label: 'Issues & Evidence', icon: AlertOctagon },
                { id: 'comms', label: 'Communication Log', icon: MessageSquare },
                { id: 'report', label: 'Final Report', icon: FileText },
            ].map((tab, idx) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                            ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}
                        `}
                    >
                        <Icon size={16} />
                        {tab.label}
                    </button>
                )
            })}
        </div>

        {/* --- TAB: PROPERTY INFO --- */}
        {activeTab === 'meta' && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                        <Home className="text-indigo-500" /> Property Details
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Rental Address</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900"
                                placeholder="123 Tenant St, Apt 4B..."
                                value={tenantCase.meta.property_address}
                                onChange={(e) => handleUpdateMeta('property_address', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lease Start</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                                    value={tenantCase.meta.lease.start_date}
                                    onChange={(e) => handleUpdateMeta('lease.start_date', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lease End</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                                    value={tenantCase.meta.lease.end_date}
                                    onChange={(e) => handleUpdateMeta('lease.end_date', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                        Landlord / Management Contact
                    </h2>
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="Landlord Name / Company"
                            className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                            value={tenantCase.meta.landlord_contact.name}
                            onChange={(e) => handleUpdateMeta('landlord_contact.name', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-4">
                             <input 
                                type="tel" 
                                placeholder="Phone Number"
                                className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                                value={tenantCase.meta.landlord_contact.phone}
                                onChange={(e) => handleUpdateMeta('landlord_contact.phone', e.target.value)}
                            />
                             <input 
                                type="email" 
                                placeholder="Email Address"
                                className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                                value={tenantCase.meta.landlord_contact.email}
                                onChange={(e) => handleUpdateMeta('landlord_contact.email', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button 
                        onClick={() => setActiveTab('issues')}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                    >
                        Next: Issues <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        )}

        {/* --- TAB: ISSUES --- */}
        {activeTab === 'issues' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-2 space-y-6">
                    {/* Add New Issue Box */}
                    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                             <Plus className="text-indigo-400" /> Log a New Issue
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">Describe the problem (e.g. "Mold in bathroom ceiling") and optionally attach a photo. AI will categorize it for you.</p>
                        
                        <textarea 
                            className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-400 rounded p-3 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Describe what is wrong..."
                            rows={3}
                            value={newIssueText}
                            onChange={(e) => setNewIssueText(e.target.value)}
                        />
                        
                        <div className="flex items-center justify-between">
                             <div className="relative">
                                <input 
                                    type="file" 
                                    id="file-upload" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => setNewIssueImage(e.target.files?.[0] || null)}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
                                    <div className="bg-slate-700 p-2 rounded-full"><Upload size={16} /></div>
                                    {newIssueImage ? newIssueImage.name : "Attach Photo (Optional)"}
                                </label>
                             </div>

                             <button 
                                onClick={handleCreateIssue}
                                disabled={isAnalyzing || (!newIssueText && !newIssueImage)}
                                className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
                             >
                                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : "Analyze & Add"}
                             </button>
                        </div>
                    </div>

                    {/* Issue List */}
                    <div className="space-y-4">
                        {tenantCase.issues.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                    <AlertOctagon className="text-slate-400" />
                                </div>
                                <h3 className="text-slate-600 font-medium">No issues logged yet</h3>
                                <p className="text-slate-400 text-sm mt-1">Use the form above to start building your case.</p>
                            </div>
                        ) : (
                            tenantCase.issues.map(issue => (
                                <IssueCard 
                                    key={issue.id} 
                                    issue={issue} 
                                    evidence={tenantCase.evidence.filter(e => e.issue_id === issue.id)}
                                    onAddEvidence={(id) => alert("To add more evidence, create a new entry describing the additional photo for now.")}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                     <div className="sticky top-24">
                        <TimelineChart issues={tenantCase.issues} communications={tenantCase.communications} />
                        
                        <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="text-blue-800 font-semibold mb-2 text-sm">Case Summary</h4>
                            <ul className="text-sm text-blue-700 space-y-2">
                                <li className="flex justify-between">
                                    <span>Total Issues:</span>
                                    <span className="font-bold">{tenantCase.issues.length}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Emergency:</span>
                                    <span className="font-bold text-red-600">{tenantCase.issues.filter(i => i.severity === 'emergency').length}</span>
                                </li>
                                 <li className="flex justify-between">
                                    <span>Resolved:</span>
                                    <span className="font-bold text-green-600">{tenantCase.issues.filter(i => i.status === 'resolved').length}</span>
                                </li>
                            </ul>
                        </div>
                     </div>
                </div>
            </div>
        )}

        {/* --- TAB: COMMUNICATIONS --- */}
        {activeTab === 'comms' && (
             <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <MessageSquare className="text-indigo-500" /> Log Communication
                     </h3>
                     <p className="text-sm text-slate-500 mb-6">
                        Log every text, email, or conversation. Documentation is key.
                     </p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input 
                            type="date" 
                            className="p-2 border border-slate-300 rounded bg-white text-slate-900" 
                            value={commDate}
                            onChange={(e) => setCommDate(e.target.value)}
                        />
                        <select 
                            className="p-2 border border-slate-300 rounded bg-white text-slate-900"
                            value={commMethod}
                            onChange={(e) => setCommMethod(e.target.value as CommunicationMethod)}
                        >
                            <option value="text">Text Message</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone Call</option>
                            <option value="in-person">In Person</option>
                            <option value="portal">Resident Portal</option>
                            <option value="letter">Letter</option>
                            <option value="other">Other</option>
                        </select>
                     </div>
                     <textarea 
                        className="w-full p-3 border border-slate-300 rounded mb-4 bg-white text-slate-900 placeholder-slate-400" 
                        placeholder="What did you say? (e.g. 'I asked for the leak to be fixed')"
                        rows={2}
                        value={commMessage}
                        onChange={(e) => setCommMessage(e.target.value)}
                     ></textarea>
                     <textarea 
                        className="w-full p-3 border border-slate-300 rounded mb-4 bg-white text-slate-900 placeholder-slate-400" 
                        placeholder="What was the landlord's response? (e.g. 'He said he would come tomorrow')"
                        rows={2}
                        value={commResponse}
                        onChange={(e) => setCommResponse(e.target.value)}
                     ></textarea>

                     <button 
                        onClick={handleLogCommunication}
                        disabled={!commMessage}
                        className="bg-slate-800 text-white px-4 py-2 rounded font-medium text-sm hover:bg-slate-700 disabled:bg-slate-400"
                     >
                        Log Interaction
                     </button>
                 </div>

                 {/* List of comms */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 font-medium text-slate-700 text-sm">
                        Communication History
                     </div>
                     {tenantCase.communications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No communications logged yet.
                        </div>
                     ) : (
                        <div className="divide-y divide-slate-100">
                            {tenantCase.communications.map(comm => (
                                <div key={comm.id} className="p-6">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-slate-800">{comm.date}</span>
                                        <span className="text-xs uppercase bg-slate-100 px-2 py-1 rounded text-slate-500">{comm.method}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-indigo-600 font-medium block text-xs uppercase mb-1">You</span>
                                            <p className="text-slate-700 bg-indigo-50 p-2 rounded rounded-tl-none">{comm.tenant_message}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-600 font-medium block text-xs uppercase mb-1 text-right">Landlord</span>
                                            <p className="text-slate-700 bg-slate-50 p-2 rounded rounded-tr-none">
                                                {comm.landlord_response || <span className="italic text-slate-400">No response logged</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     )}
                 </div>
             </div>
        )}

        {/* --- TAB: REPORT --- */}
        {activeTab === 'report' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Final Report</h2>
                        <p className="text-slate-500 text-sm">Review the generated documentation before exporting.</p>
                    </div>
                    <button 
                        onClick={handleGenerateReport}
                        disabled={isAnalyzing}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm hover:bg-indigo-700 flex items-center gap-2"
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin" /> : <FileText size={18} />}
                        {reportData ? 'Regenerate Report' : 'Generate Report'}
                    </button>
                </div>

                {reportData ? (
                    <div className="bg-white shadow-lg rounded-none sm:rounded-lg border border-slate-200 overflow-hidden print:shadow-none print:border-none">
                        {/* Print Header */}
                        <div className="bg-slate-50 p-8 border-b border-slate-200">
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">Notice of Habitability Conditions</h1>
                            <div className="grid grid-cols-2 gap-8 text-sm text-slate-600 mt-6">
                                <div>
                                    <p className="uppercase text-xs font-bold tracking-wider text-slate-400 mb-1">Property</p>
                                    <p className="font-semibold text-slate-900">{tenantCase.meta.property_address || 'Address not provided'}</p>
                                </div>
                                <div>
                                    <p className="uppercase text-xs font-bold tracking-wider text-slate-400 mb-1">Landlord</p>
                                    <p className="font-semibold text-slate-900">{tenantCase.meta.landlord_contact.name || 'Name not provided'}</p>
                                    <p>{tenantCase.meta.landlord_contact.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Markdown Content */}
                        <div className="p-8 prose prose-slate max-w-none">
                            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 text-sm">
                                <strong>Summary of Patterns:</strong> {reportData.pattern}
                            </div>
                            
                            <ReactMarkdown>{reportData.snippet}</ReactMarkdown>
                            
                            <h3 className="mt-8 mb-4 font-bold text-lg">Detailed Issue Timeline</h3>
                            <ReactMarkdown>{reportData.timeline}</ReactMarkdown>
                        </div>

                        {/* Disclaimer Footer */}
                        <div className="bg-slate-100 p-6 text-xs text-slate-500 border-t border-slate-200 text-center">
                            <p className="font-bold mb-1">DISCLAIMER</p>
                            This document is generated by TenantVoice for informational purposes only. It does not constitute legal advice. 
                            Tenants should consult with a qualified attorney or local housing authority regarding specific legal rights and remedies.
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                        <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700">Ready to Generate</h3>
                        <p className="text-slate-500 max-w-md mx-auto mt-2">
                            Once you have entered all issues and communication logs, click "Generate Report" to create a professional document summarizing your case.
                        </p>
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default App;