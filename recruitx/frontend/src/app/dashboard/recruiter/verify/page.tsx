"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function CompanyVerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Form, 2: Loading, 3: Success, 4: Failure
  const [kycNumber, setKycNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [simulateSuccess, setSimulateSuccess] = useState(true);
  const [progressText, setProgressText] = useState({
    format: "In progress ⏳",
    ird: "Pending ⏳",
    cert: "Pending ⏳",
  });
  const [kycVerified, setKycVerified] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(selectedFile));
      } else {
        setFilePreview("pdf-icon");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycNumber || !companyName || !file) return;
    setStep(2);
  };

  useEffect(() => {
    if (step === 2) {
      // Step 2 Simulation
      const t1 = setTimeout(() => {
        setProgressText((prev) => ({ ...prev, format: "Complete ✓" }));
      }, 800);

      const t2 = setTimeout(() => {
        setProgressText((prev) => ({ ...prev, format: "Complete ✓", ird: "Complete ✓" }));
      }, 1800);

      const t3 = setTimeout(() => {
        setProgressText({
          format: "Complete ✓",
          ird: "Complete ✓",
          cert: simulateSuccess ? "Complete ✓" : "Failed ✗",
        });
      }, 2600);

      const t4 = setTimeout(() => {
        if (simulateSuccess) {
          setStep(3);
          setKycVerified(true);
        } else {
          setStep(4);
        }
      }, 3300);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [step, simulateSuccess]);

  const resetVerification = () => {
    setStep(1);
    setProgressText({
      format: "In progress ⏳",
      ird: "Pending ⏳",
      cert: "Pending ⏳",
    });
  };

  // Trust score calculations
  const baseTrustScore = 15; // Domain Email Verified (+15)
  const kycScore = kycVerified ? 30 : 0;
  const totalTrustScore = baseTrustScore + kycScore;
  let trustLevel = "Basic";
  let trustBadgeColor = "bg-slate-100 text-slate-700 border-slate-200";

  if (totalTrustScore > 40) {
    trustLevel = "Verified";
    trustBadgeColor = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left">
      <div className="border-b border-card-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          🏢 Company Business Verification
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
            Nepal IRD Sync
          </span>
        </h1>
        <p className="text-sm text-muted">
          Verify your company business identity using Nepalese KYC certificate credentials to unlock talent marketplace matches.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Verification workflow panel */}
        <div className="lg:col-span-2 bg-white border border-card-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {/* Progress Indicator */}
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Verification Steps</span>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className={`${step === 1 ? "text-accent font-bold" : "text-slate-400"}`}>1. Enter Details</span>
              <span className="text-slate-300">&rarr;</span>
              <span className={`${step === 2 ? "text-accent font-bold" : "text-slate-400"}`}>2. Syncing IRD</span>
              <span className="text-slate-300">&rarr;</span>
              <span className={`${step >= 3 ? "text-accent font-bold" : "text-slate-400"}`}>3. Outcome</span>
            </div>
          </div>

          <div className="p-8 flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* KYC Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">Company KYC Number</label>
                      <input
                        type="text"
                        required
                        maxLength={9}
                        value={kycNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setKycNumber(val);
                        }}
                        placeholder="Enter your 9-digit KYC number"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                      />
                      <span className="text-[10px] text-muted block leading-normal">
                         Nepal Inland Revenue Department (IRD) issued 9-digit registration number.
                      </span>
                    </div>

                    {/* Company Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">Registered Company Name</label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="As it appears on your KYC certificate"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                      />
                      <span className="text-[10px] text-muted block leading-normal">
                        Must match the official registered business identity certificate exactly.
                      </span>
                    </div>
                  </div>

                  {/* Drag and Drop File Upload Area */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">Upload KYC Certificate</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-accent/40 hover:bg-slate-50/50 transition-all text-center relative cursor-pointer">
                      <input
                        type="file"
                        required
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      {file ? (
                        <div className="space-y-3">
                          {filePreview === "pdf-icon" ? (
                            <div className="mx-auto h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center text-red-500 font-bold text-xs border border-red-150">
                              PDF
                            </div>
                          ) : (
                            <img src={filePreview || ""} alt="KYC Preview" className="mx-auto h-24 object-contain rounded-lg border border-slate-200" />
                          )}
                          <div className="text-xs font-semibold text-slate-700">{file.name}</div>
                          <span className="text-[10px] text-muted block">{(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace file</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="text-2xl block">📄</span>
                          <p className="text-xs font-semibold text-slate-700">Drag and drop KYC Certificate file or browse</p>
                          <p className="text-[10px] text-slate-400">Accepts PDF, JPG, PNG up to 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Simulation Controller */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Simulation Outcome</span>
                      <span className="text-[10px] text-slate-400">Choose verification outcome for judges/demos.</span>
                    </div>
                    <select
                      value={simulateSuccess ? "success" : "fail"}
                      onChange={(e) => setSimulateSuccess(e.target.value === "success")}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-650 bg-white"
                    >
                      <option value="success">Success Mode ✓</option>
                      <option value="fail">Failure Mode ✗</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full text-center rounded-xl bg-accent hover:bg-accent/90 text-white font-bold py-3 text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                  >
                    Verify Company & Sync IRD
                  </button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-8 text-center max-w-sm mx-auto"
                >
                  <div className="flex justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-800 text-sm">Syncing IRD database...</h3>
                    <p className="text-[11px] text-muted">This usually takes about 30 seconds. Do not reload page.</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 divide-y divide-slate-100 text-left text-xs font-medium space-y-3">
                    <div className="flex justify-between items-center pb-2.5">
                      <span className="text-slate-500">Checking KYC number format...</span>
                      <span className={`font-bold ${progressText.format.includes("✓") ? "text-emerald-600" : "text-amber-500"}`}>{progressText.format}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-slate-500">Cross-referencing IRD database...</span>
                      <span className={`font-bold ${progressText.ird.includes("✓") ? "text-emerald-600" : "text-amber-500"}`}>{progressText.ird}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2.5">
                      <span className="text-slate-500">Validating certificate authenticity...</span>
                      <span className={`font-bold ${progressText.cert.includes("✓") ? "text-emerald-600" : progressText.cert.includes("✗") ? "text-rose-600" : "text-slate-400"}`}>{progressText.cert}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 text-center max-w-sm mx-auto"
                >
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl border border-emerald-200">
                    ✓
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-800 text-base">Company Verified Successfully</h3>
                    <p className="text-xs text-muted">Nepal Inland Revenue Department business registration details confirmed.</p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/25 p-5 text-left text-xs space-y-2.5 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                    <div>
                      <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider block">Registered Business</span>
                      <span className="font-bold text-slate-800 text-sm block">{companyName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider block">Tax Identification No</span>
                      <span className="font-semibold text-slate-700 block">KYC: {kycNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-emerald-100/50 mt-1.5">
                      <span className="text-emerald-600 font-bold border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider flex items-center gap-1">
                        🛡️ KYC Verified ✓
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 leading-normal">
                    Your company profile now shows the verified badge to all candidates in matchmaking, job postings, and negotiation logs.
                  </div>

                  <button
                    onClick={() => router.push("/dashboard/recruiter")}
                    className="w-full text-center rounded-xl bg-accent hover:bg-accent/90 text-white font-bold py-2.5 text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                  >
                    Continue to Dashboard
                  </button>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 text-center max-w-sm mx-auto"
                >
                  <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xl border border-rose-200">
                    ✕
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-800 text-base">Verification Failed</h3>
                    <p className="text-xs text-muted">The KYC certificate does not match registered database parameters.</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-left text-xs space-y-2">
                    <span className="font-bold text-slate-700 block">Common reasons:</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500 leading-normal">
                      <li>Typed KYC number does not match image certificate.</li>
                      <li>Incomplete/cut off KYC certificate scan upload.</li>
                      <li>Inland Revenue Department registry mismatch.</li>
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={resetVerification}
                      className="flex-1 text-center rounded-xl bg-accent text-white font-bold py-2.5 text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => alert("Support ticket created. Our team will review manually.")}
                      className="flex-1 text-center rounded-xl bg-white border border-slate-200 text-slate-600 font-bold py-2.5 text-xs tracking-wider uppercase hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Support
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side Trust Score Component Panel */}
        <div className="space-y-6">
          <div className="bg-white border border-card-border rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Company Audit</span>
              <h3 className="font-bold text-slate-800 text-sm mt-0.5">Profile Trust Score</h3>
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
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalTrustScore}%` }}
                />
              </div>
            </div>

            <div className="space-y-3.5 border-t border-slate-100 pt-4">
              {/* Factor 1 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600 flex items-center gap-1.5">
                    ✓ Domain Email Verified
                  </span>
                  <span className="font-bold text-slate-700 text-[10px]">+15</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[100%]" />
                </div>
              </div>

              {/* Factor 2 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={`font-medium flex items-center gap-1.5 ${kycVerified ? "text-slate-600" : "text-slate-400"}`}>
                    {kycVerified ? "✓ KYC Verified" : "⏳ KYC Verification"}
                  </span>
                  <span className={`font-bold text-[10px] ${kycVerified ? "text-slate-700" : "text-slate-400"}`}>
                    {kycVerified ? "+30" : "+0"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-blue-500 rounded-full transition-all duration-500 ${kycVerified ? "w-[100%]" : "w-0"}`} />
                </div>
              </div>

              {/* Factor 3 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-400 flex items-center gap-1.5">
                    LinkedIn Account Link
                  </span>
                  <span className="font-bold text-slate-400 text-[10px]">+15</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200 rounded-full w-0" />
                </div>
              </div>

              {/* Factor 4 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-400 flex items-center gap-1.5">
                    Business Address Confirmed
                  </span>
                  <span className="font-bold text-slate-400 text-[10px]">+20</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200 rounded-full w-0" />
                </div>
              </div>

              {/* Factor 5 */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-400 flex items-center gap-1.5">
                    Premium Expert Review
                  </span>
                  <span className="font-bold text-slate-400 text-[10px]">+20</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200 rounded-full w-0" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => alert("Upgrade to Premium Verified features starts soon!")}
                className="w-full text-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
              >
                Upgrade to Premium &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
