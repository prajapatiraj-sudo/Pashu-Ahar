import * as XLSX from 'xlsx';

export const downloadSampleExcel = (type: 'products' | 'customers') => {
  let data: any[] = [];
  let filename = '';

  if (type === 'products') {
    data = [
      {
        'Product Name (EN)': 'Cotton Seed Cake',
        'Product Name (GU)': 'કપાસિયા ખોળ',
        'Unit': 'Bag',
        'Purchase Price': 1750,
        'Selling Price': 1850,
        'Stock Quantity': 50,
        'Alert Threshold': 10
      }
    ];
    filename = 'products_sample.xlsx';
  } else {
    data = [
      {
        'Name': 'Raj Prajapati',
        'Phone': '8460078459',
        'Address': 'Dharampur',
        'Village': 'Dharampur'
      }
    ];
    filename = 'customers_sample.xlsx';
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sample');
  XLSX.writeFile(wb, filename);
};

export const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
