'use client';

import { AlertCircle, CheckCircle, Loader2, Mic, Phone, PhoneOutgoing, Power, Square } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getInitialOffers, processUserResponse } from './backendLogic';
import { CarDisplay } from './CarDisplay';
import { BackendSessionData, BookingContext, FlowState } from './types';

interface AgentProps {
    bookingContext: BookingContext | null; // Changed to allow null initially
    onBack: () => void;
    isActive: boolean; // New prop to track visibility
}

const WhisperDIDAgent: React.FC<AgentProps> = ({ bookingContext, onBack, isActive }) => {

    // --- Config ---
    const didAgentId = process.env.NEXT_PUBLIC_DID_AGENT_ID || '';
    const didKey = process.env.NEXT_PUBLIC_DID_API_KEY || '';
    const openAIKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

    // --- State ---
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState('');
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'success' | 'failed'>('idle');
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);

    // --- Workflow State ---
    const [flowState, setFlowState] = useState<FlowState>('CONNECTING');
    const [sessionData, setSessionData] = useState<BackendSessionData | null>(null);
    const hasSpokenIntro = useRef(false);

    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const agentRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    // ---------------------------------------------------------
    // 1. CONNECT IMMEDIATELY (Runs once on App Load)
    // ---------------------------------------------------------
    useEffect(() => {
        if (!didAgentId || !didKey || !openAIKey) {
            setError('Missing API Keys');
            return;
        }
        // We connect immediately, regardless of booking data
        connect();

        return () => {
            if (agentRef.current) agentRef.current.disconnect();
        };
    }, []);

    // ---------------------------------------------------------
    // 2. FETCH DATA (Runs when user selects car)
    // ---------------------------------------------------------
    useEffect(() => {
        const initSession = async () => {
            // Only fetch if we have the context AND a selected car
            if (bookingContext && bookingContext.selectedCar && !sessionData) {
                try {
                    const data = await getInitialOffers(bookingContext);
                    setSessionData(data);
                } catch (err) {
                    console.error("Error initializing session:", err);
                    setError("Failed to load offer data");
                }
            }
        };
        initSession();
    }, [bookingContext]);

    // ---------------------------------------------------------
    // 3. UNMUTE & START TALKING (Runs when Active + Connected + Data)
    // ---------------------------------------------------------
    useEffect(() => {
        // If the user is now looking at the agent, unmute the video
        if (isActive && videoRef.current) {
            videoRef.current.muted = false;
        }

        // Logic to trigger the intro speech
        if (isActive && status === 'connected' && isVideoReady && sessionData && !hasSpokenIntro.current) {
            // Slight delay to ensure transition animation is done

            hasSpokenIntro.current = true;
            startUpsellSequence();
            return;
        }
    }, [isActive, status, isVideoReady, sessionData]);


    // ---------------------------------------------------------
    // LOGIC & HANDLERS
    // ---------------------------------------------------------

    const connect = async () => {
        // Prevent double connection attempts
        if (status === 'connecting' || status === 'connected') return;

        setStatus('connecting');
        setIsVideoReady(false);
        try {
            const { createAgentManager } = await import('@d-id/client-sdk');
            agentRef.current = await createAgentManager(didAgentId, {
                auth: { type: 'key', clientKey: didKey },
                mode: 'motion',
                callbacks: {
                    onSrcObjectReady: (stream: MediaStream) => {
                        streamRef.current = stream;
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                            // CRITICAL: Mute initially so browser allows autoplay in background
                            videoRef.current.muted = true;
                            videoRef.current.play().catch(e => console.log("Autoplay blocked", e));
                        }
                    },
                    onVideoStateChange: (state: string) => {
                        if (videoRef.current && agentRef.current) {
                            if (state === "STOP") {
                                videoRef.current.srcObject = null;
                                videoRef.current.src = agentRef.current.agent.presenter.idle_video;
                                videoRef.current.loop = true;
                                videoRef.current.play().catch(() => { });
                            } else {
                                videoRef.current.src = "";
                                videoRef.current.srcObject = streamRef.current;
                                videoRef.current.play().catch(() => { });
                            }
                        }
                    },
                    onConnectionStateChange: (s: string) => {
                        if (s === 'connected') setStatus('connected');
                        if (s === 'failed') { setStatus('disconnected'); setError('Connection failed'); }
                    }
                },
                streamOptions: { compatibilityMode: 'on', streamWarmup: true, fluent: true }
            });
            await agentRef.current.connect();
        } catch (e: any) {
            setStatus('disconnected');
            setError('Failed to connect');
        }
    };

    const startUpsellSequence = async () => {
        if (!agentRef.current || !sessionData || !bookingContext) return;
        setFlowState('UPSELL_OFFER');

        const script = `Hi ${bookingContext.client.name}. Unfortunately, the ${sessionData.normal_car.name} you selected is not available at the moment. 
The good news is that for just ${sessionData.upsell_car.price_display.replace(/\+\$(\d+(?:\.\d+)?)\/day/, '$1 dollars a day')} more, you can upgrade to the ${sessionData.upsell_car.name}. 
It feels noticeably faster and more responsive, getting you where you want in a second! You 'll love it. How does it sound?`;

        console.log("Agent Intro Script:", script);
        try {
            await agentRef.current.speak({ type: 'text', input: script, "ssml": true, });
        } catch (e) {
            console.error("❌ Failed to speak intro:", e);
        }
    };

    // --- Escalation Logic ---
    useEffect(() => {
        if (flowState === 'ESCALATED' && callStatus === 'idle') {
            setCallStatus('calling');
            setTimeout(() => { initiateTwilioCall(); }, 2000);
        }
    }, [flowState]);

    useEffect(() => {
        if (flowState === 'COMPLETED') {
            const timer = setTimeout(() => { setShowSuccessScreen(true); }, 10000);
            return () => clearTimeout(timer);
        }
    }, [flowState]);

    const initiateTwilioCall = async () => {
        if (!bookingContext) return;
        try {
            const res = await fetch('/api/call-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: bookingContext.client.name,
                    reason: 'Customer requested human agent during upsell flow'
                })
            });

            if (res.ok) {
                setCallStatus('success');
            } else {
                setCallStatus('failed');
            }
        } catch (e) {
            setCallStatus('failed');
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];
                mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    await processUserAudio(audioBlob);
                    stream.getTracks().forEach(t => t.stop());
                };
                mediaRecorder.start();
                setIsRecording(true);
                setTranscript('Listening...');
            } catch (e) { alert('Mic denied'); }
        }
    };

    const processUserAudio = async (audioBlob: Blob) => {
        if (!sessionData) return;
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-1');

            const sttRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST', headers: { 'Authorization': `Bearer ${openAIKey}` }, body: formData
            });
            const sttData = await sttRes.json();
            const userText = sttData.text || "";
            setTranscript(`"${userText}"`);

            const result = await processUserResponse(flowState, userText, sessionData, openAIKey);
            setFlowState(result.nextState);

            if (agentRef.current && result.agentScript) {
                await agentRef.current.speak({ type: 'text', input: result.agentScript });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const disconnect = async () => {
        if (agentRef.current) await agentRef.current.disconnect();
        onBack();
    };

    return (
        <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700 font-sans">
            <div className="bg-[#191919] rounded-3xl overflow-hidden shadow-2xl border border-gray-800 relative h-[600px] flex flex-col">

                {showSuccessScreen && (
                    <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <div className="bg-green-100 p-6 rounded-full mb-6 animate-bounce">
                            <CheckCircle size={64} className="text-green-600" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-[#191919] mb-2 tracking-tight">Procedure Complete</h2>
                    </div>
                )}

                {/* Top Bar */}
                <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-[#ff5f00] animate-pulse' : 'bg-yellow-500'}`} />
                        <span className="text-white font-bold tracking-wide text-sm italic">SIXT <span className="text-[#ff5f00] not-italic">VIRTUAL</span></span>
                    </div>

                    {flowState === 'ESCALATED' && (
                        <div className={`px-4 py-2 rounded-full flex items-center gap-2 animate-pulse transition-colors shadow-lg font-bold text-white ${callStatus === 'success' ? 'bg-green-600' : 'bg-[#ff5f00]'}`}>
                            {callStatus === 'idle' && <><Phone size={16} /> Requesting Call...</>}
                            {callStatus === 'calling' && <><PhoneOutgoing size={16} /> Dialing You...</>}
                            {callStatus === 'success' && <><Phone size={16} /> Phone Ringing!</>}
                            {callStatus === 'failed' && <><AlertCircle size={16} /> Call Failed</>}
                        </div>
                    )}
                </div>

                {/* Main Stage */}
                <div className="flex-1 relative bg-black min-h-0 flex flex-col justify-center overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        onPlaying={() => setIsVideoReady(true)}
                        className={`w-full h-full object-cover transition-opacity duration-1000 ${status === 'connected' && isVideoReady ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {sessionData && <CarDisplay state={flowState} data={sessionData} />}

                    {/* Loader - Shows if not connected OR if connected but video not ready */}
                    {(!status || status !== 'connected' || !isVideoReady) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#191919] z-20">
                            {error ? (
                                <div className="text-red-400 flex gap-2"><AlertCircle /> {error}</div>
                            ) : (
                                <div className="text-center">
                                    <Loader2 className="w-10 h-10 animate-spin text-[#ff5f00] mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold">Connecting Agent...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="h-24 bg-[#191919] border-t border-gray-800 flex items-center justify-between px-8 shrink-0 z-20 relative">
                    <p className="text-gray-400 italic max-w-lg truncate text-sm">
                        {isProcessing ? "Thinking..." : transcript || "Listening..."}
                    </p>

                    <div className="flex gap-4">
                        {flowState !== 'COMPLETED' && flowState !== 'ESCALATED' && (
                            <button
                                onClick={toggleRecording}
                                disabled={!isVideoReady || isProcessing}
                                className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-[#ff5f00] scale-110 shadow-lg shadow-orange-500/50' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'}`}
                            >
                                {isRecording ? <Square size={20} fill="white" /> : <Mic />}
                            </button>
                        )}
                        <button onClick={disconnect} className="h-14 w-14 rounded-full bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-200 border border-gray-700 flex items-center justify-center">
                            <Power size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhisperDIDAgent;