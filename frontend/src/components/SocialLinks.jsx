import { useEffect } from 'react';
import {
  FaFacebookF, FaInstagram, FaThreads, FaYoutube, FaXTwitter, FaWhatsapp,
  FaLinkedinIn, FaPinterestP, FaTelegram, FaTiktok, FaSnapchat, FaGlobe,
} from 'react-icons/fa6';
import useSocialsStore from '../store/socialsStore';

const icons = {
  facebook: FaFacebookF, instagram: FaInstagram, threads: FaThreads,
  youtube: FaYoutube, twitter: FaXTwitter, whatsapp: FaWhatsapp,
  linkedin: FaLinkedinIn, pinterest: FaPinterestP, telegram: FaTelegram,
  tiktok: FaTiktok, snapchat: FaSnapchat, custom: FaGlobe,
};

const SocialLinks = ({ placement, className = '' }) => {
  const links = useSocialsStore(state => state.links);
  const fetchSocials = useSocialsStore(state => state.fetchSocials);

  useEffect(() => { fetchSocials(); }, [fetchSocials]);

  const visibleLinks = links.filter(link =>
    placement === 'footer' ? link.showInFooter !== false : link.showInTopBar !== false
  );
  if (!visibleLinks.length) return null;

  return (
    <nav aria-label={placement === 'footer' ? 'Footer social links' : 'Top bar social links'} className={`flex items-center ${className}`}>
      {visibleLinks.map((link, index) => {
        const Icon = Object.hasOwn(icons, link.platform) ? icons[link.platform] : FaGlobe;
        return (
          <a
            key={link.id || `${link.platform}-${index}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.label} (opens in a new tab)`}
            title={link.label}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-pink-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-pink-300"
          >
            <Icon size={placement === 'footer' ? 20 : 16} aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
};

export default SocialLinks;
