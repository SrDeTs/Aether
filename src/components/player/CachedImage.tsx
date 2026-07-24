import { useState, useEffect, useRef } from "react";

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  cacheKey: string; // ID único da imagem/música no Jellyfin
}

export function CachedImage({ src, cacheKey, alt, className, ...props }: CachedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(() => {
    // Tenta obter do localStorage primeiro para carregamento instantâneo
    try {
      const cached = localStorage.getItem(`img_cache_${cacheKey}`);
      if (cached) return cached;
    } catch (e) {
      console.warn("Erro ao ler cache do localStorage:", e);
    }
    return src;
  });

  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;

  // Recarrega do cache quando o cacheKey muda
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`img_cache_${cacheKey}`);
      if (cached) {
        setImgSrc(cached);
        return;
      }
    } catch {
      // ignore
    }
    setImgSrc(src);
  }, [cacheKey, src]);

  // Carrega a imagem e converte para base64 em background
  useEffect(() => {
    if (!src || imgSrc.startsWith("data:")) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        const maxDimension = 200;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        const dataURL = canvas.toDataURL("image/jpeg", 0.7);

        if (cancelled) return;

        const currentKey = cacheKeyRef.current;
        try {
          const cacheKeysStr = localStorage.getItem("img_cache_keys") || "[]";
          let cacheKeys: string[] = [];
          try {
            cacheKeys = JSON.parse(cacheKeysStr);
          } catch {
            cacheKeys = [];
          }

          cacheKeys = cacheKeys.filter((k) => k !== currentKey);
          cacheKeys.unshift(currentKey);

          const maxCacheSize = 100;
          while (cacheKeys.length > maxCacheSize) {
            const oldestKey = cacheKeys.pop();
            if (oldestKey) localStorage.removeItem(`img_cache_${oldestKey}`);
          }

          localStorage.setItem(`img_cache_${currentKey}`, dataURL);
          localStorage.setItem("img_cache_keys", JSON.stringify(cacheKeys));
          setImgSrc(dataURL);
        } catch {
          // Quota exceeded: clear old cache, try once more
          try {
            const keysStr = localStorage.getItem("img_cache_keys") || "[]";
            let keys: string[] = [];
            try {
              keys = JSON.parse(keysStr);
            } catch {
              keys = [];
            }
            keys.forEach((k) => localStorage.removeItem(`img_cache_${k}`));
            localStorage.setItem("img_cache_keys", "[]");
            localStorage.setItem(`img_cache_${currentKey}`, dataURL);
            localStorage.setItem("img_cache_keys", JSON.stringify([currentKey]));
            if (!cancelled) setImgSrc(dataURL);
          } catch {
            // give up silently
          }
        }
      } catch {
        // tainted canvas (CORS) — ignore
      }
    };

    img.onerror = () => {
      // silently ignore
    };

    img.src = src;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, imgSrc]);

  return <img src={imgSrc} alt={alt} className={className} draggable={false} {...props} />;
}
