import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ProposalPages, fitProposalPages, pageCount } from './proposal/Pages';
import { proposalFor, waitForProposalAssets } from './proposal/ProposalDocument';
import { fromRow,pdfName,validate } from './model';

// One JPEG per A4 proposal page (html2canvas) into an A4 jsPDF.
export async function generateQuotationPdf(row) {
    const errors = validate(fromRow(row));
    if (errors.length) throw new Error(errors.join('\n'));
    const [{ default:html2canvas },{ jsPDF }] = await Promise.all([import('html2canvas'),import('jspdf')]);
    const { snap,accepted } = proposalFor(row);
    const host = document.createElement('div');
    host.className = 'pp-export';
    host.style.cssText = 'position:fixed;left:0;top:0;width:794px;background:white;z-index:-9999;pointer-events:none;';
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
        flushSync(() => root.render(<ProposalPages snap={snap} accepted={accepted} idPrefix="pdf-page-" />));
        await waitForProposalAssets(host);
        const pages = fitProposalPages(host);
        if (pages.length !== pageCount(snap.inputs)) throw new Error('The proposal pages did not render completely. Please try again.');
        const pdf = new jsPDF({ orientation:'portrait',unit:'mm',format:'a4',compress:true });
        for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i],{
                scale:2,
                backgroundColor:'#ffffff',
                logging:false,
                useCORS:true,
                scrollX:0,
                scrollY:0,
                windowWidth:794,
                windowHeight:1123,
            });
            if (i) pdf.addPage('a4','portrait');
            pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297,undefined,'FAST');
            canvas.width = 0; canvas.height = 0;
        }
        return new File([pdf.output('blob')],pdfName(row),{type:'application/pdf'});
    } finally { root.unmount(); host.remove(); }
}
// Sharing is offered from a new explicit tap after generation, preserving iOS user activation.
export function downloadQuotationFile(file) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
    window.dispatchEvent(new CustomEvent('solarflow:download-complete',{detail:{file,fileName:file.name}}));
}

// Phones can hand the PDF itself to WhatsApp; most desktop browsers cannot.
export const canSharePdfFiles = () => typeof navigator !== 'undefined' && Boolean(navigator.canShare)
    && navigator.canShare({ files: [new File([''], 'quotation.pdf', { type: 'application/pdf' })] });

export async function shareQuotationFile(file) {
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: file.name,
                files: [file],
            });
            window.dispatchEvent(new CustomEvent('solarflow:share-complete',{detail:{file,fileName:file.name}}));
            return 'shared';
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn('Native share failed, downloading instead:', err);
                return 'download-required';
            }
            return 'cancelled';
        }
    } else {
        return 'download-required';
    }
}
