import { useState, useEffect } from 'react';
import { useStudents } from '../context/StudentContext';
import { useAttendance } from '../context/AttendanceContext';
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { exportToCSV } from '../utils/csvUtils';

function AttendanceView() {
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { getAttendanceForDate, getTotalHoursForDate, getAttendanceStatusForHours, getAttendancePercentage, fetchAttendance, loading: attendanceLoading, error: attendanceError } = useAttendance();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [viewMode, setViewMode] = useState('day');

  const periods = ['all', '1', '2', '3', '4', '5', '6'];

  useEffect(() => {
    if (!studentsLoading && students.length > 0) {
      fetchAttendance(selectedDate, selectedPeriod === 'all' ? null : selectedPeriod);
    }
  }, [selectedDate, selectedPeriod, studentsLoading, students]);

  const attendanceData = getAttendanceForDate(selectedDate, selectedPeriod === 'all' ? null : selectedPeriod);

  const getAttendanceStatus = (studentId, period) => {
    if (selectedPeriod === 'all') {
      return attendanceData[period]?.[studentId]?.status || '';
    }
    return attendanceData[studentId]?.status || '';
  };

  const getStudentHoursForDay = (studentId, date) => {
    return getTotalHoursForDate(date, studentId);
  };

  const calculateStats = () => {
    if (!students.length) return { present: 0, absent: 0, partial: 0, total: 0, presentPercentage: 0 };
    let present = 0, absent = 0, partial = 0;
    students.forEach(student => {
      const hours = getStudentHoursForDay(student.id, selectedDate);
      const status = getAttendanceStatusForHours(hours);
      if (status === 'full') present++;
      else if (status === 'partial') partial++;
      else if (status === 'absent') absent++;
    });
    const total = students.length;
    const presentPercentage = total > 0 ? Math.round(((present + (partial * 0.5)) / total) * 100) : 0;
    return { present, absent, partial, total, presentPercentage };
  };

  const stats = calculateStats();

  const handleExport = async () => {
    const formattedDate = format(parseISO(selectedDate), 'yyyy-MM-dd');
    let exportData = [];
    if (viewMode === 'day') {
      if (selectedPeriod === 'all') {
        exportData = students.map(student => {
          const studentData = {
            id: student.id,
            name: student.name,
            rollNumber: student.rollNumber,
            email: student.email || '',
            totalHours: getStudentHoursForDay(student.id, selectedDate),
            attendanceStatus: getAttendanceStatusForHours(getStudentHoursForDay(student.id, selectedDate)),
          };
          Object.keys(attendanceData).forEach(period => {
            const periodData = attendanceData[period]?.[student.id];
            studentData[`Period ${period}`] = periodData?.status || 'N/A';
            studentData[`Period ${period} Hours`] = periodData?.hours || 0;
          });
          return studentData;
        });
      } else {
        exportData = students.map(student => {
          const periodData = attendanceData[student.id];
          return {
            id: student.id,
            name: student.name,
            rollNumber: student.rollNumber,
            email: student.email || '',
            status: periodData?.status || 'N/A',
            hours: periodData?.hours || 0,
            timeRange: periodData?.timeRange ? `${periodData.timeRange.startTime} - ${periodData.timeRange.endTime}` : 'N/A',
          };
        });
      }
    } else if (viewMode === 'week') {
      const startDate = startOfWeek(parseISO(selectedDate));
      const endDate = endOfWeek(parseISO(selectedDate));
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const weekAttendance = await Promise.all(
        days.map(async day => {
          const formattedDay = format(day, 'yyyy-MM-dd');
          await fetchAttendance(formattedDay);
          return { day: formattedDay, data: getAttendanceForDate(formattedDay) };
        })
      );

      exportData = students.map(student => {
        const studentData = {
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber,
          email: student.email || '',
        };
        days.forEach((day, i) => {
          const dayData = weekAttendance[i].data;
          const hours = Object.values(dayData).reduce((sum, period) => sum + (period[student.id]?.hours || 0), 0);
          studentData[format(day, 'EEE (MM/dd)')] = hours;
          studentData[`${format(day, 'EEE')} Status`] = getAttendanceStatusForHours(hours);
        });
        return studentData;
      });
    }
    exportToCSV(exportData, `attendance_${formattedDate}_${viewMode}_${selectedPeriod}.csv`);
  };

  const getWeekDays = () => {
    const startDate = startOfWeek(parseISO(selectedDate));
    const endDate = endOfWeek(parseISO(selectedDate));
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const weekDays = viewMode === 'week' ? getWeekDays() : [];

  if (studentsLoading || attendanceLoading) return <div className="text-center py-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Attendance Records</h1>

      {(studentsError || attendanceError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {studentsError || attendanceError}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="stats grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="stat bg-blue-50 p-4 rounded-lg"><div className="stat-title text-blue-600">Total Students</div><div className="stat-value text-2xl">{stats.total}</div></div>
          <div className="stat bg-green-50 p-4 rounded-lg"><div className="stat-title text-green-600">Fully Present</div><div className="stat-value text-2xl">{stats.present}</div></div>
          <div className="stat bg-yellow-50 p-4 rounded-lg"><div className="stat-title text-yellow-600">Partially Present</div><div className="stat-value text-2xl">{stats.partial}</div></div>
          <div className="stat bg-red-50 p-4 rounded-lg"><div className="stat-title text-red-600">Absent</div><div className="stat-value text-2xl">{stats.absent}</div></div>
          <div className="stat bg-purple-50 p-4 rounded-lg"><div className="stat-title text-purple-600">Attendance Rate</div><div className="stat-value text-2xl">{stats.presentPercentage}%</div></div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label><select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="w-full p-2 border border-gray-300 rounded"><option value="day">Daily View</option><option value="week">Weekly View</option></select></div>
            {viewMode === 'day' && (
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Period</label><select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="w-full p-2 border border-gray-300 rounded">{periods.map(period => (<option key={period} value={period}>{period === 'all' ? 'All Periods' : `Period ${period}`}</option>))}</select></div>
            )}
          </div>
          <button onClick={handleExport} className="btn btn-secondary">Export Attendance</button>
        </div>

        <div className="table-container">
          {viewMode === 'day' ? (
            selectedPeriod === 'all' ? (
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>Roll No.</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Total Hours</th>
                    <th>Status</th>
                    {Object.keys(attendanceData).sort().map(period => (
                      <th key={period}>Period {period}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? (
                    students.map(student => {
                      const hours = getStudentHoursForDay(student.id, selectedDate);
                      const percentage = getAttendancePercentage(hours);
                      const status = getAttendanceStatusForHours(hours);
                      return (
                        <tr key={student.id}>
                          <td>{student.rollNumber}</td>
                          <td>{student.name}</td>
                          <td>{student.email || '-'}</td>
                          <td>{hours} / 8</td>
                          <td>
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                <div className={`h-2.5 rounded-full ${status === 'full' ? 'bg-green-600' : status === 'partial' ? 'bg-yellow-400' : 'bg-red-600'}`} style={{ width: `${percentage}%` }}></div>
                              </div>
                              <span className="text-xs">{status === 'full' ? 'Full' : status === 'partial' ? 'Partial' : 'Absent'}</span>
                            </div>
                          </td>
                          {Object.keys(attendanceData).sort().map(period => {
                            const periodData = attendanceData[period]?.[student.id];
                            return (
                              <td key={period} className={periodData?.status === 'present' ? 'bg-green-100' : periodData?.status === 'absent' ? 'bg-red-100' : ''}>
                                {periodData?.status === 'present' ? `Present (${periodData.hours}h)` : periodData?.status === 'absent' ? 'Absent' : 'N/A'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5 + Object.keys(attendanceData).length} className="text-center py-4">
                        No students found. Please add students in the Student Management page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>Roll No.</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Time Period</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? (
                    students.map(student => {
                      const periodData = attendanceData[student.id];
                      return (
                        <tr key={student.id}>
                          <td>{student.rollNumber}</td>
                          <td>{student.name}</td>
                          <td>{student.email || '-'}</td>
                          <td>{periodData?.timeRange ? `${periodData.timeRange.startTime} - ${periodData.timeRange.endTime}` : '-'}</td>
                          <td>{periodData?.hours || '-'}</td>
                          <td className={periodData?.status === 'present' ? 'bg-green-100' : periodData?.status === 'absent' ? 'bg-red-100' : ''}>
                            {periodData?.status === 'present' ? 'Present' : periodData?.status === 'absent' ? 'Absent' : 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        No students found. Please add students in the Student Management page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Roll No.</th>
                  <th>Name</th>
                  <th>Email</th>
                  {weekDays.map(day => (
                    <th key={format(day, 'yyyy-MM-dd')}>
                      {format(day, 'EEE (MM/dd)')}
                    </th>
                  ))}
                  <th>Weekly Total</th>
                </tr>
              </thead>
              <tbody>
                {students.length > 0 ? (
                  students.map(student => {
                    const weeklyHours = weekDays.reduce((total, day) => {
                      return total + getStudentHoursForDay(student.id, format(day, 'yyyy-MM-dd'));
                    }, 0);
                    return (
                      <tr key={student.id}>
                        <td>{student.rollNumber}</td>
                        <td>{student.name}</td>
                        <td>{student.email || '-'}</td>
                        {weekDays.map(day => {
                          const formattedDay = format(day, 'yyyy-MM-dd');
                          const hours = getStudentHoursForDay(student.id, formattedDay);
                          const percentage = getAttendancePercentage(hours);
                          const status = getAttendanceStatusForHours(hours);
                          return (
                            <td key={formattedDay}>
                              <div className="flex flex-col items-center">
                                <span className="text-xs mb-1">{hours}h</span>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div className={`h-2.5 rounded-full ${status === 'full' ? 'bg-green-600' : status === 'partial' ? 'bg-yellow-400' : 'bg-red-600'}`} style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        <td className="font-semibold">{weeklyHours}h / {weekDays.length * 8}h</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3 + weekDays.length + 1} className="text-center py-4">
                      No students found. Please add students in the Student Management page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceView;