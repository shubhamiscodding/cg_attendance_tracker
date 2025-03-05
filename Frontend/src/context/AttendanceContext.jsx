import { createContext, useState, useContext } from 'react';
import { format } from 'date-fns';

const AttendanceContext = createContext();

export function useAttendance() {
  return useContext(AttendanceContext);
}

export function AttendanceProvider({ children }) {
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAttendance = async (date, period) => {
    try {
      setLoading(true);
      const formattedDate = format(new Date(date), 'yyyy-MM-dd');
      const query = period ? `?date=${formattedDate}&period=${period}` : `?date=${formattedDate}`;
      const response = await fetch(`/api/attendance${query}`);
      if (!response.ok) throw new Error('Failed to fetch attendance');
      const data = await response.json();
      const formattedRecords = formatAttendanceData(data, formattedDate, period);
      setAttendanceRecords(prev => ({ ...prev, [formattedDate]: formattedRecords[formattedDate] }));
      setError('');
      return formattedRecords[formattedDate];
    } catch (err) {
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  };

  const formatAttendanceData = (data, date, period) => {
    const result = { [date]: {} };
    if (Array.isArray(data)) {
      data.forEach(record => {
        if (!record.studentId || !record.studentId.id) return;
        if (!result[date][record.period]) result[date][record.period] = {};
        result[date][record.period][record.studentId.id] = {
          status: record.status,
          timeRange: record.timeRange,
          hours: record.hours,
        };
      });
    }
    return result;
  };

  const markAttendance = async (date, studentId, status, period, timeRange) => {
    try {
      setLoading(true);
      const formattedDate = format(new Date(date), 'yyyy-MM-dd');
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, date: formattedDate, period, status, timeRange }),
      });
      if (!response.ok) throw new Error('Failed to mark attendance');
      await fetchAttendance(formattedDate, period);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const bulkMarkAttendance = async (date, studentsStatus, period, timeRange) => {
    try {
      setLoading(true);
      const formattedDate = format(new Date(date), 'yyyy-MM-dd');
      const response = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formattedDate, period, studentsStatus, timeRange }),
      });
      if (!response.ok) throw new Error('Failed to bulk mark attendance');
      await fetchAttendance(formattedDate, period);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceForDate = (date, period) => {
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    if (!attendanceRecords[formattedDate]) return {};
    return period ? attendanceRecords[formattedDate][period] || {} : attendanceRecords[formattedDate];
  };

  const getTotalHoursForDate = (date, studentId) => {
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    if (!attendanceRecords[formattedDate]) return 0;
    return Object.values(attendanceRecords[formattedDate]).reduce((total, periodRecords) => {
      return total + (periodRecords[studentId]?.hours || 0);
    }, 0);
  };

  const getAttendanceStatusForHours = (hours) => {
    if (hours >= 8) return 'full';
    if (hours > 0) return 'partial';
    return 'absent';
  };

  const getAttendancePercentage = (hours) => {
    return Math.min(Math.round((hours / 8) * 100), 100);
  };

  return (
    <AttendanceContext.Provider value={{
      attendanceRecords,
      markAttendance,
      bulkMarkAttendance,
      getAttendanceForDate,
      getTotalHoursForDate,
      getAttendanceStatusForHours,
      getAttendancePercentage,
      fetchAttendance,
      loading,
      error,
    }}>
      {children}
    </AttendanceContext.Provider>
  );
}