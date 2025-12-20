import React, { useState, useRef, useEffect } from 'react';

const SimpleMicTester: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 오디오 컨텍스트 및 스트림 관리를 위한 Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const startMicrophone = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // AudioContext 생성
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Analyser 설정 (볼륨 분석용)
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // 마이크 소스를 Analyser에 연결
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      setIsListening(true);
      draw(); // 볼륨 측정 루프 시작
    } catch (err) {
      console.error("마이크 접근 실패:", err);
      setError("마이크에 접근할 수 없습니다. 권한을 확인해주세요.");
    }
  };

  const stopMicrophone = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsListening(false);
    setVolume(0);
  };

  // 볼륨 계산 및 업데이트 루프
  const draw = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // 전체 주파수 대역의 평균값을 볼륨으로 사용 (0 ~ 255)
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const average = sum / dataArrayRef.current.length;

    // 보기 좋게 스케일 조정 (입력이 작을 수 있으므로 약간 증폭)
    const normalizedVolume = Math.min(100, (average / 256) * 100 * 3); 
    
    setVolume(normalizedVolume);

    rafIdRef.current = requestAnimationFrame(draw);
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎙️ 마이크 테스트</h2>
      
      {/* 볼륨 게이지 바 */}
      <div style={styles.meterContainer}>
        <div 
          style={{
            ...styles.meterFill,
            width: `${volume}%`,
            backgroundColor: volume > 80 ? '#ef4444' : volume > 50 ? '#eab308' : '#22c55e'
          }} 
        />
      </div>
      <p style={styles.volumeText}>입력 레벨: {Math.round(volume)}%</p>

      {error && <p style={styles.error}>{error}</p>}

      <button
        onClick={isListening ? stopMicrophone : startMicrophone}
        style={{
          ...styles.button,
          backgroundColor: isListening ? '#ef4444' : '#3b82f6',
        }}
      >
        {isListening ? '테스트 종료' : '테스트 시작'}
      </button>
    </div>
  );
};

// 간단한 스타일 정의 (CSS-in-JS)
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    maxWidth: '400px',
    margin: '20px auto',
    textAlign: 'center',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white',
  },
  title: {
    marginBottom: '15px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  meterContainer: {
    width: '100%',
    height: '24px',
    backgroundColor: '#e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  meterFill: {
    height: '100%',
    transition: 'width 0.1s ease-out, background-color 0.2s',
  },
  volumeText: {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginBottom: '20px',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.9rem',
    marginBottom: '10px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background-color 0.2s',
  },
};

export default SimpleMicTester;