import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="navbar-logo">
            <Store className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">CodeStore</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors font-medium" data-testid="navbar-home">
              Projects
            </Link>
            <Link to="/admin/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium" data-testid="navbar-admin">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
