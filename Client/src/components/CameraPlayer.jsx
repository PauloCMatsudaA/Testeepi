import { useEffect, useRef, useState } from "react";
import Hls from "hls.js/dist/hls.min.js";

// Adiciona ?t=<timestamp> para evitar cache da playlist .m3u8 e
// garantir que o player sempre busque os segmentos mais recentes.
function buildSrc(baseUrl) {
  return `http://localhost:8000${baseUrl}?t=${Date.now()}`;
}

export default function CameraPlayer({ hlsUrl }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [streamDisponivel, setStreamDisponivel] = useState(null); // null = verificando

  useEffect(() => {
    if (!hlsUrl) {
      setStreamDisponivel(false);
      return;
    }

    const src = buildSrc(hlsUrl);

    // Verifica se o stream existe antes de tentar carregar
    const controller = new AbortController();
    fetch(src, { method: "GET", signal: controller.signal })
      .then((res) => {
        setStreamDisponivel(res.ok);
        res.body?.cancel(); // descarta o corpo para não baixar o arquivo todo
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

    // Destrói instância anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const src = buildSrc(hlsUrl);

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        // Força re-fetch da playlist a cada ciclo para acompanhar novos segmentos
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 500,
        // Sempre pega os segmentos mais recentes ao carregar
        startPosition: -1,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      // Se a playlist retornar 404, tenta recuperar com nova URL (novo timestamp)
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.loadSource(buildSrc(hlsUrl));
            hls.startLoad();
          } else {
            hls.destroy();
            setStreamDisponivel(false);
          }
        }
      });

      hlsRef.current = hls;
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    // Fallback para Safari (suporte nativo HLS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
    }
  }, [streamDisponivel, hlsUrl]);

  if (!hlsUrl || streamDisponivel === false) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          background: "#111",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ff4444",
          fontSize: "13px",
          fontWeight: 500,
          textAlign: "center",
          padding: "16px",
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
          width: "100%",
          aspectRatio: "16/9",
          background: "#111",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#aaa",
          fontSize: "13px",
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
      style={{ width: "100%", borderRadius: "8px", background: "#000" }}
    />
  );
}
