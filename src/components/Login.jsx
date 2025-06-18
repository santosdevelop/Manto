import React, { useState } from 'react';
import '../components/Login.css';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // Importa SweetAlert2

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, username, password);

      // Alerta de inicio de sesión exitoso
      Swal.fire({
        icon: 'success',
        title: '¡Inicio de sesión exitoso!',
        showConfirmButton: false,
        timer: 1500
      });

      // Espera 1.5 segundos y redirige al dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      // Alerta de error
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Correo o contraseña incorrectos',
      });
      setError("Correo o contraseña incorrectos.");
    }
  };

  return (
    <div className="login-background">
      <div className="login-box">
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <FaUser className="icon" />
            <input
              type="email"
              placeholder="Correo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-container">
            <FaLock className="icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="eye-icon"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
          <button type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
}
