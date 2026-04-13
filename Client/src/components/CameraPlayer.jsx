import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js/dist/hls.min.js';

export default function CameraPlayer({ hlsUrl }) {
  const videoRef = useRef(null);
  const [streamDisponivel, setStreamDisponivel] = useState(null); // null = verificando

  useEffect(() => {
    if (!hlsUrl) {
      setStreamDisponivel(false);
      return;
    }

    const src = `http://localhost:8000${hlsUrl}`;

    // Verifica se o stream existe antes de tentar carregar
    const controller = new AbortController();
    fetch(src, { method: 'HEAD', signal: controller.signal })
      .then((res) => {
        if (res.ok) {
          setStreamDisponivel(true);
        } else {
          setStreamDisponivel(false);
        }
      })
      .catch(() => {
        setStreamDisponivel(false);
      });

    return () => controller.abort();
  }, [hlsUrl]);

  useEffect(() => {
    if (!streamDisponivel) return;

    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    const src = `http://localhost:8000${hlsUrl}`;

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      return () => hls.destroy();
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.play().catch(() => {});
    }
  }, [streamDisponivel, hlsUrl]);

  if (!hlsUrl || streamDisponivel === false) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: '#111',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff4444',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'center',
          padding: '16px',
        }}
      >
        Stream não disponível. Verifique se a câmera está ativa.
      </div>
    );
  }

  if (streamDisponivel === null) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: '#111',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#aaa',
          fontSize: '13px',
        }}
      >
        Conectando ao stream...
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      muted
      playsInline
      style={{ width: '100%', borderRadius: '8px', background: '#000' }}
    />
  );
}