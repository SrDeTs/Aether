import { useState, useEffect } from "react";

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  cacheKey: string; // ID único da imagem/música no Jellyfin
}

export function CachedImage({ src, cacheKey, alt, className, ...props }: CachedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(() => {
    // Tenta obter do localStorage primeiro para carregamento instantâneo
    try {
      const cached = localStorage.getItem(`img_cache_${cacheKey}`);
      if (cached) {
        return cached;
      }
    } catch (e) {
      console.warn("Erro ao ler cache do localStorage:", e);
    }
    return src;
  });

  // Atualiza a imagem se o src mudar
  useEffect(() => {
    if (!src) return;
    
    // Se o estado atual não for base64 e for diferente do src, atualiza
    if (!imgSrc.startsWith("data:") && imgSrc !== src) {
      setImgSrc(src);
    }
  }, [src, imgSrc]);

  useEffect(() => {
    if (!src || imgSrc.startsWith("data:")) return;

    // Carrega a imagem e converte para base64 em segundo plano
    const img = new Image();
    img.crossOrigin = "anonymous"; // Permite extração pelo canvas sem problemas de CORS
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // Reduz o tamanho máximo de cache para 200px para economizar espaço de forma agressiva no localStorage
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Converte para jpeg com qualidade média para reduzir o tamanho em ~85% (aprox 8-15KB por capa)
          const dataURL = canvas.toDataURL("image/jpeg", 0.7);
          
          try {
            const cacheKeysStr = localStorage.getItem("img_cache_keys") || "[]";
            let cacheKeys: string[] = [];
            try {
              cacheKeys = JSON.parse(cacheKeysStr);
            } catch {
              cacheKeys = [];
            }
            
            // Adiciona a chave atual ao início ou atualiza posição se já existir
            cacheKeys = cacheKeys.filter((k) => k !== cacheKey);
            cacheKeys.unshift(cacheKey);
            
            // Limita o cache a 100 capas (com ~12KB por capa, são aprox. 1.2MB, super seguro e performático!)
            const maxCacheSize = 100;
            while (cacheKeys.length > maxCacheSize) {
              const oldestKey = cacheKeys.pop();
              if (oldestKey) {
                localStorage.removeItem(`img_cache_${oldestKey}`);
              }
            }
            
            localStorage.setItem(`img_cache_${cacheKey}`, dataURL);
            localStorage.setItem("img_cache_keys", JSON.stringify(cacheKeys));
            setImgSrc(dataURL);
          } catch (storageError) {
            console.warn("LocalStorage cheio ou erro de cota. Limpando cache antigo...");
            // Limpa todo o cache de imagens se estourar a cota e reinicia
            try {
              const cacheKeysStr = localStorage.getItem("img_cache_keys") || "[]";
              let cacheKeys: string[] = [];
              try {
                cacheKeys = JSON.parse(cacheKeysStr);
              } catch {
                cacheKeys = [];
              }
              cacheKeys.forEach((k) => localStorage.removeItem(`img_cache_${k}`));
              localStorage.setItem("img_cache_keys", "[]");
              
              localStorage.setItem(`img_cache_${cacheKey}`, dataURL);
              localStorage.setItem("img_cache_keys", JSON.stringify([cacheKey]));
              setImgSrc(dataURL);
            } catch (err) {
              console.warn("Falha ao salvar mesmo limpando o cache:", err);
            }
          }
        }
      } catch (err) {
        // Ignora erros de canvas contaminado (tainted canvas) se o servidor Jellyfin não tiver CORS configurado
        console.warn("Não foi possível converter a imagem para base64:", err);
      }
    };

    img.onerror = () => {
      console.warn("Erro ao carregar imagem para cache:", src);
    };

    img.src = src;
  }, [src, cacheKey, imgSrc]);

  return <img src={imgSrc} alt={alt} className={className} {...props} />;
}
