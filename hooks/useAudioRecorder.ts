import { useState, useRef, useEffect } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  audioUrl: string | null;
  audioData: Uint8Array | null;
  isPlaying: boolean;
  hasBeenPlayed: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  playAudio: () => void;
  stopPlayback: () => void;
  downloadAudio: () => void;
}

const SAMPLE_RATE = 24000;

export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasBeenPlayed, setHasBeenPlayed] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  const cleanupAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono
          sampleRate: SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      mediaRecorder.current = recorder;
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert Blob to Int16Array for server compatibility
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0); // Get mono channel
        
        // Convert Float32Array to Int16Array
        const int16Array = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          // Convert float [-1.0, 1.0] to int16 [-32768, 32767]
          int16Array[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32767));
        }
        
        setAudioData(new Uint8Array(int16Array.buffer));
        audioChunks.current = []; // Reset chunks for next recording
      };

      setIsRecording(false);
      cleanupAudio();
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      if (audioElement.current) {
        audioElement.current.src = audioUrl;
      } else {
        audioElement.current = new Audio(audioUrl);
      }
      
      audioElement.current.onplay = () => setIsPlaying(true);
      audioElement.current.onended = () => {
        setIsPlaying(false);
        setHasBeenPlayed(true);
      };
      audioElement.current.onpause = () => setIsPlaying(false);
      
      audioElement.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      });
    }
  };

  const stopPlayback = () => {
    if (audioElement.current) {
      audioElement.current.pause();
      audioElement.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = 'recording.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  return {
    isRecording,
    audioUrl,
    audioData,
    isPlaying,
    hasBeenPlayed,
    startRecording,
    stopRecording,
    playAudio,
    stopPlayback,
    downloadAudio,
  };
} 