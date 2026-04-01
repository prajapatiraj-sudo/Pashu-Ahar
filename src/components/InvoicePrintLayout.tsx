import React from 'react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface SelectedItem {
  name: string;
  name_gu: string;
  quantity: number | null;
  rate: number | null;
}

interface InvoicePrintLayoutProps {
  selectedCustomer: {
    name: string;
    address: string;
    phone: string;
    village?: string;
  } | null;
  items: SelectedItem[];
  subtotal: number;
  previousOutstanding: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  invoiceId?: number;
  date?: any;
}

export default function InvoicePrintLayout({ 
  selectedCustomer, 
  items = [], 
  subtotal = 0, 
  previousOutstanding = 0, 
  totalAmount = 0, 
  paidAmount = 0, 
  balanceDue = 0,
  invoiceId = 400,
  date
}: InvoicePrintLayoutProps) {
  const formatDate = (date: any) => {
    if (!date) return '- - 202';
    try {
      if (date.toDate) return format(date.toDate(), 'dd - MM - yyyy');
      return format(new Date(date), 'dd - MM - yyyy');
    } catch (e) {
      return '- - 202';
    }
  };

  // Dynamic row height and count based on number of items
  const itemCount = items.length;
  let rowHeightClass = "h-8";
  let targetRows = 10;

  if (itemCount <= 5) {
    rowHeightClass = "h-10";
    targetRows = 6;
  } else if (itemCount > 8) {
    rowHeightClass = "h-7";
    targetRows = 12;
  }

  const displayItems = [...(items || [])];
  while (displayItems.length < targetRows) {
    displayItems.push({ name: '', name_gu: '', quantity: null, rate: null });
  }

  return (
      <div className="bg-white p-1 md:p-6 text-black font-gujarati w-[210mm] mx-auto flex flex-col border border-black/10 print:border-0 print:m-0 print:p-[3mm] print:w-[200mm] print:min-h-0 print:mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <div className="text-base font-bold">પરીક્ષિત ડી. ડાકે</div>
          <div className="text-base font-bold">Mo. 87585 99902</div>
        </div>

        <div className="text-center mb-1">
          <h1 className="text-4xl font-black text-[#dc2626] mb-1 tracking-tighter" style={{ color: '#dc2626', WebkitPrintColorAdjust: 'exact' }}>કૃષ્ણમ પશુ આહાર</h1>
          <div className="inline-block border-2 border-black px-3 py-0.5 rounded-xl">
            <p className="text-lg font-bold">માં કૃપા કોમ્પલેક્ષ, ધરમપુર-૩૯૬૦૫૦ જિ. વલસાડ.</p>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-4 mb-1 mt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg whitespace-nowrap">બીલ નં.</span>
            <span className="border-b-2 border-black border-dotted flex-1 text-lg px-2 font-bold">
              {invoiceId?.toString().slice(-6) || '400'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 justify-end">
            <span className="font-bold text-lg">તારીખ :</span>
            <span className="border-b-2 border-black border-dotted w-36 text-lg px-2 text-center font-bold">
              {formatDate(date)}
            </span>
          </div>
        </div>

        {/* Customer Info Section - More robust and clearly labeled */}
        <div className="space-y-0.5 mb-1">
          <div className="flex items-baseline gap-3">
            <span className="font-bold text-xl shrink-0">શ્રી,</span>
            <div className="border-b-2 border-black border-dotted flex-1 text-xl px-3 font-bold min-h-[1.75rem] flex items-end">
              {selectedCustomer?.name || '....................................................................................................'}
            </div>
          </div>

          <div className="flex items-baseline gap-6">
            <div className="flex items-baseline gap-3 flex-1">
              <span className="font-bold text-xl shrink-0">ગામ:</span>
              <div className="border-b-2 border-black border-dotted flex-1 text-xl px-3 font-bold min-h-[1.75rem] flex items-end">
                {selectedCustomer?.village || '...................................................................'}
              </div>
            </div>
            <div className="flex items-baseline gap-3 w-[45%]">
              <span className="font-bold text-xl shrink-0">મો.:</span>
              <div className="border-b-2 border-black border-dotted flex-1 text-xl px-3 font-bold min-h-[1.75rem] flex items-end">
                {selectedCustomer?.phone || '....................................'}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1">
          <table className="w-full border-collapse border-[2px] border-black">
            <thead>
              <tr className="bg-[#dc2626] text-white border-b-[2px] border-black" style={{ backgroundColor: '#dc2626', WebkitPrintColorAdjust: 'exact' }}>
                <th className="border-r-[2px] border-black py-0.5 px-1 w-10 text-lg font-bold">ક્રમ</th>
                <th className="border-r-[2px] border-black py-0.5 px-3 text-lg font-bold">વિગત</th>
                <th className="border-r-[2px] border-black py-0.5 px-1 w-16 text-lg font-bold">નંગ</th>
                <th className="border-r-[2px] border-black py-0.5 px-1 w-24 text-lg font-bold">ભાવ</th>
                <th className="py-0.5 px-1 w-32 text-lg font-bold">રૂપિયા</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, i) => (
                <tr key={i} className={cn("border-b border-black", rowHeightClass)}>
                  <td className="border-r-[2px] border-black text-center font-bold text-base">{i + 1}.</td>
                  <td className="border-r-[2px] border-black px-3 font-bold text-lg">
                    {item.name_gu || item.name}
                  </td>
                  <td className="border-r-[2px] border-black text-center font-bold text-lg">
                    {item.quantity}
                  </td>
                  <td className="border-r-[2px] border-black text-right px-2 font-bold text-lg">
                    {item.rate}
                  </td>
                  <td className="text-right px-2 font-bold text-lg">
                    {item.quantity && item.rate ? (item.quantity * item.rate) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-[2px] border-black h-8">
                <td colSpan={2} className="border-r-[2px] border-black px-3 font-bold text-base italic">
                  ભૂલચૂક લેવીદેવી
                </td>
                <td colSpan={2} className="border-r-[2px] border-black text-right px-3 font-bold text-lg">
                  ટોટલ...
                </td>
                <td className="text-right px-2 font-bold text-lg">
                  {subtotal > 0 ? subtotal : ''}
                </td>
              </tr>
              <tr className="border-t border-black h-8">
                <td colSpan={2} className="border-r-[2px] border-black"></td>
                <td colSpan={2} className="border-r-[2px] border-black text-right px-3 font-bold text-base text-[#dc2626]" style={{ color: '#dc2626' }}>
                  જૂની બાકી
                </td>
                <td className="text-right px-2 font-bold text-lg text-[#dc2626]" style={{ color: '#dc2626' }}>
                  {previousOutstanding}
                </td>
              </tr>
              <tr className="border-t-[2px] border-black h-9 bg-gray-100">
                <td colSpan={2} className="border-r-[2px] border-black"></td>
                <td colSpan={2} className="border-r-[2px] border-black text-center font-bold text-xl">
                  કુલ ટોટલ
                </td>
                <td className="text-right px-2 font-bold text-xl">
                  {totalAmount}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-1">
          <div className="border-[2px] border-black p-1.5 rounded-xl mb-1">
            <p className="font-bold text-base leading-relaxed">
              નોંધ : આ બીલના નાંણા અમે જ્યારે માંગીએ ત્યારે આપવાની શરતે આપેલ છે. <br />
              આ બીલનો માલ જોઈ તપાસીને લઈ જવો, પાછળથી કોઈપણ તકરાર ચાલશે નહીં.
            </p>
          </div>

          <div className="flex justify-between items-end mt-2 pb-1">
            <div className="text-center">
              <p className="border-t-2 border-black border-dotted pt-0.5 px-6 font-bold text-lg">લેનારની સહી</p>
            </div>
            <div className="text-center">
              <p className="border-t-2 border-black border-dotted pt-0.5 px-6 font-bold text-lg">આપનારની સહી</p>
            </div>
          </div>
        </div>
      </div>
  );
}
