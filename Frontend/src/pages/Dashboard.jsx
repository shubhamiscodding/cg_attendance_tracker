import { useReducer, useEffect } from 'react';
import { useStudents } from '../context/StudentContext';
import { useAttendance } from '../context/AttendanceContext';
import { format } from 'date-fns';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Reducer for state management
const initialState = {
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  selectedPeriod: '1',
  timeRange: { startTime: '09:00', endTime: '11:00' },
  seatView: false,
  searchTerm: '',
  selectedStatus: 'present',
  hoveredStudent: null,
  localAttendance: {}, // Persists across periods for the same date
  isConfirmModalOpen: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_DATE':
      return { ...state, selectedDate: action.payload, localAttendance: {}, selectedPeriod: '1' };
    case 'SET_PERIOD':
      return { ...state, selectedPeriod: action.payload };
    case 'SET_TIME_RANGE':
      return { ...state, timeRange: { ...state.timeRange, [action.payload.name]: action.payload.value } };
    case 'SET_SEAT_VIEW':
      return { ...state, seatView: action.payload };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_SELECTED_STATUS':
      return { ...state, selectedStatus: action.payload };
    case 'SET_HOVERED_STUDENT':
      return { ...state, hoveredStudent: action.payload };
    case 'SET_LOCAL_ATTENDANCE':
      return { ...state, localAttendance: action.payload };
    case 'UPDATE_ATTENDANCE':
      return {
        ...state,
        localAttendance: {
          ...state.localAttendance,
          [action.payload.studentId]: {
            status: action.payload.status,
            timeRange: action.payload.status === 'present' ? state.timeRange : null,
            hours: action.payload.status === 'present' ? calculateHours(state.timeRange) : 0,
          },
        },
      };
    case 'BULK_UPDATE_ATTENDANCE':
      return {
        ...state,
        localAttendance: {
          ...state.localAttendance,
          ...Object.fromEntries(
            Object.entries(action.payload.studentsStatus).map(([id, status]) => [
              id,
              { status, timeRange: status === 'present' ? state.timeRange : null, hours: status === 'present' ? calculateHours(state.timeRange) : 0 }
            ])
          ),
        },
      };
    case 'SET_CONFIRM_MODAL':
      return { ...state, isConfirmModalOpen: action.payload };
    default:
      return state;
  }
};

const calculateHours = (timeRange) => {
  if (!timeRange || !timeRange.startTime || !timeRange.endTime) return 0;
  const [startHour, startMinute] = timeRange.startTime.split(':').map(Number);
  const [endHour, endMinute] = timeRange.endTime.split(':').map(Number);
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;
  return Math.round((endTimeInMinutes - startTimeInMinutes) / 6) / 10;
};

function Dashboard() {
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { bulkMarkAttendance, getAttendanceForDate, getTotalHoursForDate, fetchAttendance, loading: attendanceLoading, error: attendanceError } = useAttendance();
  const [state, dispatch] = useReducer(reducer, initialState);
  const periods = ['1', '2', '3', '4', '5', '6'];

  useEffect(() => {
    if (!studentsLoading && students.length > 0) {
      fetchAttendance(state.selectedDate, state.selectedPeriod).then(data => {
        // Merge fetched data with existing localAttendance, prioritizing local changes
        dispatch({ type: 'SET_LOCAL_ATTENDANCE', payload: { ...state.localAttendance, ...data } });
      });
    }
  }, [state.selectedDate, state.selectedPeriod, studentsLoading, students]);

  const handleTimeChange = (e) => {
    dispatch({ type: 'SET_TIME_RANGE', payload: { name: e.target.name, value: e.target.value } });
  };

  const handleAttendanceChange = (studentId, status) => {
    dispatch({ type: 'UPDATE_ATTENDANCE', payload: { studentId, status } });
  };

  const handleBulkAttendance = () => {
    const studentsStatus = {};
    filteredStudents.forEach(student => {
      studentsStatus[student.id] = state.selectedStatus;
    });
    dispatch({ type: 'BULK_UPDATE_ATTENDANCE', payload: { studentsStatus } });
  };

  const getAttendanceStatus = (studentId) => {
    return state.localAttendance[studentId]?.status || '';
  };

  const calculateStats = () => {
    if (!students.length) return { present: 0, absent: 0, total: 0, presentPercentage: 0, partialPresent: 0, unmarked: 0 };
    const present = Object.values(state.localAttendance).filter(record => record?.status === 'present').length;
    const absent = Object.values(state.localAttendance).filter(record => record?.status === 'absent').length;
    const partialPresent = students.filter(student => {
      const totalHours = getTotalHoursForDate(state.selectedDate, student.id);
      return totalHours > 0 && totalHours < 8;
    }).length;
    const total = students.length;
    const unmarked = total - (present + absent);
    const presentPercentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, presentPercentage, partialPresent, unmarked };
  };

  const stats = calculateStats();

  const getSeatMatrix = () => {
    const matrix = Array(7).fill(null).map(() => Array(8).fill(null));
    students.forEach(student => {
      if (student.seatRow >= 0 && student.seatRow < 7 && student.seatColumn >= 0 && student.seatColumn < 8) {
        matrix[student.seatRow][student.seatColumn] = student;
      }
    });
    return matrix;
  };

  const handleSeatClick = (studentId) => {
    if (!studentId) return;
    const currentStatus = getAttendanceStatus(studentId);
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    handleAttendanceChange(studentId, newStatus);
  };

  const handleConfirmAttendance = async () => {
    if (stats.unmarked > 0) {
      toast.error(`${stats.unmarked} student(s) remain unmarked. Please mark all students before confirming.`);
      dispatch({ type: 'SET_SEAT_VIEW', payload: true });
      return;
    }

    try {
      const studentsStatus = Object.fromEntries(
        Object.entries(state.localAttendance).map(([studentId, data]) => [studentId, data.status])
      );
      await bulkMarkAttendance(state.selectedDate, studentsStatus, state.selectedPeriod, state.timeRange);
      dispatch({ type: 'SET_CONFIRM_MODAL', payload: false });
      toast.success(`Attendance confirmed for Period ${state.selectedPeriod}!`);
      // Refetch to sync with backend
      fetchAttendance(state.selectedDate, state.selectedPeriod).then(data => {
        dispatch({ type: 'SET_LOCAL_ATTENDANCE', payload: { ...state.localAttendance, ...data } });
      });
    } catch (err) {
      toast.error('Failed to confirm attendance');
    }
  };

  const filteredStudents = students.filter(student => 
    (student.name || '').toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    (student.rollNumber || '').toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    (student.email || '').toLowerCase().includes(state.searchTerm.toLowerCase())
  ).sort((a, b) => (a.seatRow * 8 + a.seatColumn) - (b.seatRow * 8 + b.seatColumn));

  const getStudentHours = (studentId) => {
    return state.localAttendance[studentId]?.hours || 0;
  };

  if (studentsLoading || attendanceLoading) return <div className="text-center py-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Dashboard (56 Seats)</h1>
        <div className="flex space-x-2">
          <button className={`btn ${state.seatView ? 'btn-secondary' : 'btn-primary'}`} onClick={() => dispatch({ type: 'SET_SEAT_VIEW', payload: false })}>
            List View
          </button>
          <button className={`btn ${state.seatView ? 'btn-primary' : 'btn-secondary'}`} onClick={() => dispatch({ type: 'SET_SEAT_VIEW', payload: true })}>
            Seat View
          </button>
        </div>
      </div>

      {(studentsError || attendanceError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {studentsError || attendanceError}
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="stats grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="stat bg-blue-50 p-4 rounded-lg"><div className="stat-title text-blue-600">Total Students</div><div className="stat-value text-2xl">{stats.total}</div></div>
          <div className="stat bg-green-50 p-4 rounded-lg"><div className="stat-title text-green-600">Present</div><div className="stat-value text-2xl">{stats.present}</div></div>
          <div className="stat bg-yellow-50 p-4 rounded-lg"><div className="stat-title text-yellow-600">Partial</div><div className="stat-value text-2xl">{stats.partialPresent}</div></div>
          <div className="stat bg-red-50 p-4 rounded-lg"><div className="stat-title text-red-600">Absent</div><div className="stat-value text-2xl">{stats.absent}</div></div>
          <div className="stat bg-purple-50 p-4 rounded-lg"><div className="stat-title text-purple-600">Attendance Rate</div><div className="stat-value text-2xl">{stats.presentPercentage}%</div></div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={state.selectedDate} onChange={(e) => dispatch({ type: 'SET_DATE', payload: e.target.value })} className="w-full p-2 border border-gray-300 rounded" /></div>
          <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Period</label><select value={state.selectedPeriod} onChange={(e) => dispatch({ type: 'SET_PERIOD', payload: e.target.value })} className="w-full p-2 border border-gray-300 rounded">{periods.map(period => (<option key={period} value={period}>Period {period}</option>))}</select></div>
          <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label><input type="time" name="startTime" value={state.timeRange.startTime} onChange={handleTimeChange} className="w-full p-2 border border-gray-300 rounded" /></div>
          <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">End Time</label><input type="time" name="endTime" value={state.timeRange.endTime} onChange={handleTimeChange} className="w-full p-2 border border-gray-300 rounded" /></div>
          <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Search Students</label><input type="text" placeholder="Search by name, roll no, email..." value={state.searchTerm} onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })} className="w-full p-2 border border-gray-300 rounded" /></div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <select value={state.selectedStatus} onChange={(e) => dispatch({ type: 'SET_SELECTED_STATUS', payload: e.target.value })} className="p-2 border border-gray-300 rounded">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
            <button onClick={handleBulkAttendance} className="btn btn-primary">
              Mark All {state.searchTerm ? 'Filtered' : ''} Students
            </button>
          </div>
          <button onClick={() => dispatch({ type: 'SET_CONFIRM_MODAL', payload: true })} className="btn btn-success">Confirm Attendance</button>
        </div>

        {state.seatView ? (
          <div className="seat-view">
            <h2 className="text-xl font-semibold mb-4">Classroom Seat View (7x8 Grid)</h2>
            <div className="mb-6 p-2 bg-gray-100 text-center font-bold">TEACHER'S DESK</div>
            <div className="space-y-4">
              {getSeatMatrix().map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-8 gap-2">
                  {row.map((student, colIndex) => {
                    const seatNumber = rowIndex * 8 + colIndex + 1;
                    return (
                      <div key={student ? student.id : `empty-${rowIndex}-${colIndex}`} className="relative">
                        <div 
                          className={`
                            p-2 rounded-lg shadow-sm border-2 text-center cursor-pointer text-sm
                            ${student ? (getAttendanceStatus(student.id) === 'present' ? 'bg-green-100 border-green-400' : 
                                         getAttendanceStatus(student.id) === 'absent' ? 'bg-red-100 border-red-400' : 
                                         'bg-gray-100 border-gray-300') : 'bg-gray-200 border-gray-400 opacity-50'}
                          `}
                          onClick={() => student && handleSeatClick(student.id)}
                          onMouseEnter={() => student && dispatch({ type: 'SET_HOVERED_STUDENT', payload: student.id })}
                          onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STUDENT', payload: null })}
                        >
                          <div>{student ? `${seatNumber}` : 'Empty'}</div>
                          <div>{student ? student.rollNumber : ''}</div>
                          <div>{student ? student.name : ''}</div>
                        </div>
                        {state.hoveredStudent === student?.id && (
                          <div className="absolute z-10 w-48 bg-white border border-gray-300 rounded-lg shadow-lg p-3 -mt-1 left-full ml-2">
                            <div className="font-medium text-lg">{student.name}</div>
                            <div className="text-sm text-gray-500">Seat: {seatNumber} ({student.seatRow},{student.seatColumn})</div>
                            <div className="text-sm text-gray-500">Roll: {student.rollNumber}</div>
                            <div className="text-sm text-gray-500">{student.email || 'No email'}</div>
                            <div className="mt-1 text-sm">
                              Status: {getAttendanceStatus(student.id) === 'present' ? 
                                <span className="text-green-600">Present ({getStudentHours(student.id)} hours)</span> : 
                                getAttendanceStatus(student.id) === 'absent' ? 
                                <span className="text-red-600">Absent</span> : 
                                <span className="text-gray-600">Not marked</span>}
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              Click to mark {getAttendanceStatus(student.id) === 'present' ? 'absent' : 'present'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Seat No.</th>
                  <th>Roll No.</th>
                  <th>Name</th>
                  {/* <th>Email</th> */}
                  <th>Seat Position</th>
                  <th>Time Period</th>
                  <th>Hours</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.seatRow * 8 + student.seatColumn + 1}</td>
                      <td>{student.rollNumber}</td>
                      <td>{student.name}</td>
                      {/* <td>{student.email || '-'}</td> */}
                      <td>({student.seatRow},{student.seatColumn})</td>
                      <td>{state.timeRange.startTime} - {state.timeRange.endTime}</td>
                      <td>{getAttendanceStatus(student.id) === 'present' ? getStudentHours(student.id) : '-'}</td>
                      <td>
                        <select
                          value={getAttendanceStatus(student.id)}
                          onChange={(e) => handleAttendanceChange(student.id, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded"
                        >
                          <option value="">Select</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      {state.searchTerm ? 'No matching students found.' : 'No students found. Please add students in the Student Management page.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Attendance Modal */}
      {state.isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Confirm Attendance</h2>
            <div className="space-y-2">
              <p><strong>Present:</strong> {stats.present}</p>
              <p><strong>Absent:</strong> {stats.absent}</p>
              <p><strong>Unmarked:</strong> {stats.unmarked}</p>
            </div>
            <div className="flex space-x-2 mt-4">
              <button onClick={handleConfirmAttendance} className="btn btn-primary">Confirm</button>
              <button onClick={() => dispatch({ type: 'SET_CONFIRM_MODAL', payload: false })} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
    </div>
  );
}

export default Dashboard;