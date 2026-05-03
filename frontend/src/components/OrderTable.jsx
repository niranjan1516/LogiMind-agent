import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Package } from 'lucide-react';

const OrderTable = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Fetch orders once when the component loads
    axios.get('http://127.0.0.1:8000/orders/active')
      .then(res => setOrders(res.data))
      .catch(err => console.error("Error fetching orders:", err));
  }, []);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-lg h-full">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Package className="text-blue-400" />
        Active Deliveries
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="text-xs text-slate-500 uppercase bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">Order ID</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 rounded-tr-lg">ETA</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-750 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{order.id}</td>
                <td className="px-4 py-3">{order.destination}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    order.status === 'In Transit' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-emerald-400">{order.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderTable;