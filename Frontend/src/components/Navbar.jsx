import { Link } from 'react-router-dom';
import logo from '../assets/image.png'; 
function Navbar() {
  return (
    <nav className="bg-purple-700 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center text-white text-xl font-bold">
          <img src={logo} alt="Logo" className="h-10 w-150 mr-2" />
          <h1 className='font-mono mt-2 text-[#F7B43F]'>Attendance</h1>
          {/* Codinggita Attendance */}
        </Link>
        <div className="space-x-6">
          <Link to="/" className="text-white hover:text-[#F7B43F] transition duration-300">Dashboard</Link>
          <Link to="/students" className="text-white hover:text-[#F7B43F] transition duration-300 ">Students</Link>
          <Link to="/attendance" className="text-white hover:text-[#F7B43F] transition duration-300 ">Attendance View</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
