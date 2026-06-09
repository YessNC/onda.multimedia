// src/routes/Dashboard.tsx
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Mi Dashboard</h1>
      <p className="mt-2">Bienvenido, {user?.full_name}</p>
      <p className="text-gray-600">Rol: {user?.role}</p>

      <button
        onClick={logout}
        className="mt-6 rounded-md bg-red-500 px-4 py-2 text-white"
      >
        Cerrar Sesión
      </button>
    </div>
  );
}