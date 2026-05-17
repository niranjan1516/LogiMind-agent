import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const STATUS_STYLES = {
  PENDING: 'bg-amber-500/20 text-amber-400',
  ACCEPTED: 'bg-sky-500/20 text-sky-400',
  ARRIVED_AT_PICKUP: 'bg-violet-500/20 text-violet-300',
  CARGO_LOADED: 'bg-blue-500/20 text-blue-400',
  IN_TRANSIT: 'bg-blue-500/20 text-blue-400',
  DELIVERED: 'bg-emerald-500/20 text-emerald-400',
};

const formatStatus = (status) => status?.replace(/_/g, ' ') || 'UNKNOWN';

const OrderTable = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to fetch live orders from the PostgreSQL database
  const fetchOrders = async () => {
    try {
      const response = await apiFetch('/orders/active');
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
      setError('');
    } catch (error) {
      console.error("Failed to fetch active orders:", error);
      setError('Unable to load active dispatches.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount, and then poll every 5 seconds to keep the board fresh
  useEffect(() => {
    const initialFetch = setTimeout(fetchOrders, 0);
    const interval = setInterval(fetchOrders, 5000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <div className="text-slate-400 p-4 animate-pulse">Loading manifest data...</div>;
  }

  if (error && orders.length === 0) {
    return (
      <div className="text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 border-2 border-dashed border-slate-700 rounded-lg">
        <p>No active dispatches.</p>
        <p className="text-xs mt-1">Use the Dispatch Command to assign a route.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="text-xs uppercase bg-slate-800 text-slate-400 border-b border-slate-700">
          <tr>
            <th scope="col" className="px-4 py-3">Order ID</th>
            <th scope="col" className="px-4 py-3">Destination</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">AI ETA</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.order_id || order.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 font-medium text-blue-400">{order.id}</td>
              <td className="px-4 py-3 truncate max-w-[150px]">{order.destination}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_STYLES[order.status] || 'bg-slate-700 text-slate-300'}`}>
                  {formatStatus(order.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 font-mono">{order.eta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
