import { useState } from 'react';
import { useStudents } from '../context/StudentContext';
import { exportToCSV, importFromCSV } from '../utils/csvUtils';
import { FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function StudentManagement() {
  const { students, addStudent, updateStudent, deleteStudent, bulkAddStudents, deleteManyStudents, loading, error } = useStudents();
  const [formData, setFormData] = useState({ name: '', rollNumber: '', email: '', seatRow: '', seatColumn: '' });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const seatRow = parseInt(formData.seatRow, 10);
    const seatColumn = parseInt(formData.seatColumn, 10);

    if (seatRow < 0 || seatRow > 6 || seatColumn < 0 || seatColumn > 7) {
      toast.error('Seat position must be within 0-6 for row and 0-7 for column');
      return;
    }

    const seatTaken = students.some(student => 
      student.seatRow === seatRow && student.seatColumn === seatColumn
    );
    if (seatTaken) {
      toast.error('This seat is already occupied');
      return;
    }

    try {
      await addStudent({ ...formData, seatRow, seatColumn });
      setIsAddModalOpen(false);
      setFormData({ name: '', rollNumber: '', email: '', seatRow: '', seatColumn: '' });
      toast.success('Student added successfully!');
    } catch (err) {
      toast.error('Failed to add student');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const seatRow = parseInt(formData.seatRow, 10);
    const seatColumn = parseInt(formData.seatColumn, 10);

    if (seatRow < 0 || seatRow > 6 || seatColumn < 0 || seatColumn > 7) {
      toast.error('Seat position must be within 0-6 for row and 0-7 for column');
      return;
    }

    const seatTaken = students.some(student => 
      student.seatRow === seatRow && student.seatColumn === seatColumn && student.id !== editingId
    );
    if (seatTaken) {
      toast.error('This seat is already occupied');
      const student = students.find(s => s.id === editingId);
      setFormData({
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email || '',
        seatRow: student.seatRow.toString(),
        seatColumn: student.seatColumn.toString(),
      });
      return;
    }

    try {
      await updateStudent({ ...formData, id: editingId, seatRow, seatColumn });
      setIsEditModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', rollNumber: '', email: '', seatRow: '', seatColumn: '' });
      toast.success('Student updated successfully!');
    } catch (err) {
      toast.error('Failed to update student');
    }
  };

  const handleEdit = (student) => {
    setFormData({
      name: student.name,
      rollNumber: student.rollNumber,
      email: student.email || '',
      seatRow: student.seatRow.toString(),
      seatColumn: student.seatColumn.toString(),
    });
    setEditingId(student.id);
    setIsEditModalOpen(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', rollNumber: '', email: '', seatRow: '', seatColumn: '' });
    setEditingId(null);
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
  };

  const handleExport = () => {
    exportToCSV(students, 'students.csv');
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportError('');
    setImportSuccess('');

    try {
      const importedData = await importFromCSV(file);
      if (!importedData || importedData.length === 0) {
        setImportError('No valid data found in the CSV file.');
        return;
      }

      const validStudents = importedData.map(student => ({
        ...student,
        seatRow: parseInt(student.seatRow, 10),
        seatColumn: parseInt(student.seatColumn, 10),
      })).filter(student => 
        student.name && 
        student.rollNumber && 
        Number.isInteger(student.seatRow) && 
        Number.isInteger(student.seatColumn) && 
        student.seatRow >= 0 && student.seatRow <= 6 && 
        student.seatColumn >= 0 && student.seatColumn <= 7
      );

      if (validStudents.length === 0) {
        setImportError('No valid student records found.');
        return;
      }

      if (validStudents.length > 56) {
        setImportError('Cannot import more than 56 students.');
        return;
      }

      const seatMap = new Map();
      for (const student of validStudents) {
        const seatKey = `${student.seatRow},${student.seatColumn}`;
        if (seatMap.has(seatKey)) {
          setImportError(`Duplicate seat position found: (${student.seatRow},${student.seatColumn})`);
          return;
        }
        seatMap.set(seatKey, true);
      }

      await bulkAddStudents(validStudents);
      setImportSuccess(`Successfully imported ${validStudents.length} student records.`);
      e.target.value = null;
    } catch (err) {
      setImportError(`Error importing CSV: ${err.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const generateCsvTemplate = () => {
    const template = Array.from({ length: 56 }, (_, i) => ({
      name: `Student ${i + 1}`,
      rollNumber: `${100 + i + 1}`,
      email: `student${i + 1}@example.com`,
      seatRow: Math.floor(i / 8),
      seatColumn: i % 8,
    }));
    exportToCSV(template, 'student_template_56.csv');
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all students? This action cannot be undone.')) {
      await deleteManyStudents();
    }
  };

  const filteredStudents = students.filter(student => 
    (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center py-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Student Management (Max 56 Students)</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Student List ({students.length}/56)</h2>
          <div className="flex space-x-2">
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary flex items-center" disabled={students.length >= 56}>
              <FaPlus className="mr-2" /> Add Student
            </button>
            <button onClick={handleExport} className="btn btn-secondary">Export CSV</button>
            <label className="btn btn-secondary cursor-pointer">
              {isImporting ? 'Importing...' : 'Import CSV'}
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" disabled={isImporting} />
            </label>
            <button onClick={generateCsvTemplate} className="btn btn-secondary">Get Template (56 Seats)</button>
            <button onClick={handleDeleteAll} className="btn btn-danger" disabled={!students.length}>Delete All</button>
          </div>
        </div>

        {importError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {importError}
          </div>
        )}

        {importSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {importSuccess}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold">CSV Import Instructions:</h3>
          <p>1. CSV should have headers: name, rollNumber, email (optional), seatRow, seatColumn.</p>
          <p>2. SeatRow (0-6), SeatColumn (0-7), max 56 students.</p>
          <p>3. Use "Get Template" for a 56-seat example.</p>
        </div>

        <div className="mb-4">
          <input type="text" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 border border-gray-300 rounded w-full md:w-1/3" />
        </div>

        <div className="table-container">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Seat No.</th>
                <th>Roll No.</th>
                <th>Name</th>
                <th>Email</th>
                <th>Seat Position</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.seatRow * 8 + student.seatColumn + 1}</td>
                    <td>{student.rollNumber}</td>
                    <td>{student.name}</td>
                    <td>{student.email || '-'}</td>
                    <td>({student.seatRow},{student.seatColumn})</td>
                    <td>
                      <button onClick={() => handleEdit(student)} className="text-blue-600 hover:text-blue-800 p-1 mr-2" title="Edit student">
                        <FaEdit />
                      </button>
                      <button onClick={() => deleteStudent(student.id)} className="text-red-600 hover:text-red-800 p-1" title="Delete student">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    {searchTerm ? 'No matching students found.' : 'No students added yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Student</h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label><input type="text" name="rollNumber" value={formData.rollNumber} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Seat Row (0-6) *</label><input type="number" name="seatRow" value={formData.seatRow} onChange={handleChange} min="0" max="6" className="w-full p-2 border border-gray-300 rounded" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Seat Column (0-7) *</label><input type="number" name="seatColumn" value={formData.seatColumn} onChange={handleChange} min="0" max="7" className="w-full p-2 border border-gray-300 rounded" required /></div>
              </div>
              <div className="flex space-x-2 mt-4">
                <button type="submit" className="btn btn-primary">Add Student</button>
                <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Student</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label><input type="text" name="rollNumber" value={formData.rollNumber} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Seat Row (0-6) *</label><input type="number" name="seatRow" value={formData.seatRow} onChange={handleChange} min="0" max="6" className="w-full p-2 border border-gray-300 rounded" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Seat Column (0-7) *</label><input type="number" name="seatColumn" value={formData.seatColumn} onChange={handleChange} min="0" max="7" className="w-full p-2 border border-gray-300 rounded" required /></div>
              </div>
              <div className="flex space-x-2 mt-4">
                <button type="submit" className="btn btn-primary">Edit Student</button>
                <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
    </div>
  );
}

export default StudentManagement;