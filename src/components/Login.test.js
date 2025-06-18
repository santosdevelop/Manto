import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../components/Login.jsx';
import '@testing-library/jest-dom';

describe('Login Component', () => {
  const mockNavigate = jest.fn();
  let mockSignIn;
  let mockFireAlert;

  beforeEach(() => {
    // Configuración de mocks
    mockSignIn = jest.fn();
    mockFireAlert = jest.fn(() => Promise.resolve());
    
    jest.mock('firebase/auth', () => ({
      signInWithEmailAndPassword: mockSignIn,
      getAuth: jest.fn(() => ({})),
    }));
    
    // En Login.test.js
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));
    
    jest.mock('sweetalert2', () => ({
      fire: mockFireAlert,
    }));
    
    jest.clearAllMocks();
  });

  const fillAndSubmitForm = async (email, password) => {
    fireEvent.change(screen.getByPlaceholderText('Correo'), {
      target: { value: email }
    });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: password }
    });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
  };

  describe('Renderizado', () => {
    test('muestra el formulario correctamente', () => {
      render(<Login />);
      expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Correo')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });
  });

  describe('Interacción', () => {
    test('alterna visibilidad de contraseña', () => {
      render(<Login />);
      const passwordInput = screen.getByPlaceholderText('Contraseña');
      const toggleButton = screen.getByRole('button', { name: '' });
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Envío del formulario', () => {
    test('éxito con credenciales válidas', async () => {
      mockSignIn.mockResolvedValue({});
      render(<Login />);
      
      await fillAndSubmitForm('test@example.com', 'password123');
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
        expect(mockFireAlert).toHaveBeenCalledWith(
          expect.objectContaining({ icon: 'success' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    test('error con credenciales inválidas', async () => {
      mockSignIn.mockRejectedValue(new Error('Auth failed'));
      render(<Login />);
      
      await fillAndSubmitForm('wrong@example.com', 'wrongpass');
      
      await waitFor(() => {
        expect(mockFireAlert).toHaveBeenCalledWith(
          expect.objectContaining({ icon: 'error' })
        );
        expect(screen.getByText(/incorrectos/)).toBeInTheDocument();
      });
    });

    test('valida campos requeridos', async () => {
      render(<Login />);
      fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
      
      expect(screen.getByPlaceholderText('Correo')).toBeInvalid();
      expect(screen.getByPlaceholderText('Contraseña')).toBeInvalid();
      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });
});