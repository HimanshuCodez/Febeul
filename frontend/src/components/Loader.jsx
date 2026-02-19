import { useState, useEffect, useRef } from "react";
import { RiSparklingFill, RiSparklingLine } from "react-icons/ri";
import { PiStarFourFill, PiFlowerLotusBold } from "react-icons/pi";
import { HiSparkles } from "react-icons/hi2";
import { TbSparkles } from "react-icons/tb";

const floaters = [
  { Icon: RiSparklingFill,   size: 13, left: "6%",  dur: 3.8, delay: 0   },
  { Icon: HiSparkles,        size: 17, left: "20%", dur: 4.2, delay: 0.7 },
  { Icon: PiStarFourFill,    size: 11, left: "37%", dur: 3.5, delay: 1.4 },
  { Icon: TbSparkles,        size: 15, left: "54%", dur: 4.6, delay: 0.3 },
  { Icon: RiSparklingLine,   size: 12, left: "70%", dur: 3.9, delay: 1.1 },
  { Icon: PiFlowerLotusBold, size: 14, left: "83%", dur: 4.0, delay: 0.5 },
  { Icon: PiStarFourFill,    size: 10, left: "94%", dur: 3.6, delay: 1.8 },
];

// SVG viewBox dims for the big FEBEUL text
const VW = 520;
const VH = 140;

