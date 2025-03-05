import { createContext, useState, useContext, useEffect } from 'react';

const StudentContext = createContext();

export function useStudents() {
  return useContext(StudentContext);
}

export function StudentProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/students');
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setStudents(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (student) => {
    try {
      setLoading(true);
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      });
      if (!response.ok) throw new Error('Failed to add student');
      await fetchStudents();
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStudent = async (updatedStudent) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students/${updatedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStudent),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update student: ${errorText}`);
      }
      await fetchStudents();
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete student');
      await fetchStudents();
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const bulkAddStudents = async (newStudents) => {
    try {
      setLoading(true);
      const response = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudents),
      });
      if (!response.ok) throw new Error('Failed to bulk add students');
      await fetchStudents();
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteManyStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/students/many', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete all students: ${errorText}`);
      }
      await fetchStudents();
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentContext.Provider value={{ students, addStudent, updateStudent, deleteStudent, bulkAddStudents, deleteManyStudents, loading, error }}>
      {children}
    </StudentContext.Provider>
  );
}