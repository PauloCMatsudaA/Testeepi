import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function CameraPlayer({ hlsUrl }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(`http://localhost:8000${hlsUrl}`);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = `http://localhost:8000${hlsUrl}`;
    }
  }, [hlsUrl]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      muted
      style={{ width: '100%', borderRadius: '8px', background: '#000' }}
    />
  );
}