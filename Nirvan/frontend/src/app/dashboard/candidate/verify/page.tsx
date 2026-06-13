"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type DocItem = {
  id: string;
  name: string;
  institution: string;
  year: string;
  type: string;
  status: "Verified ✓" | "Under Review ⏳";
};

export default function CandidateVerifyPage() {
  const [identityStep, setIdentityStep] = useState<1 | 2 | 3>(1); // 1: Form, 2: Loading, 3: Success
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [progressText, setProgressText] = useState({
    format: "In progress ⏳",
    extract: "Pending ⏳",
    auth: "Pending ⏳",
  });

  // Professional Verification State
  const [docType, setDocType] = useState("Academic Certificate");
  const [docName, setDocName] = useState("");
  const [instName, setInstName] = useState("");
  const [docYear, setDocYear] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  
  const [uploadedDocs, setUploadedDocs] = useState<DocItem[]>([
    {
      id: "1",
      name: "Bachelor of Engineering",
      institution: "KEC, TU",
      year: "2025",
      type: "Academic Certificate",
      status: "Under Review ⏳",
    },
    {
      id: "2",
      name: "Fusemachines AI Fellowship",
      institution: "Fusemachines Inc.",
      year: "2026",
      type: "Professional Certificate",
      status: "Verified ✓",
    },
    {
      id: "3",
      name: "Experience Letter",
      institution: "Leapfrog Technology",
      year: "2025",
      type: "Experience Letter",
      status: "Under Review ⏳",
    },
  ]);

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontFile || !backFile) return;
    setIdentityStep(2);
  };

  useEffect(() => {
    if (identityStep === 2) {
      const t1 = setTimeout(() => {
        setProgressText((prev) => ({ ...prev, format: "Complete ✓" }));
      }, 700);

      const t2 = setTimeout(() => {
        setProgressText((prev) => ({ ...prev, format: "Complete ✓", extract: "Complete ✓" }));
      }, 1400);

      const t3 = setTimeout(() => {
        setProgressText({
          format: "Complete ✓",
          extract: "Complete ✓",
          auth: "Complete ✓",
        });
      }, 2100);

      const t4 = setTimeout(() => {
        setIdentityStep(3);
        setIdentityVerified(true);
      }, 2800);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [identityStep]);

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !instName || !docYear || !docFile) return;

    const newDoc: DocItem = {
      id: Math.random().toString(),
      name: docName,
      institution: instName,
      year: docYear,
      type: docType,
      status: "Under Review ⏳",
    };

    setUploadedDocs((prev) => [newDoc, ...prev]);
    setDocName("");
    setInstName("");
    setDocYear("");
    setDocFile(null);
    alert(`Document "${docName}" uploaded successfully for review!`);
  };

  // Trust score calculations
  const educationScore = 15; // Education Verified (+15)
  const githubScore = 20; // GitHub Verified (+20)
  const assessmentScore = 10; // Assessment Completed (+10)
  const identityScore = identityVerified ? 20 : 0;
  
  const totalTrustScore = educationScore + githubScore + assessmentScore + identityScore + 7; // +7 offset base
  let trustLevel = "Basic";
  let trustBadgeColor = "bg-slate-100 text-slate-700 border-slate-200";

  if (totalTrustScore >= 71) {
    trustLevel = "Trusted";
    trustBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (totalTrustScore >= 41) {
    trustLevel = "Verified";
    trustBadgeColor = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left">
      <div className="border-b border-card-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          🛡️ Candidate Professional Verification
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
            Trust Audit
          </span>
        </h1>
        <p className="text-sm text-muted">
          Verify your identity credentials and professional background certificates to increase your Platform Trust Score and attract elite recruiters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Verification Sections (Identity + Professional Background) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* SECTION 1: Identity Verification */}
          <div className="bg-white border border-card-border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Verify Your Identity</h2>
              <p className="text-xs text-muted mt-0.5">Upload your Nepal citizenship certificate cards to verify credentials.</p>
            </div>

            <AnimatePresence mode="wait">
              {identityStep === 1 && (
                <motion.form
                  key="id-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleIdentitySubmit}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Front Side */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Citizenship Front</span>
                      <div className="border border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50/50 transition-all text-center relative cursor-pointer min-h-[120px] flex flex-col justify-center items-center">
                        <input
                          type="file"
                          required
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files && setFrontFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {frontFile ? (
                          <div className="space-y-1">
                            <span className="text-xl block">✓</span>
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px] block">{frontFile.name}</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xl block">🪪</span>
                            <span className="text-[11px] font-semibold text-slate-600 block">Upload front side</span>
                            <span className="text-[9px] text-slate-400 block">PDF, JPG, PNG up to 5MB</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Back Side */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Citizenship Back</span>
                      <div className="border border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50/50 transition-all text-center relative cursor-pointer min-h-[120px] flex flex-col justify-center items-center">
                        <input
                          type="file"
                          required
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files && setBackFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {backFile ? (
                          <div className="space-y-1">
                            <span className="text-xl block">✓</span>
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px] block">{backFile.name}</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xl block">🪪</span>
                            <span className="text-[11px] font-semibold text-slate-600 block">Upload back side</span>
                            <span className="text-[9px] text-slate-400 block">PDF, JPG, PNG up to 5MB</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full text-center rounded-xl bg-accent hover:bg-accent/90 text-white font-bold py-2.5 text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                  >
                    Verify Identity Credentials
                  </button>
                </motion.form>
              )}

              {identityStep === 2 && (
                <motion.div
                  key="id-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 space-y-6 text-center max-w-sm mx-auto"
                >
                  <div className="flex justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">Processing Identity Documents...</h4>
                    <p className="text-[10px] text-slate-400">Verifying photo matching and document authenticity</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 divide-y divide-slate-100 text-left text-xs font-medium space-y-2.5">
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-slate-500">Checking document format...</span>
                      <span className="font-bold text-slate-700">{progressText.format}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500">Extracting name & DOB details...</span>
                      <span className="font-bold text-slate-700">{progressText.extract}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500">Validating authenticity metrics...</span>
                      <span className="font-bold text-slate-700">{progressText.auth}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {identityStep === 3 && (
                <motion.div
                  key="id-success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4 max-w-md mx-auto text-center"
                >
                  <div className="mx-auto h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg border border-emerald-200">
                    ✓
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm">Identity Verified Successfully</h4>
                    <span className="text-emerald-700 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider inline-block font-extrabold">
                      🛡️ Identity Verified ✓
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-left text-xs divide-y divide-slate-100 space-y-2">
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">Full Name</span>
                      <span className="font-bold text-slate-800">Viraj Sawad</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">Citizenship No</span>
                      <span className="font-bold text-slate-800">12-345-678</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">District Origin</span>
                      <span className="font-bold text-slate-800">Kathmandu, Nepal</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SECTION 2: Professional Verification */}
          <div className="bg-white border border-card-border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Verify Your Professional Background</h2>
              <p className="text-xs text-muted mt-0.5">Upload diplomas, certifications, or employment experience verification records.</p>
            </div>

            {/* Document Uploader Form */}
            <form onSubmit={handleAddDocument} className="space-y-4 bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Doc Type Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 bg-white"
                  >
                    <option value="Academic Certificate">Academic Certificate</option>
                    <option value="Professional Certificate">Professional Certificate</option>
                    <option value="Experience Letter">Experience Letter</option>
                    <option value="Recommendation Letter">Recommendation Letter</option>
                  </select>
                </div>

                {/* Document Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Document Name</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Bachelor's Degree in CE"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Institution Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Issuing Institution</label>
                  <input
                    type="text"
                    required
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    placeholder="e.g. Kathmandu Engineering College (KEC)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Year Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Graduation / Issue Year</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={docYear}
                    onChange={(e) => setDocYear(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 2025"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Upload Certificate file */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Document File</label>
                <div className="border border-dashed border-slate-200 rounded-lg p-3 hover:bg-slate-100/40 relative cursor-pointer text-center flex items-center justify-center min-h-[60px]">
                  <input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files && setDocFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {docFile ? (
                    <span className="text-xs font-semibold text-slate-700 truncate">{docFile.name}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold">Click to upload document certificate file (PDF, JPG, PNG)</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-accent hover:bg-accent/90 text-white font-bold px-4 py-1.5 text-xs tracking-wider uppercase shadow-sm cursor-pointer"
                >
                  Add Document +
                </button>
              </div>
            </form>

            {/* List of uploaded documents */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Uploaded Certificates History</span>
              <div className="divide-y divide-slate-150 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800">{doc.name}</span>
                      <p className="text-[10px] text-slate-500">{doc.institution} • {doc.year} ({doc.type})</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      doc.status.includes("Verified")
                        ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right side Trust Score Component Panel */}
        <div className="space-y-6">
          <div className="bg-white border border-card-border rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Candidate Audit</span>
              <h3 className="font-bold text-slate-800 text-sm mt-0.5">Candidate Trust Score</h3>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-extrabold text-slate-800">{totalTrustScore} <span className="text-xs text-slate-400 font-medium">/ 100</span></span>
                <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${trustBadgeColor}`}>
                  {trustLevel}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalTrustScore}%` }}
                />
              </div>
            </div>

            <div className="space-y-3.5 border-t border-slate-100 pt-4">
              {/* Factor 1 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={`font-medium flex items-center gap-1.5 ${identityVerified ? "text-slate-600" : "text-slate-400"}`}>
                    {identityVerified ? "✓ Identity Verified" : "⏳ Identity Verification"}
                  </span>
                  <span className={`font-bold text-[10px] ${identityVerified ? "text-slate-700" : "text-slate-400"}`}>
                    {identityVerified ? "+20" : "+0"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-emerald-500 rounded-full transition-all duration-500 ${identityVerified ? "w-[100%]" : "w-0"}`} />
                </div>
              </div>

              {/* Factor 2 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600 flex items-center gap-1.5">
                    ✓ Education Verified
                  </span>
                  <span className="font-bold text-slate-700 text-[10px]">+15</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[100%]" />
                </div>
              </div>

              {/* Factor 3 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-400 flex items-center gap-1.5">
                    Employment Verified
                  </span>
                  <span className="font-bold text-slate-400 text-[10px]">+20</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200 rounded-full w-0" />
                </div>
              </div>

              {/* Factor 4 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600 flex items-center gap-1.5">
                    ✓ GitHub Verified
                  </span>
                  <span className="font-bold text-slate-700 text-[10px]">+20</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[100%]" />
                </div>
              </div>

              {/* Factor 5 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-400 flex items-center gap-1.5">
                    Expert Review Complete
                  </span>
                  <span className="font-bold text-slate-400 text-[10px]">+15</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200 rounded-full w-0" />
                </div>
              </div>

              {/* Factor 6 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600 flex items-center gap-1.5">
                    ✓ Assessment Completed
                  </span>
                  <span className="font-bold text-slate-700 text-[10px]">+10</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[100%]" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-3.5 text-[10px] text-slate-500 leading-normal flex items-start gap-1.5">
              <span>💡</span>
              <span>Complete all identity and employment background verification tasks to unlock elite matches and receive a green <b>Trusted</b> badge.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
