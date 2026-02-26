'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, Zap, Terminal, ArrowLeft } from 'lucide-react';
import gsap from 'gsap';

export default function DEFSovereignEngine() {
    const [logIndex, setLogIndex] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const terminalRef = useRef<HTMLDivElement>(null);

    const logMessages = [
        "[OVR] Initializing DEF Sovereign Engine...",
        "[SEC] Encrypted Data Stream Established: 128-bit AES",
        "[DB] Querying Repository: GEORGIA_WC_2026_Q1",
        "[AUD] Julie Y. John Authorized Access. Scanning High-Volume Lit...",
        "[AUD] Analyzing Provider: ATL_ORTHO_GROUP - Discrepancy Found",
        "[SEC] Joseph C. Chancey notified of system baseline optimization.",
        "[SYS] Sentinel HUD synchronizing with DEF Central...",
        "[HLT] Claim #9921-X: Automatic adjustment applied to medical expense.",
        "[OVR] Sovereign Protocol active. Efficiency overhead mitigated by 14%.",
        "[AUD] Analyzing Case Load: Intercepting Associate Attorney workflow...",
        "[INFO] Audit Velocity sustained at 99.1%. No packet loss.",
        "[SEC] Packet Header Verification: EXTREMELY_SAFE"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setLogs(prev => {
                const newLogs = [...prev, `[${new Date().toLocaleTimeString()}] ${logMessages[logIndex % logMessages.length]}`];
                return newLogs.slice(-50);
            });
            setLogIndex(prev => prev + 1);
        }, Math.random() * 2000 + 1000);

        return () => clearInterval(interval);
    }, [logIndex]);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    useEffect(() => {
        gsap.from("#lit-count", {
            textContent: 0,
            duration: 2.5,
            ease: "power2.out",
            snap: { textContent: 1 }
        });

        gsap.from("#audit-rate", {
            textContent: 0,
            duration: 3,
            ease: "circ.out",
            snap: { textContent: 0.1 }
        });
    }, []);

    return (
        <div className="min-h-screen bg-[#002349] text-white font-sans overflow-hidden relative flex flex-col items-center justify-center p-8">
            <div className="absolute inset-0 pointer-events-none bg-[url('https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/cinema_bg.png')] opacity-10 bg-cover bg-center"></div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.1)_51%)] bg-[length:100%_4px]"></div>

            {/* Back Button */}
            <a href="https://truthbtoldhub.com" className="fixed top-8 left-8 z-[100] bg-amber-500/10 border border-amber-500/20 rounded-full w-10 h-10 flex items-center justify-center text-amber-500 hover:bg-amber-500/30 hover:scale-110 transition-all">
                <ArrowLeft className="w-5 h-5" />
            </a>

            <div className="relative w-full max-w-6xl h-full flex flex-col gap-6 z-10">
                {/* Header */}
                <header className="flex justify-between items-center border-b border-amber-500/20 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 border-2 border-amber-500 flex items-center justify-center">
                            <span className="font-serif text-2xl text-amber-500">DEF</span>
                        </div>
                        <div>
                            <h1 className="font-serif text-2xl tracking-[0.3em] text-white uppercase">DEF SOVEREIGN ENGINE</h1>
                            <p className="text-[10px] text-amber-500/60 font-mono tracking-widest">PROPRIETARY WORKERS' COMP AUDIT PROTOCOL</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-mono block">TERMINAL ACCESS: GRANTED</span>
                        <span className="text-[10px] text-amber-500 font-bold font-mono uppercase tracking-widest">LINK ESTABLISHED: JULIE Y. JOHN / JOSEPH C. CHANCEY</span>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
                    {/* Metrics */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-[#002349]/60 backdrop-blur-xl border border-amber-500/20 p-6 rounded-xl flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Active Litigations</span>
                                <ShieldAlert className="w-4 h-4 text-amber-500/40" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span id="lit-count" className="text-5xl font-serif text-white">422</span>
                                <span className="text-xs text-green-400 font-mono">(-4% ADV)</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 w-[65%] shadow-[0_0_10px_rgba(255,191,0,0.5)]"></div>
                            </div>
                        </div>

                        <div className="bg-[#002349]/60 backdrop-blur-xl border border-amber-500/20 p-6 rounded-xl flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Audit Efficiency</span>
                                <Zap className="w-4 h-4 text-amber-500/40" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span id="audit-rate" className="text-5xl font-serif text-white">99.1</span>
                                <span className="text-xs text-amber-500 font-mono">%</span>
                            </div>
                            <div className="flex gap-1">
                                <div className="h-8 flex-1 bg-amber-500/20"></div>
                                <div className="h-8 flex-1 bg-amber-500/40"></div>
                                <div className="h-8 flex-1 bg-amber-500/60"></div>
                                <div className="h-8 flex-1 bg-amber-500 animate-pulse shadow-[0_0_15px_rgba(255,191,0,0.5)]"></div>
                            </div>
                        </div>

                        <div className="bg-[#002349]/60 backdrop-blur-xl border border-amber-500/20 p-6 rounded-xl flex-1 flex flex-col group hover:border-amber-500/40 transition-all">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Sentinel Status</span>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(255,191,0,0.5)] animate-pulse"></div>
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Passive Overwatch Active</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed font-mono">Monitoring DEF Central... Scanning for high-volume litigation discrepancies... Georgia WC Board linked.</p>
                            <div className="mt-auto pt-4 border-t border-white/5">
                                <button className="w-full py-2 bg-amber-600/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all">Emergency Lockdown</button>
                            </div>
                        </div>
                    </div>

                    {/* Terminal */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col">
                        <div className="bg-[#002349]/60 backdrop-blur-xl border border-amber-500/10 rounded-xl p-6 relative overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-2">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-amber-500" />
                                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em]">Forensic Medical Audit Feed</span>
                                </div>
                                <span className="text-[9px] text-gray-600 font-mono uppercase">Agent_Loki_Active</span>
                            </div>

                            <div ref={terminalRef} className="flex-1 font-mono text-[11px] text-white/80 space-y-1.5 overflow-y-auto pr-2">
                                {logs.map((log, i) => (
                                    <div key={i} className="animate-in slide-in-from-left-2 duration-500">
                                        <span className="text-amber-500">[{log.split(']')[0].replace('[', '')}]</span> {log.split(']')[1]}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-amber-500/20 flex items-center gap-2">
                                <span className="text-amber-500 text-xs shadow-amber-500/50 shadow-sm">&gt;</span>
                                <div className="w-2 h-4 bg-amber-500 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="flex justify-between items-center text-[8px] text-gray-600 uppercase tracking-widest font-mono">
                    <span>© 2026 Drew Eckl & Farnham · DEF Sovereign Engine v1.0</span>
                    <span>Authored by Truth B Told Hub</span>
                </footer>
            </div>
        </div>
    );
}
