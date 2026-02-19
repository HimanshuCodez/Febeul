import { useState, useEffect, useRef } from "react";
import { HiSparkles } from "react-icons/hi2";
import { RiSparklingFill } from "react-icons/ri";
import { PiStarFourFill } from "react-icons/pi";
import { IoClose } from "react-icons/io5";
import { BsTagFill } from "react-icons/bs";
import { FiCopy, FiCheck } from "react-icons/fi";

// ── Confetti particle config ──
const COLORS = ["#f9aeaf", "#ffd6d6", "#ffb347", "#a8edea", "#fed6e3", "#c3cfe2", "#ffecd2", "#f093fb", "#96fbc4", "#f5af19"];
const SHAPES = ["circle", "rect", "star", "ribbon"];

function randomBetween(a, b) { return a + Math.random() * (b - a); }

function generateParticles(n = 90) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: randomBetween(5, 95),        // % from left
    delay: randomBetween(0, 0.9),   // s
    dur: randomBetween(1.6, 2.8),   // s
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    size: randomBetween(5, 12),
    rotate: randomBetween(-180, 180),
    rotateEnd: randomBetween(-360, 360),
    drift: randomBetween(-60, 60),   // px horizontal drift
    yEnd: randomBetween(75, 105),    // % from top at end
  }));
}

function ConfettiParticle({ p }) {
  const style = {
    position: "absolute",
    left: `${p.x}%`,
    top: "-5%",
    width: p.shape === "ribbon" ? p.size * 0.5 : p.size,
    height: p.shape === "ribbon" ? p.size * 2.5 : p.size,
    background: p.shape === "star" ? "transparent" : p.color,
    borderRadius: p.shape === "circle" ? "50%" : p.shape === "rect" ? "2px" : "1px",
    animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
    "--drift": `${p.drift}px`,
    "--rotate-end": `${p.rotateEnd}deg`,
    "--rotate-start": `${p.rotate}deg`,
    "--y-end": `${p.yEnd}vh`,
    pointerEvents: "none",
    zIndex: 60,
  };

  if (p.shape === "star") {
    return (
      <div style={{ ...style, background: "transparent", color: p.color, fontSize: p.size, lineHeight: 1 }}>
        ✦
      </div>
    );
  }
  return <div style={style} />;
}

