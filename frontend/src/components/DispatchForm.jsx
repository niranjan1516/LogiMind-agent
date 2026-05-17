import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

const DispatchForm = ({ onOrderCreated }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    client_phone: '',
    pickup_location: '',
    drop_location: '',
    weight_kg: '',
    scheduled_time: '',
    driver_id: ''
  });

  // Fetch available assets (drivers) when the component loads
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await apiFetch('/drivers');
        const data = await response.json();
        setDrivers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch drivers:", error);
        setStatusMsg({ type: 'error', text: 'Unable to load available drivers.' });
      }
    };
    fetchDrivers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    // Format the payload for the backend
    const scheduledTime = new Date(formData.scheduled_time);
    const payload = {
      ...formData,
      weight_kg: parseFloat(formData.weight_kg),
      driver_id: formData.driver_id || null,
      // Ensure the datetime string is ISO formatted for FastAPI/Postgres
      scheduled_time: scheduledTime.toISOString()
    };

    try {
      await apiFetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setStatusMsg({ type: 'success', text: 'Manifest dispatched successfully!' });
      setTimeout(() => {
        setStatusMsg({ type: '', text: '' });
      }, 3000);

      setFormData({
        client_phone: '', pickup_location: '', drop_location: '',
        weight_kg: '', scheduled_time: '', driver_id: ''
      });
      // Ping parent component to refresh the active orders list
      if (onOrderCreated) onOrderCreated();
    } catch (error) {
      setStatusMsg({ type: 'error', text: `Dispatch failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Create New Dispatch</h2>
      
      {statusMsg.text && (
        <div className={`p-3 mb-4 rounded ${statusMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ROW 1: Client & Cargo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase">Client Phone</label>
            <input type="tel" name="client_phone" required value={formData.client_phone} onChange={handleInputChange} 
                   className="mt-1 w-full p-2 border rounded-md bg-gray-50 text-sm" placeholder="+91 9876543210" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase">Freight Weight (KG)</label>
            <input type="number" name="weight_kg" required value={formData.weight_kg} onChange={handleInputChange} 
                   className="mt-1 w-full p-2 border rounded-md bg-gray-50 text-sm" placeholder="e.g. 1500" />
          </div>
        </div>

        {/* ROW 2: Routing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase">Pickup Origin</label>
            <input type="text" name="pickup_location" required value={formData.pickup_location} onChange={handleInputChange} 
                   className="mt-1 w-full p-2 border rounded-md bg-gray-50 text-sm" placeholder="Warehouse A, Bhiwandi" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase">Drop Destination</label>
            <input type="text" name="drop_location" required value={formData.drop_location} onChange={handleInputChange} 
                   className="mt-1 w-full p-2 border rounded-md bg-gray-50 text-sm" placeholder="Navi Mumbai Port" />
          </div>
        </div>

        {/* ROW 3: Scheduling & Assets */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase">Scheduled Time</label>
            <input type="datetime-local" name="scheduled_time" required value={formData.scheduled_time} onChange={handleInputChange} 
                   className="mt-1 w-full p-2 border rounded-md bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase">Assign Asset (Driver)</label>
            <select name="driver_id" value={formData.driver_id} onChange={handleInputChange} 
                    className="mt-1 w-full p-2 border rounded-md bg-gray-50 text-sm">
              <option value="">-- Auto-Assign / Leave Unassigned --</option>
              {drivers.map(driver => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.name} ({driver.phone_number})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} 
                className={`w-full py-3 rounded-md text-white font-bold transition-colors ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {loading ? 'Transmitting...' : 'Confirm & Dispatch Fleet'}
        </button>
      </form>
    </div>
  );
};

export default DispatchForm;
