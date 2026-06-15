"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [jobDesc, setJobDesc] = useState("Looking for an AI/ML Intern for June 2026. Must have experience with Python, deep learning architectures, and microservices.");
  const [candidateProfile, setCandidateProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/history/");
      const data = await response.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    // NEW ENTERPRISE FEATURE: ZIP FILE HANDLING
    if (file.name.toLowerCase().endsWith('.zip')) {
      formData.append("job_description", jobDesc); 
      setResult({ status: "processing", message: "Uploading ZIP and deploying AI Swarm..." });
      
      try {
        const response = await fetch("http://localhost:8000/api/bulk-screen/", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        
        if (data.status === "success") {
          setResult({
            status: "completed",
            match_score: "Batch",
            summary: `🚀 BULK UPLOAD SUCCESS!\n\nSuccessfully queued ${data.tasks.length} resumes. Your background AI workers are analyzing them right now.\n\nWatch the 'Previous Screenings' sidebar on the right—it will update automatically as the results roll in!`
          });
          
          // Live Leaderboard Effect: Refresh history every 3 seconds for 1 minute
          const pollInterval = setInterval(fetchHistory, 3000);
          setTimeout(() => clearInterval(pollInterval), 60000); 
          
        } else {
          alert(data.error || "Failed to process ZIP.");
          setResult(null);
        }
      } catch (error) {
        console.error("Upload error:", error);
        setResult({ status: "error", message: "Failed to connect to the backend." });
      }
    } 
    // STANDARD SINGLE PDF HANDLING
    else {
      try {
        const response = await fetch("http://localhost:8000/api/upload-pdf/", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (data.text) {
          setCandidateProfile(data.text);
          setResult(null); // Clear previous results
        } else {
          alert(data.error || "Failed to extract text from PDF.");
        }
      } catch (error) {
        console.error("Upload error:", error);
        alert("Failed to connect to the backend PDF scanner.");
      }
    }
    setIsUploading(false);
  };

  const handleAnalyze = async () => {
    if (!candidateProfile) {
      alert("Please upload a PDF or paste a profile first!");
      return;
    }
    
    setLoading(true);
    setResult({ status: "processing", message: "Sending profile to AI Agents..." });
    
    try {
      const response = await fetch("http://localhost:8000/api/screen/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: jobDesc,
          candidate_profile: candidateProfile,
        }),
      });
      
      const data = await response.json();
      
      if (data.task_id) {
        setResult({ status: "processing", message: `AI Task Started (ID: ${data.task_id.slice(0,8)}...). Waiting for Groq...` });
        
        let isComplete = false;
        while (!isComplete) {
          await new Promise(resolve => setTimeout(resolve, 2000)); 
          const statusRes = await fetch(`http://localhost:8000/api/screen/status/${data.task_id}/`);
          const statusData = await statusRes.json();

          if (statusData.status === "completed") {
            setResult(statusData); 
            isComplete = true;
            fetchHistory(); 
          }
        }
      } else {
        setResult(data); 
      }
    } catch (error) {
      console.error("Error:", error);
      setResult({ status: "error", message: "Failed to connect to the AI engine. Is Django running?" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="text-center mb-10 mt-4">
        <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight">AI Recruiter Dashboard</h1>
        <p className="text-slate-500 mt-2">Powered by Groq, CrewAI, and Celery</p>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-bold text-slate-700">Job Description Requirements</label>
              <textarea
                className="w-full h-56 p-4 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                <label className="font-bold text-slate-700">Candidate Resume(s)</label>
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                  {isUploading ? (
                    <span className="animate-pulse">Uploading...</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Upload PDF or ZIP
                    </>
                  )}
                  <input type="file" accept=".pdf,.zip" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
              <textarea
                className="w-full h-56 p-4 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={candidateProfile}
                onChange={(e) => setCandidateProfile(e.target.value)}
                placeholder="Paste text here or upload a .PDF or .ZIP file..."
              />
            </div>
          </div>

          {/* UPGRADED SMART BUTTON */}
          <button
            onClick={handleAnalyze}
            disabled={loading || isUploading || result?.match_score === "Batch"}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md text-lg"
          >
            {loading ? "AI Agents are analyzing..." : 
             result?.match_score === "Batch" ? "✨ Swarm Deployed: Watch Sidebar" : 
             "Run AI Screening (Single PDF)"}
          </button>

          {/* Results Box */}
          {result && (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xl mt-8 animate-in fade-in slide-in-from-bottom-4 transition-all">
              {result.status === "processing" ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-xl font-bold text-slate-700 animate-pulse">{result.message}</p>
                </div>
              ) : result.status === "completed" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <h2 className="text-3xl font-extrabold text-slate-800">AI Candidate Match</h2>
                    <div className={`px-6 py-3 rounded-full text-2xl font-black shadow-sm ${
                      result.match_score === "Batch" ? 'bg-purple-100 text-purple-700' :
                      result.match_score >= 80 ? 'bg-green-100 text-green-700' : 
                      result.match_score >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {result.match_score === "Batch" ? "Batch Active" : `Score: ${result.match_score}/100`}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-500 uppercase tracking-wider mb-3">Executive Summary</h3>
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-inner whitespace-pre-wrap">
                      <p className="text-slate-700 leading-relaxed text-lg">{result.summary}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Analysis Failed</h3>
                  <p className="text-slate-600">{result.message}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: The History Sidebar / Leaderboard */}
        <div className="w-full lg:w-96">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden sticky top-8">
            <div className="bg-slate-900 p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Previous Screenings
              </h3>
            </div>
            
            <div className="p-4 space-y-4 max-h-[800px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No candidates scanned yet.</p>
              ) : (
                history.map((item, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-300 transition-colors cursor-default">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">{item.date}</span>
                      <span className={`text-sm font-black px-2 py-1 rounded-full ${
                        item.score >= 80 ? 'bg-green-100 text-green-700' : 
                        item.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.score} / 100
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{item.summary_preview}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}