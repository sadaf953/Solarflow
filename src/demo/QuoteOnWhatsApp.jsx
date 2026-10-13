import { MessageCircle } from 'lucide-react';
import { quoteWhatsAppLink } from './whatsapp';

// variant: 'button' (green pill), 'link' (inline text link), 'header' (matches demo header buttons)
export default function QuoteOnWhatsApp({ variant = 'button', label = 'Ask for a quotation on WhatsApp', context, name, company, details, className = '' }) {
  const href = quoteWhatsAppLink({ name, company, context, details });
  const cls = variant === 'link'
    ? 'inline-flex items-center gap-1.5 font-bold text-emerald-700 underline underline-offset-2'
    : variant === 'header'
    ? 'demo-quote-whatsapp'
    : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-[#073B1C] hover:brightness-95';
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} ${className}`.trim()} aria-label={label}>
      <MessageCircle size={variant === 'link' ? 15 : 17} aria-hidden="true"/>
      <span>{label}</span>
    </a>
  );
}
