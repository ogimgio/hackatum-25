'use client';

import { AlertCircle, Loader2, Mic, MicOff, Phone, Power } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getInitialOffers, processUserResponse } from './backendLogic';
import { CarDisplay } from './CarDisplay';
import { BackendSessionData, BookingContext, FlowState } from './types'; // Import BookingContext

interface AgentProps {
    bookingContext: BookingContext; // Update this type
    onBack: () => void;
}

const WhisperDIDAgent: React.FC<AgentProps> = ({ bookingContext, onBack }) => {

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

    // 1. Initialize Session Data
    useEffect(() => {
        if (!didAgentId || !didKey || !openAIKey) {
            setError('Missing API Keys');
            return;
        }
        const data = getInitialOffers(bookingContext);
        setSessionData(data);
        connect();

        return () => {
            if (agentRef.current) agentRef.current.disconnect();
        };
    }, []);

    // 2. Auto-Start Speaking (WITH SAFETY DELAY)
    useEffect(() => {
        // Only run if: Connected AND Video Playing AND Data Loaded AND Not Spoken Yet
        if (status === 'connected' && isVideoReady && sessionData && !hasSpokenIntro.current) {

            // 🛑 FIX: Wait 1 second for the data channel to warm up
            const timer = setTimeout(() => {
                hasSpokenIntro.current = true;
                startUpsellSequence();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [status, isVideoReady, sessionData]);

    const startUpsellSequence = async () => {
        if (!agentRef.current || !sessionData) return;

        console.log("🚀 Starting Upsell Sequence...");

        // Update State to Show UI
        setFlowState('UPSELL_OFFER');

        // Script
        let script = `Hi! Welcome to Sixt. You booked a ${sessionData.normal_car.name}, but for just ${sessionData.upsell_car.price_delta} more, you can drive this ${sessionData.upsell_car.name}. Would you like the upgrade?`;

        // for now only put 10 characters
        script = script.slice(0, 10);

        try {
            await agentRef.current.speak({ type: 'text', input: script });
        } catch (e) {
            console.error("❌ Failed to speak intro:", e);
        }
    };

    const connect = async () => {
        setStatus('connecting');
        setIsVideoReady(false); // Reset

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
                            videoRef.current.play().catch(e => console.log("Autoplay blocked", e));
                        }
                    },
                    onVideoStateChange: (state: string) => {
                        // Switch between Idle Loop and WebRTC Stream
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
                streamOptions: { compatibilityMode: 'on', streamWarmup: true }
            });
            await agentRef.current.connect();
        } catch (e: any) {
            setStatus('disconnected');
            setError('Failed to connect');
        }
    };

    // --- User Input Handling ---
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
            // 1. STT
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-1');

            const sttRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST', headers: { 'Authorization': `Bearer ${openAIKey}` }, body: formData
            });
            const sttData = await sttRes.json();
            const userText = sttData.text || "";
            setTranscript(`"${userText}"`);

            // 2. Logic Decision
            const result = await processUserResponse(flowState, userText, sessionData, openAIKey);

            // 3. Update State & Speak
            setFlowState(result.nextState);

            if (agentRef.current && result.agentScript) {
                console.log("Agent replying:", result.agentScript);
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
        <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700">
            <div className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 relative h-[600px] flex flex-col">

                {/* Top Bar */}
                <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                        <span className="text-white font-semibold tracking-wide text-sm">SIXT VIRTUAL AGENT</span>
                    </div>
                    {flowState === 'ESCALATED' && (
                        <div className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
                            <Phone size={16} /> Connecting to Human...
                        </div>
                    )}
                </div>

                {/* Main Stage - ADDED min-h-0 here */}
                <div className="flex-1 relative bg-black min-h-0 flex flex-col justify-center overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        onPlaying={() => setIsVideoReady(true)}
                        // Changed object-cover to object-contain if you want to see the whole agent, 
                        // or keep object-cover but ensure the container handles the crop.
                        className={`w-full h-full object-cover transition-opacity duration-1000 ${status === 'connected' && isVideoReady ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {/* UI Overlay */}
                    {sessionData && <CarDisplay state={flowState} data={sessionData} />}

                    {/* Loader */}
                    {(!status || status !== 'connected' || !isVideoReady) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20">
                            {error ? (
                                <div className="text-red-400 flex gap-2"><AlertCircle /> {error}</div>
                            ) : (
                                <div className="text-center">
                                    <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
                                    <p className="text-gray-400">Finding your car...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Controls - ADDED shrink-0 and z-20 */}
                <div className="h-24 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-8 shrink-0 z-20 relative">
                    <p className="text-gray-400 italic max-w-lg truncate text-sm">
                        {isProcessing ? "Thinking..." : transcript || "Listening..."}
                    </p>

                    <div className="flex gap-4">
                        {flowState !== 'COMPLETED' && flowState !== 'ESCALATED' && (
                            <button
                                onClick={toggleRecording}
                                disabled={!isVideoReady || isProcessing}
                                className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-orange-500 scale-110 shadow-lg shadow-orange-500/50' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'}`}
                            >
                                {isRecording ? <MicOff /> : <Mic />}
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