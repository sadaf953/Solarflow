import solarflowLogoBlue from '../../../assets/solarflow-logo-blue.svg?inline';

interface LogoProps { customLogoUrl?: string; className?: string; }

export const SolarFlowLogo: React.FC<LogoProps> = ({ customLogoUrl, className = 'h-[75px]' }) => (
  <img src={customLogoUrl || solarflowLogoBlue} alt="SolarFlow Solar Energy" className={`object-contain ${className}`} />
);

// These former partner-art slots now show only fictional demo branding.
const DemoBadge: React.FC<LogoProps> = ({ className = 'h-12' }) => (
  <div className={`flex flex-col justify-center text-center font-bold text-slate-700 ${className}`}>
    <span>SolarFlow</span><span className="text-xs tracking-widest">DEMO ONLY</span>
  </div>
);
export const DemoQualityBadge = DemoBadge;
export const DemoEnergyBadge = DemoBadge;
export const DemoPartnerLogo = DemoBadge;
export const DemoQuoteBanner: React.FC<LogoProps> = ({ className = '' }) => (
  <img src={`${import.meta.env.BASE_URL}demo-banner.svg`} alt="SolarFlow fictional demo banner" className={className} />
);
