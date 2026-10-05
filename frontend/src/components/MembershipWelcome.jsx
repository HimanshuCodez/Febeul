import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { ArrowUpRight, Crown, Gem, Heart, Pause, Play, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import "./MembershipWelcome.css";

// Pink lingerie GIF by triumphlingerie. Keep the still for reduced motion and playback controls.
// Source: https://giphy.com/stickers/Triumphlingerie-lingerie-triumph-u0e4suUhmKMCasjTyE
const lingerieGif = "/luxe-lingerie.gif";
const lingerieStill = "/luxe-lingerie-still.gif";
const sparklePositions = [
  ["12%", "24%"], ["82%", "16%"], ["74%", "62%"],
  ["19%", "70%"], ["55%", "12%"], ["89%", "82%"],
];

const MembershipWelcome = ({
  titleId, benefits, user, isLuxeMember, isAuthenticated,
  membershipPrice, reduceMotion, onClose, onJoin,
}) => {
  const [paused, setPaused] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const motionStopped = reduceMotion || paused;

  return (
    <div className="luxe-welcome" data-motion={motionStopped ? "paused" : "playing"}>
      <button
        type="button"
        autoFocus
        aria-label="Close membership popup"
        onClick={onClose}
        className="luxe-close absolute right-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/85 text-[#77324f] shadow-sm backdrop-blur-md transition hover:bg-white hover:text-pink-600 md:right-3 md:top-3"
      >
        <X size={20} strokeWidth={1.6} />
      </button>

      <div className="luxe-hero">
        <div className="luxe-hero-halo" aria-hidden="true" />
        <div className="luxe-sparkles" aria-hidden="true">
          {sparklePositions.map(([left, top], index) => (
            <Sparkles key={index} style={{ left, top, animationDelay: `${index * 0.6}s` }} />
          ))}
        </div>
        <div className="luxe-wordmark">
          <span>FEBEUL</span>
          <span>LINGERIE. LOUNGE. LOVE.</span>
        </div>

        <div className="luxe-artwork" aria-hidden="true">
          <div className="luxe-artwork-ring" />
          {imageFailed ? (
            <Heart className="h-24 w-24 text-pink-500" strokeWidth={1} />
          ) : (
            <img
              src={motionStopped ? lingerieStill : lingerieGif}
              alt=""
              width="480"
              height="480"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          )}
          <span className="luxe-artwork-heart"><Heart size={18} fill="currentColor" /></span>
        </div>

        <div className="luxe-hero-caption">
          <p>A little more<br /><em>lovely.</em></p>
          <span>Soft details. Extra privileges. All yours.</span>
        </div>
        {!reduceMotion && (
          <button
            type="button"
            className="luxe-playback"
            aria-label={paused ? "Play animations" : "Pause animations"}
            onClick={() => setPaused(value => !value)}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </button>
        )}
      </div>

      <div className="luxe-details">
        <span className="luxe-invitation">
          {isLuxeMember ? <Crown size={13} /> : <Gem size={13} />}
          {isLuxeMember ? "Your Luxe VIP lounge" : "An invitation to something special"}
        </span>
        <h2 id={titleId} className="luxe-title">
          {isLuxeMember ? <>Welcome back,<br /><em>beautiful.</em></> : <>Your VIP era<br /><em>starts here.</em></>}
        </h2>
        <p className="luxe-description">
          {isLuxeMember
            ? "Your membership is active. Enjoy the little luxuries you love."
            : "Fall for the little luxuries. Join Febeul Luxe for perks that make every order feel special."}
        </p>

        {isLuxeMember && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <Crown size={24} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name || "VIP Shopper"}</p>
              <p className="text-[11px]">Your Luxe membership is active</p>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-pink-100" />
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#986078]">Six reasons to fall in love</p>
          <span className="h-px flex-1 bg-pink-100" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Motion.div
                key={benefit.name}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.1 + index * 0.05 }}
                className="luxe-perk"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${benefit.color} text-white shadow-sm`}>
                  <Icon size={16} strokeWidth={1.7} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-tight text-[#522239]">{benefit.name}</p>
                  <p className="mt-1 text-[10px] leading-snug text-[#8a6777]">{benefit.desc}</p>
                </div>
              </Motion.div>
            );
          })}
        </div>
      </div>

      <div className="luxe-actions">
        <button type="button" onClick={onJoin} className="luxe-join">
          {isLuxeMember ? <Crown size={18} /> : <Sparkles size={18} />}
          <span>{isLuxeMember ? "Explore your Luxe privileges" : <>Join Luxe <span className="font-normal opacity-80">&middot;</span> ₹{membershipPrice}<span className="text-xs font-normal opacity-90">/mo</span></>}</span>
          <ArrowUpRight size={19} />
        </button>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4">
          <button type="button" onClick={onClose} className="min-h-11 text-[11px] font-medium text-[#79596a] transition hover:text-pink-600">
            Maybe later, keep exploring
          </button>
          {!isAuthenticated && (
            <Link to="/auth" onClick={onClose} className="inline-flex min-h-11 items-center text-[11px] font-semibold text-[#ad3965] underline decoration-pink-200 underline-offset-4 hover:text-pink-600">
              Member? Sign in
            </Link>
          )}
        </div>
        <p className="flex items-center justify-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-[#a57a8d]">
          <Heart size={10} /> A little luxury, just for you
        </p>
      </div>
    </div>
  );
};

export default MembershipWelcome;
