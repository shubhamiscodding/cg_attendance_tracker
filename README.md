
# cg_attendance_tracker

## Postman Documentation

- **[CG Attendance Tracker Postman Documentation](https://documenter.getpostman.com/view/39189272/2sAYdmnUXQ)**: Click to view the API documentation for the CG Attendance Tracker project.
-  **[CG Attendance Tracker Backend deploy link](https://cga-16hm.onrender.com)**:

# Key Features Implemented by Team Members

## Garvit Trivedi (https://github.com/Garvit-Trivedi)
  
**Focus**: State Management, Core Logic, & Navigation

1. **Student Management (Logic)**
   - Implemented core logic in `StudentManagement.jsx`:
     - Add/edit student functionality with seat uniqueness validation (toast on conflict).
     - Delete individual/all students with confirmation prompts.
     - CSV import/export with parsing, validation (max 56 students), and toast feedback.
   - Added search filter logic for Name, Roll Number, Email.
2. **Attendance Tracking (State & Core Logic)**
   - Used `useReducer` in `Dashboard.jsx` to manage state (`selectedDate`, `selectedPeriod`, `localAttendance`).
   - Implemented local persistence of `localAttendance` across periods, resetting on date change.
   - Built bulk marking and confirmation logic, ensuring all students are marked before saving.
3. **Performance Optimization**
   - Optimized Dashboard with `useReducer` to reduce re-renders and runtime overhead.
   - Managed local updates to minimize backend calls until confirmation.
4. **Navigation**
   - Set up `App.jsx` with `react-router-dom` for routing (`/login`, `/`, `/students`, `/attendance`).
   - Implemented `Navbar.jsx` with links to Dashboard, Students, and Attendance pages.

---

## Veer Modi (https://github.com/Veer-Modi)
  
**Focus**: Backend Development & Data Integration

1. **Backend Functionality**
   - Developed `attendanceRoutes.js` with API endpoints:
     - `GET /api/attendance`: Fetches attendance with previous period carry-over logic.
     - `POST /api/attendance`: Marks single student attendance with upsert.
     - `POST /api/attendance/bulk`: Bulk updates attendance with hours calculation.
   - Implemented student API endpoints in `studentRoutes.js`:
     - CRUD operations (`POST`, `PUT`, `DELETE`) for individual students.
     - Bulk import (`POST /api/students/bulk`) and delete all (`DELETE /api/students/many`).
2. **Data Storage**
   - Set up MongoDB schemas (`Attendance.js`, `Student.js`) with required fields and unique indexes.
   - Ensured data persistence for attendance (`studentId`, `date`, `period`, etc.) and students.
3. **Error Handling (Backend)**
   - Added validation for required fields in API routes, returning detailed error messages.
   - Implemented console logging for debugging (e.g., `POST /api/attendance: Marking...`).
4. **Time Range Calculation**
   - Wrote `calculateHours` function in `attendanceRoutes.js` to compute hours from `timeRange`.

---

## Shubham Modi (https://github.com/shubhamiscodding)

**Focus**: Frontend UI & User Interaction

1. **Frontend-Only Login Authentication**
   - Implemented `Login.jsx` with a form for email/password input.
   - Hardcoded credentials (`admin@example.com`, `admin123`) and local validation.
   - Success/error toasts using `react-toastify` and navigation to Dashboard on success.
2. **Attendance Tracking (UI)**
   - Designed List View (table with dropdowns) and Seat View (7x8 grid) in `Dashboard.jsx`.
   - Added toggle buttons for switching between views and seat click functionality to mark "present" (green) or "absent" (red).
3. **Dashboard Features (UI)**
   - Created stats section (Total Students, Present, Absent, Partial, Rate) with Tailwind CSS styling.
   - Added date picker, period dropdown, and search bar with responsive layout.
4. **User Interface & Experience**
   - Integrated `react-toastify` for success/error notifications (e.g., login, seat conflicts).
   - Built modals for Add/Edit Student and Confirm Attendance with stats display and action buttons.

---

## Revised Summary of Contributions

| **Member**       | **Workload** | **Key Contributions**                                                                                   |           |
|-------------------|--------------|---------------------------------------------------------------------------------------------------------|-------------------------------|
| **Garvit Trivedi**   | Student management logic, state management with `useReducer`, navigation, performance optimization, attendance core logic | `StudentManagement.jsx`, `Dashboard.jsx`, `App.jsx`, `Navbar.jsx` |
| **Veer Modi**            | Backend API routes, MongoDB schemas, error handling, time range calculation                     | `attendanceRoutes.js`, `studentRoutes.js`, `models/*` |
| **Shubham Modi**   | Login page, UI design (List/Seat Views), dashboard UI, toast notifications, modals             | `Login.jsx`, `Dashboard.jsx`    |

---

## Seat View Implementation Contributions

The Seat View feature (7x8 grid in `Dashboard.jsx`) was a collaborative effort with balanced contributions:

- Garvit Trivedi : 
  - Implemented state management for Seat View using `useReducer` to track `seatView` toggle and `localAttendance`.
  - Handled logic for mapping student data to the 7x8 grid (`getSeatMatrix`) and updating attendance status on seat clicks (`handleSeatClick`).
- Veer Modi : 
  - Provided backend support with `GET /api/attendance` to fetch accurate attendance data for Seat View.
  - Linked student seat positions (row/column) with MongoDB records for data consistency.
- Shubham Modi : 
  - Designed the Seat View UI, including 7x8 grid layout, "Teacher’s Desk" label, and color coding (green for "present", red for "absent", gray for unmarked).
  - Added hover tooltips with student details (Name, Seat, Roll No., Email, Status, Hours) using Tailwind CSS.

---

### Team Members:
- Garvit Trivedi 
- Veer Modi 
- Shubham Modi 
