import React from 'react';
import { format } from 'date-fns';

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

  // Fill up to 15 rows
  const displayItems = [...(items || [])];
  while (displayItems.length < 15) {
    displayItems.push({ name: '', name_gu: '', quantity: null, rate: null });
  }

  return (
    <div className="bg-white p-4 md:p-8 text-black font-gujarati max-w-[210mm] mx-auto min-h-[297mm] flex flex-col border border-black/10 print:border-0">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div className="text-xl font-bold">પરીક્ષિત ડી. ડાકે</div>
        <div className="text-xl font-bold">Mo. 87585 99902</div>
      </div>

      <div className="text-center mb-4">
        <h1 className="text-6xl font-black text-[#dc2626] mb-2 tracking-tighter" style={{ color: '#dc2626', WebkitPrintColorAdjust: 'exact' }}>કૃષ્ણમ પશુ આહાર</h1>
        <div className="inline-block border-2 border-black px-6 py-1 rounded-xl">
          <p className="text-2xl font-bold">માં કૃપા કોમ્પલેક્ષ, ધરમપુર-૩૯૬૦૫૦ જિ. વલસાડ.</p>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-2 gap-8 mb-4 mt-2">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-2xl whitespace-nowrap">બીલ નં.</span>
          <span className="border-b-2 border-black border-dotted flex-1 text-2xl px-2 font-bold">
            {invoiceId?.toString().slice(-6) || '400'}
          </span>
        </div>
        <div className="flex items-baseline gap-2 justify-end">
          <span className="font-bold text-2xl">તારીખ :</span>
          <span className="border-b-2 border-black border-dotted w-48 text-2xl px-2 text-center font-bold">
            {formatDate(date)}
          </span>
        </div>
      </div>

      {/* Customer Info Section - More robust and clearly labeled */}
      <div className="space-y-4 mb-6">
        <div className="flex items-baseline gap-4">
          <span className="font-bold text-3xl shrink-0">શ્રી,</span>
          <div className="border-b-2 border-black border-dotted flex-1 text-3xl px-4 font-bold min-h-[2.5rem] flex items-end">
            {selectedCustomer?.name || '....................................................................................................'}
          </div>
        </div>

        <div className="flex items-baseline gap-8">
          <div className="flex items-baseline gap-4 flex-1">
            <span className="font-bold text-3xl shrink-0">ગામ:</span>
            <div className="border-b-2 border-black border-dotted flex-1 text-3xl px-4 font-bold min-h-[2.5rem] flex items-end">
              {selectedCustomer?.village || '...................................................................'}
            </div>
          </div>
          <div className="flex items-baseline gap-4 w-[45%]">
            <span className="font-bold text-3xl shrink-0">મો.:</span>
            <div className="border-b-2 border-black border-dotted flex-1 text-3xl px-4 font-bold min-h-[2.5rem] flex items-end">
              {selectedCustomer?.phone || '....................................'}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1">
        <table className="w-full border-collapse border-[3px] border-black">
          <thead>
            <tr className="bg-[#dc2626] text-white border-b-[3px] border-black" style={{ backgroundColor: '#dc2626', WebkitPrintColorAdjust: 'exact' }}>
              <th className="border-r-[3px] border-black py-2 px-1 w-16 text-2xl font-bold">ક્રમ</th>
              <th className="border-r-[3px] border-black py-2 px-4 text-2xl font-bold">વિગત</th>
              <th className="border-r-[3px] border-black py-2 px-1 w-24 text-2xl font-bold">નંગ</th>
              <th className="border-r-[3px] border-black py-2 px-1 w-32 text-2xl font-bold">ભાવ</th>
              <th className="py-2 px-1 w-40 text-2xl font-bold">રૂપિયા</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item, i) => (
              <tr key={i} className="border-b-2 border-black h-11">
                <td className="border-r-[3px] border-black text-center font-bold text-xl">{i + 1}.</td>
                <td className="border-r-[3px] border-black px-4 font-bold text-2xl">
                  {item.name_gu || item.name}
                </td>
                <td className="border-r-[3px] border-black text-center font-bold text-2xl">
                  {item.quantity}
                </td>
                <td className="border-r-[3px] border-black text-right px-2 font-bold text-2xl">
                  {item.rate}
                </td>
                <td className="text-right px-2 font-bold text-2xl">
                  {item.quantity && item.rate ? (item.quantity * item.rate) : ''}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-[3px] border-black h-11">
              <td colSpan={2} className="border-r-[3px] border-black px-4 font-bold text-xl italic">
                ભૂલચૂક લેવીદેવી
              </td>
              <td colSpan={2} className="border-r-[3px] border-black text-right px-4 font-bold text-2xl">
                ટોટલ...
              </td>
              <td className="text-right px-2 font-bold text-2xl">
                {subtotal > 0 ? subtotal : ''}
              </td>
            </tr>
            <tr className="border-t-2 border-black h-11">
              <td colSpan={2} className="border-r-[3px] border-black"></td>
              <td colSpan={2} className="border-r-[3px] border-black text-right px-4 font-bold text-xl text-[#dc2626]" style={{ color: '#dc2626' }}>
                જૂની બાકી
              </td>
              <td className="text-right px-2 font-bold text-2xl text-[#dc2626]" style={{ color: '#dc2626' }}>
                {previousOutstanding}
              </td>
            </tr>
            <tr className="border-t-[3px] border-black h-12 bg-gray-100">
              <td colSpan={2} className="border-r-[3px] border-black"></td>
              <td colSpan={2} className="border-r-[3px] border-black text-center font-bold text-3xl">
                કુલ ટોટલ
              </td>
              <td className="text-right px-2 font-bold text-3xl">
                {totalAmount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6">
        <div className="border-[3px] border-black p-3 rounded-2xl mb-10">
          <p className="font-bold text-xl leading-relaxed">
            નોંધ : આ બીલના નાંણા અમે જ્યારે માંગીએ ત્યારે આપવાની શરતે આપેલ છે. <br />
            આ બીલનો માલ જોઈ તપાસીને લઈ જવો, પાછળથી કોઈપણ તકરાર ચાલશે નહીં.
          </p>
        </div>

        <div className="flex justify-between items-end mt-16 pb-6">
          <div className="text-center">
            <p className="border-t-2 border-black border-dotted pt-2 px-10 font-bold text-2xl">લેનારની સહી</p>
          </div>
          <div className="text-center">
            <p className="border-t-2 border-black border-dotted pt-2 px-10 font-bold text-2xl">આપનારની સહી</p>
          </div>
        </div>
      </div>
    </div>
  );
}
