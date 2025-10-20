import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Code, Package, Download, Key, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (orderId) => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.open(response.data.download_url, '_blank');
      toast.success('Download started');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Download failed');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Code className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              CodeMart
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} data-testid="back-home-btn">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12" data-testid="user-dashboard-page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="dashboard-heading">My Purchases</h1>
          <p className="text-gray-600">Welcome back, {user.name}!</p>
        </div>

        {loading ? (
          <div className="text-center py-20" data-testid="loading-state">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-effect rounded-xl p-12 text-center" data-testid="empty-state">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">No purchases yet</p>
            <Button onClick={() => navigate('/')} data-testid="browse-products-btn">Browse Products</Button>
          </div>
        ) : (
          <div className="glass-effect rounded-xl overflow-hidden" data-testid="orders-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>License Key</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                    <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                    <TableCell>₹{order.amount}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {order.license_key ? (
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-purple-600" />
                          <span className="font-mono text-sm">{order.license_key.slice(0, 12)}...</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {order.status === 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(order.id)}
                          data-testid={`download-btn-${order.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;