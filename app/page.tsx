'use client'

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

import AnimationComponent from '@/component/AnimationComponent'
import { Mic, Speaker } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RealtimeClient } from '@openai/realtime-api-beta';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import { systemPrompt } from '@/public/system'

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);

  // Initialize refs for OpenAI's Realtime API client and audio tools
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
      dangerouslyAllowAPIKeyInBrowser: true,
    })
  );

  // Audio recording and playback utilities initialized with 24kHz sample rate
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );

  // Setup event handlers and cleanup for the realtime client
  useEffect(() => {
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Configure the AI assistant's voice and behavior
    client.updateSession({ 
      voice: 'alloy', 
      instructions: systemPrompt.instructions
    });

    // Handle user interruptions (e.g., when stopping playback)
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });

    // Process incoming audio chunks from the AI
    client.on('conversation.updated', async ({ item, delta }: any) => {
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
    });

    // Cleanup on component unmount
    return () => {
      client.reset();
    };
  }, []);

  // Start recording handler - manages audio recording and streaming to OpenAI
  const handleStartRecording = async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    try {
      // Interrupt any existing audio playback before starting new recording
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }

      // End any existing recording session
      if (wavRecorder.processor) {
        await wavRecorder.end();
      }

      if (!client.isConnected()) {
        await client.connect();
      }

      setIsRecording(true);
      await wavStreamPlayer.connect();
      await wavRecorder.begin('default');
      await wavRecorder.record((data: { mono: Int16Array; raw: Int16Array }) => {
        client.appendInputAudio(data.mono);
      }, 4096);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  // Stop recording handler - manages cleanup and triggers AI response
  const handleStopRecording = async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    
    setIsRecording(false);
    await wavRecorder.pause();

    // Add this: Interrupt any ongoing playback when stopping recording
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }

    client.createResponse();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#d1684e] relative">
      <div className={`fixed top-4 right-4 font-mono text-sm tracking-wider px-3 py-1.5 rounded-full shadow-lg z-50 border ${
        clientRef.current?.isConnected() 
          ? 'bg-green-500/10 backdrop-blur-sm border-green-200/20 text-green-100' 
          : 'bg-black/20 backdrop-blur-sm border-white/10 text-white/90'
      }`}>
        {clientRef.current?.isConnected() ? '● LIVE' : '○ OFFLINE'}
      </div>

      <AnimationComponent size={800} />
      <div className="absolute bottom-8 flex gap-4">
        <button 
          className={`p-4 ${
            isRecording 
              ? 'bg-red-500/20 backdrop-blur-sm border border-red-200/20 text-white shadow-red-500/20' 
              : 'bg-black/20 backdrop-blur-sm border border-white/10 text-white/90'
          } rounded-full hover:bg-black/30 transition-all shadow-lg`}
          onClick={() => isRecording ? handleStopRecording() : handleStartRecording()}
        >
          <Mic size={24} className={`transition-opacity ${isRecording ? 'opacity-100' : 'opacity-90'}`} />
        </button>
      </div>
    </main>
  );
}
