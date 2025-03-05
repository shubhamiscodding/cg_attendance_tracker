import Papa from 'papaparse';

export const exportToCSV = (data, filename) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importFromCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
      complete: (results) => {
        const mappedData = results.data.map(row => ({
          id: row.id || undefined,
          name: row.name || row.fullname || row.studentname || row['student name'] || '',
          rollNumber: row.rollnumber || row.roll || row.rollno || row['roll number'] || row['roll no'] || '',
          email: row.email || row['email address'] || row.mail || '',
          seatRow: row.seatrow || row['seat row'] || '',
          seatColumn: row.seatcolumn || row['seat column'] || '',
        })).filter(student => student.name && student.rollNumber);
        resolve(mappedData);
      },
      error: (error) => reject(error),
    });
  });
};

export const generateAttendanceTemplate = (students) => {
  return students.map(student => ({
    id: student.id,
    name: student.name,
    rollNumber: student.rollNumber,
    email: student.email || '',
    seatRow: student.seatRow,
    seatColumn: student.seatColumn,
    status: '',
  }));
};