export default function FebeulLoader() {
  const [fill, setFill] = useState(0);
  const raf = useRef(null);
  const start = useRef(null);
  const DURATION = 4000;

  useEffect(() => {
    const animate = (ts) => {
      if (!start.current) start.current = ts;
      const elapsed = (ts - start.current) % DURATION;
      setFill((elapsed / DURATION) * 100);
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const pct = Math.min(fill, 100);
  // y position of fill (from bottom): at 0% fillY=VH, at 100% fillY=0
  const fillY = VH - (VH * pct) / 100;
  // wave amplitude
  const waveH = 10;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,700;1,400&family=Raleway:wght@200;300&display=swap');

        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(-12deg) scale(0.7); opacity: 0; }
          10%  { opacity: 0.55; }
          75%  { opacity: 0.3; }
          100% { transform: translateY(-260px) rotate(16deg) scale(1.1); opacity: 0; }
        }
        .floater { animation: floatUp linear infinite; }

        @keyframes wave {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .wave-anim { animation: wave 2s linear infinite; }

        @keyframes bloom {
          0%,100% { transform: translate(-50%,-50%) scale(1);    opacity: 0.18; }
          50%      { transform: translate(-50%,-50%) scale(1.13); opacity: 0.3;  }
        }
        .bloom { animation: bloom 3.5s ease-in-out infinite; }

        @keyframes dotBounce {
          0%,80%,100% { transform: translateY(0); }
          40%          { transform: translateY(-7px); }
        }

        @keyframes subtlePulse {
          0%,100% { opacity: 0.55; }
          50%      { opacity: 0.9; }
        }
        .outline-text { animation: subtlePulse 2.8s ease-in-out infinite; }
      `}</style>

      {/* root */}
      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "#fdf5f5", fontFamily: "'Raleway', sans-serif" }}
      >
        {/* bloom glow */}
        <div
          className="bloom absolute rounded-full pointer-events-none"
          style={{
            width: 640, height: 400,
            background: "radial-gradient(ellipse, #f9aeaf3a 0%, transparent 70%)",
            top: "50%", left: "50%",
          }}
        />

        {/* floating icons */}
        {floaters.map(({ Icon, size, left, dur, delay }, i) => (
          <div
            key={i}
            className="floater absolute bottom-6 pointer-events-none"
            style={{ left, animationDuration: `${dur}s`, animationDelay: `${delay}s`, color: "#f9aeaf" }}
          >
            <Icon size={size} />
          </div>
        ))}

        {/* ── MAIN CONTENT ── */}
        <div className="relative z-10 flex flex-col items-center gap-8 px-6">

          {/* ── THE BIG FILLING TEXT ── */}
          <div style={{ width: "100%", maxWidth: 560 }}>
            <svg
              viewBox={`0 0 ${VW} ${VH}`}
              width="100%"
              style={{ overflow: "visible", display: "block" }}
            >
              <defs>
                {/* The text shape used as a clip path */}
                <clipPath id="text-clip">
                  <text
                    x="50%"
                    y="108"
                    textAnchor="middle"
                    fontFamily="'Cormorant Garamond', serif"
                    fontWeight="700"
                    fontSize="128"
                    letterSpacing="8"
                  >
                    FEBEUL
                  </text>
                </clipPath>

                {/* Gradient for the liquid fill */}
                <linearGradient id="liq-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f9aeaf" stopOpacity="0.72" />
                  <stop offset="100%" stopColor="#e07f82" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Ghost / outline letters (always visible, subtle) */}
              <text
                className="outline-text"
                x="50%"
                y="108"
                textAnchor="middle"
                fontFamily="'Cormorant Garamond', serif"
                fontWeight="700"
                fontSize="128"
                letterSpacing="8"
                fill="none"
                stroke="#f9aeaf"
                strokeWidth="1.5"
                opacity="0.35"
              >
                FEBEUL
              </text>

              {/* ── LIQUID FILL clipped to letters ── */}
              <g clipPath="url(#text-clip)">
                {/* solid fill rect rising from bottom */}
                <rect
                  x="0"
                  y={fillY + waveH}
                  width={VW}
                  height={VH - fillY}
                  fill="url(#liq-grad)"
                />

                {/* animated wave surface */}
                {pct > 0.5 && (
                  <svg
                    className="wave-anim"
                    x={-VW}
                    y={fillY - waveH + 2}
                    width={VW * 2}
                    height={waveH * 2}
                    viewBox={`0 0 ${VW * 2} ${waveH * 2}`}
                    preserveAspectRatio="none"
                  >
                    <path
                      d={`M0 ${waveH} C${VW * 0.25} 0 ${VW * 0.5} ${waveH * 2} ${VW * 0.75} ${waveH} C${VW} 0 ${VW * 1.25} ${waveH * 2} ${VW * 1.5} ${waveH} C${VW * 1.75} 0 ${VW * 2} ${waveH * 2} ${VW * 2} ${waveH} L${VW * 2} ${waveH * 2} L0 ${waveH * 2} Z`}
                      fill="url(#liq-grad)"
                    />
                  </svg>
                )}

                {/* sparkle glyphs inside filled area */}
                {[
                  { x: 80,  y: 60,  s: 14, delay: 0    },
                  { x: 180, y: 90,  s: 10, delay: 0.4  },
                  { x: 260, y: 50,  s: 12, delay: 0.9  },
                  { x: 360, y: 80,  s: 9,  delay: 0.2  },
                  { x: 450, y: 65,  s: 11, delay: 0.7  },
                ].map(({ x, y, s, delay }, i) =>
                  y > fillY + waveH ? (
                    <text
                      key={i}
                      x={x}
                      y={y}
                      fontSize={s}
                      fill="white"
                      fillOpacity="0.6"
                      textAnchor="middle"
                      style={{
                        animation: `subtlePulse 2s ease-in-out infinite`,
                        animationDelay: `${delay}s`,
                      }}
                    >
                      ✦
                    </text>
                  ) : null
                )}
              </g>
            </svg>
          </div>

          {/* percentage + thin rule */}
          <div className="flex items-center gap-4 w-full" style={{ maxWidth: 400 }}>
            <div style={{ flex: 1, height: 1, background: "#f9aeaf", opacity: 0.35 }} />
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 18,
              color: "#c98a8b",
              minWidth: 44,
              textAlign: "center",
            }}>
              {Math.round(pct)}%
            </span>
            <div style={{ flex: 1, height: 1, background: "#f9aeaf", opacity: 0.35 }} />
          </div>

          {/* tagline */}
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 19,
            color: "#b87a7b",
            letterSpacing: "0.04em",
            lineHeight: 1.5,
            textAlign: "center",
          }}>
            something beautiful is on its way
          </p>

          {/* bouncing dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 5, height: 5,
                  background: "#f9aeaf",
                  animation: `dotBounce 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.22}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}