export default function RedeemPopup({ open, handleClose, coupon }) {
  const [particles, setParticles] = useState([]);
  const [checkVisible, setCheckVisible] = useState(false);
  const autoCloseTimerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setParticles(generateParticles(90));
      setCheckVisible(false);
      // animate checkmark after short delay
      setTimeout(() => setCheckVisible(true), 200);

      // Auto-close after 5 seconds
      autoCloseTimerRef.current = setTimeout(() => {
        handleClose();
      }, 5000);
    } else {
      setCheckVisible(false);
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    }
  }, [open, handleClose]);

  useEffect(() => () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
  }, []);

  if (!open || !coupon) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&family=Raleway:wght@200;400;600&display=swap');

        @keyframes confettiFall {
          0%   { transform: translateY(0)         translateX(0)              rotate(var(--rotate-start)) scale(1);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(var(--y-end)) translateX(var(--drift)) rotate(var(--rotate-end))   scale(0.6); opacity: 0; }
        }

        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalPop {
          0%   { opacity: 0; transform: scale(0.78) translateY(28px); }
          65%  { transform: scale(1.03) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 80; opacity: 0; }
          to   { stroke-dashoffset: 0;  opacity: 1; }
        }
        @keyframes circlePop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.12); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ringPulse {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes tagWiggle {
          0%,100% { transform: rotate(-8deg) scale(1); }
          50%      { transform: rotate(8deg) scale(1.12); }
        }
        @keyframes subtleFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
        @keyframes dotPing {
          0%   { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes shimmerSlide {
          0%   { left: -60%; }
          100% { left: 140%; }
        }

        .modal-card { animation: modalPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards; }
        .backdrop   { animation: backdropIn 0.25s ease forwards; }
        .check-circle { animation: circlePop 0.45s 0.15s cubic-bezier(.34,1.56,.64,1) both; }
        .check-path {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          animation: checkDraw 0.4s 0.55s ease forwards;
        }
        .ring-pulse {
          animation: ringPulse 1s 0.3s ease-out forwards;
        }
        .tag-icon { animation: tagWiggle 2.5s ease-in-out infinite; }
        .float-icon { animation: subtleFloat 3s ease-in-out infinite; }
        .coupon-box {
          position: relative;
          overflow: hidden;
        }
        .coupon-shimmer {
          position: absolute;
          top: 0; bottom: 0;
          width: 55%;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
          animation: shimmerSlide 2s 1.2s ease infinite;
        }
      `}</style>

      {/* ── MODAL OVERLAY ── */}
      <div
        className="backdrop"
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(58,30,32,0.45)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}
      >
        {/* confetti */}
        {particles.map(p => <ConfettiParticle key={p.id} p={p} />)}

        {/* card */}
        <div
          className="modal-card"
          onClick={e => e.stopPropagation()}
          style={{
            background: "white", borderRadius: 28,
            width: "100%", maxWidth: 380,
            boxShadow: "0 24px 80px rgba(240,110,115,0.30), 0 4px 20px rgba(0,0,0,0.08)",
            overflow: "hidden", position: "relative", zIndex: 105,
          }}
        >
          {/* top gradient banner */}
          <div style={{
            background: "linear-gradient(135deg, #f9aeaf 0%, #f07578 55%, #e05c80 100%)",
            padding: "36px 24px 28px",
            position: "relative", textAlign: "center", overflow: "hidden",
          }}>
            {/* decorative circles in banner */}
            {[[-40,-40,140],[220,-30,100],[160,60,60]].map(([x,y,s],i) => (
              <div key={i} style={{
                position: "absolute", left: x, top: y,
                width: s, height: s, borderRadius: "50%",
                background: "rgba(255,255,255,0.1)", pointerEvents: "none",
              }} />
            ))}

            {/* close button */}
            <button onClick={handleClose} style={{
              position: "absolute", top: 14, right: 14,
              background: "rgba(255,255,255,0.22)", border: "none",
              borderRadius: "50%", width: 30, height: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "white",
            }}>
              <IoClose size={17} />
            </button>

            {/* success check animation */}
            <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
              {/* ring pulse */}
              {checkVisible && (
                <div className="ring-pulse" style={{
                  position: "absolute", inset: -12,
                  borderRadius: "50%", border: "3px solid rgba(255,255,255,0.5)",
                }} />
              )}
              {/* circle + check */}
              <svg className="check-circle" width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="34" fill="rgba(255,255,255,0.22)" stroke="white" strokeWidth="2" />
                <polyline
                  className="check-path"
                  points="20,37 31,48 52,26"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 700, fontSize: 26,
              color: "white", margin: 0, lineHeight: 1.2,
            }}>
              Coupon Applied!
            </p>
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, marginTop: 6, fontWeight: 300 }}>
              Your discount has been unlocked ✨
            </p>

            {/* floating icons in banner */}
            {[
              { Icon: RiSparklingFill, s: 14, style: { top: 18, left: 28 } },
              { Icon: PiStarFourFill,  s: 11, style: { top: 38, left: 52 } },
              { Icon: HiSparkles,      s: 16, style: { top: 12, right: 36 } },
              { Icon: PiStarFourFill,  s: 10, style: { bottom: 20, right: 22 } },
              { Icon: RiSparklingFill, s: 12, style: { bottom: 14, left: 44 } },
            ].map(({ Icon, s, style }, i) => (
              <div key={i} className="float-icon" style={{
                position: "absolute", color: "rgba(255,255,255,0.65)",
                animationDelay: `${i * 0.4}s`, ...style,
              }}>
                <Icon size={s} />
              </div>
            ))}
          </div>

          {/* ── body ── */}
          <div style={{ padding: "24px 28px 28px" }}>

            {/* discount info */}
            <div style={{
              background: "linear-gradient(135deg, #fff5f5, #ffe8e8)",
              borderRadius: 14, padding: "20px 18px",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20, border: "1.5px dashed #f9aeaf",
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: "#c98a8b", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 2 }}>
                  DISCOUNT UNLOCKED
                </p>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 700, fontSize: 32, color: "#e07f82", lineHeight: 1,
                }}>
                  {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                </p>
                <p style={{ fontSize: 11, color: "#c98a8b", marginTop: 4 }}>
                  {coupon.description || 'Enjoy your special discount!'}
                </p>
              </div>
            </div>

            {/* info row */}
            <div style={{
              display: "flex", gap: 10, marginBottom: 22,
            }}>
              {["Special Offer", "Limited Time", "Auto-applied"].map((label, i) => (
                <div key={i} style={{
                  flex: 1, background: "#fdf5f5", borderRadius: 10,
                  padding: "8px 6px", textAlign: "center",
                  fontSize: 10, color: "#b87a7b", fontWeight: 600, letterSpacing: "0.04em",
                }}>
                  {label}
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleClose}
              style={{
                width: "100%", padding: "14px 0",
                background: "linear-gradient(135deg, #f9aeaf 0%, #e07f82 100%)",
                border: "none", borderRadius: 50, cursor: "pointer",
                color: "white", fontFamily: "'Raleway', sans-serif",
                fontWeight: 600, fontSize: 14, letterSpacing: "0.08em",
                boxShadow: "0 8px 24px #f9aeaf80",
                transition: "transform 0.15s, box-shadow 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 30px #f9aeaf90"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 24px #f9aeaf80"; }}
            >
              <HiSparkles size={16} />
              Continue Shopping
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "#c0a0a0", marginTop: 12 }}>
              Discount applied automatically 🛍️
            </p>
          </div>
        </div>
      </div>
    </>
  );
}