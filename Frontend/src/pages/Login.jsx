import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VALID_CREDENTIALS = {
  name: import.meta.env.VITE_NAME,
  email: import.meta.env.VITE_EMAIL,
  password: import.meta.env.VITE_PASSWORD,
};

const Login = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (name === VALID_CREDENTIALS.name && email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
      localStorage.setItem('user', JSON.stringify({ name, email }));
      onLogin(); // Update state in App.jsx
      navigate('/'); // Redirect to dashboard
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input 
          type="text" 
          placeholder="Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className="w-full p-2 border rounded mb-2" 
        />
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="w-full p-2 border rounded mb-2" 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          className="w-full p-2 border rounded mb-2" 
        />
        <button onClick={handleLogin} className="w-full bg-blue-500 text-white p-2 rounded">
          Login
        </button>
      </div>
    </div>
  );
};

export default Login;
