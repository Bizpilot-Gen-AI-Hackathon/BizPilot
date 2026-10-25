import React, { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Photo helpers                                                       */
/* ------------------------------------------------------------------ */

const BASE = "https://images.unsplash.com/photo-";

export const photoUrl = (id, width = 800, quality = 70) =>
    `${BASE}${id}?auto=format&fit=crop&w=${width}&q=${quality}`;

const buildSrcSet = (id, widths, quality) =>
    widths.map((w) => `${photoUrl(id, w, quality)} ${w}w`).join(", ");

/* Sizes are shared by <SmartImage> and preloadPhoto() so the browser reuses the preload. */
export const PRESETS = {
    wide: { widths: [640, 960, 1400], sizes: "(max-width: 760px) 100vw, 50vw", quality: 72 },
    card: { widths: [480, 720, 960], sizes: "(max-width: 860px) 100vw, 400px", quality: 70 },
    panel: { widths: [720, 1080, 1600], sizes: "(max-width: 900px) 100vw, 46vw", quality: 72 },
    banner: { widths: [640, 960, 1280], sizes: "100vw", quality: 70 },
};

/* Unsplash photo ids. Add more here and reuse them anywhere. */
export const PHOTOS = {
    hero: "1556761175-b413da4baf72",
    analytics: "1460925895917-afdab827c52f",
    retail: "1687293233211-6b0cc3beba70", // small-business owner at a shop counter
    ecommerce: "1586528116311-ad8dd3c8310d",
    team: "1521737711867-e3b97375f902",
    workspace: "1497366754035-f200968a6e72",
    agentResearch: "1485827404703-89b55fcc595e",
    agentOperations: "1516321318423-f06f85e504b3",
    agentInsights: "1531482615713-2afd69097998",
    auth: "1687293233211-6b0cc3beba70",
};

/* Ask the browser to start downloading a photo now, at high priority. */
export function preloadPhoto(id, presetName = "card") {
    if (typeof document === "undefined") return;
    const preset = PRESETS[presetName] || PRESETS.card;
    const key = `si-preload-${id}-${presetName}`;
    if (document.getElementById(key)) return;
    const link = document.createElement("link");
    link.id = key;
    link.rel = "preload";
    link.as = "image";
    link.href = photoUrl(id, preset.widths[1], preset.quality);
    link.setAttribute("imagesrcset", buildSrcSet(id, preset.widths, preset.quality));
    link.setAttribute("imagesizes", preset.sizes);
    document.head.appendChild(link);
}

/* ------------------------------------------------------------------ */
/* Styles (injected once, at import time, so there is no unstyled flash) */
/* ------------------------------------------------------------------ */

const CSS = `
.si{position:absolute;inset:0;display:block;overflow:hidden;background:linear-gradient(135deg,#e6efe5,#d3e4d6)}
.si[data-parallax]{inset:-34px 0;will-change:transform;transform:translate3d(0,var(--py,0px),0)}
.si > img{position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;object-fit:cover}
.si > .si-lqip{filter:blur(18px);transform:scale(1.14);transition:opacity .7s ease .1s}
.si.is-loaded > .si-lqip{opacity:0}
.si > .si-img{opacity:0;filter:blur(10px);transform:scale(1.07);
  transition:opacity .8s cubic-bezier(.2,.7,.2,1),filter 1s cubic-bezier(.2,.7,.2,1),transform 1.4s cubic-bezier(.2,.7,.2,1)}
.si.is-loaded > .si-img{opacity:1;filter:none;transform:none}
.si-shimmer{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.5) 50%,transparent 70%);
  background-size:250% 100%;animation:siShimmer 1.4s ease-in-out infinite}
.si.is-loaded .si-shimmer{display:none}
.si-fallback{position:absolute;inset:0;display:grid;place-items:center;color:#6f9b80;
  background:linear-gradient(135deg,#eef5ed,#dcebdf)}
@keyframes siShimmer{from{background-position:180% 0}to{background-position:-80% 0}}
@media (prefers-reduced-motion:reduce){
  .si > .si-img{transition:opacity .01ms;filter:none;transform:none}
  .si > .si-lqip{transition:none}
  .si-shimmer{animation:none}
}
`;

if (typeof document !== "undefined" && !document.getElementById("si-styles")) {
    const style = document.createElement("style");
    style.id = "si-styles";
    style.textContent = CSS;
    document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Fills its (position: relative) parent.
 *  - a tiny blurred preview appears almost instantly
 *  - the full photo fades in sharp when it has loaded
 *  - priority      : load immediately (above the fold)
 *  - parallax      : drift with scroll (LandingPage's scroll effect drives it)
 *  - fallbackIds   : other photo ids to try if this one fails to load
 */
export default function SmartImage({
    id,
    alt = "",
    preset = "card",
    priority = false,
    parallax = false,
    speed = 0.05,
    fallbackIds = [],
    objectPosition,
    className = "",
    style,
}) {
    const config = PRESETS[preset] || PRESETS.card;
    const candidates = [id, ...fallbackIds];
    const [index, setIndex] = useState(0);
    const [status, setStatus] = useState("loading");
    const imgRef = useRef(null);
    const current = candidates[index];

    useEffect(() => {
        const el = imgRef.current;
        if (el && el.complete && el.naturalWidth > 0) setStatus("loaded");
        else setStatus("loading");
    }, [current]);

    const handleError = () => {
        if (index < candidates.length - 1) setIndex((i) => i + 1);
        else setStatus("error");
    };

    const pos = objectPosition ? { objectPosition } : undefined;

    return (
        <span
            className={`si ${status === "loaded" ? "is-loaded" : ""} ${className}`}
            data-parallax={parallax ? "" : undefined}
            data-speed={parallax ? speed : undefined}
            style={style}
        >
            {status !== "error" && (
                <>
                    <img
                        className="si-lqip"
                        src={photoUrl(current, 32, 25)}
                        alt=""
                        aria-hidden="true"
                        decoding="async"
                        loading={priority ? "eager" : "lazy"}
                        style={pos}
                    />
                    <img
                        key={current}
                        ref={imgRef}
                        className="si-img"
                        src={photoUrl(current, config.widths[1], config.quality)}
                        srcSet={buildSrcSet(current, config.widths, config.quality)}
                        sizes={config.sizes}
                        alt={alt}
                        decoding="async"
                        loading={priority ? "eager" : "lazy"}
                        fetchpriority={priority ? "high" : "auto"}
                        onLoad={() => setStatus("loaded")}
                        onError={handleError}
                        style={pos}
                    />
                </>
            )}

            {status === "loading" && <span className="si-shimmer" aria-hidden="true" />}

            {status === "error" && (
                <span className="si-fallback" role="img" aria-label={alt || "Image unavailable"}>
                    <ImageOff size={22} />
                </span>
            )}
        </span>
    );
}

/* Start fetching the most important photos as soon as the app loads. */
if (typeof window !== "undefined") {
    preloadPhoto(PHOTOS.hero, "wide");
}