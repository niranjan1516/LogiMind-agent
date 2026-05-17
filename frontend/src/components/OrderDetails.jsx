const OrderDetails = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-2xl w-full text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Order ID: {order.order_id}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">X</button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">CURRENT STATUS</p>
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-bold">
              {order.status}
            </span>

            <p className="text-slate-400 text-sm mt-4">PICKUP</p>
            <p className="font-medium">{order.pickup_location}</p>
          </div>

          <div className="space-y-4">
            <p className="text-slate-400 text-sm">ASSIGNED DRIVER</p>
            <p className="font-medium">{order.driver_id || 'Unassigned'}</p>

            <p className="text-slate-400 text-sm mt-4">DROP-OFF</p>
            <p className="font-medium">{order.drop_location}</p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">AI Intelligence Layer</p>
          <p className="text-sm mt-1 text-slate-300 italic">Waiting for telemetry data to generate route efficiency analysis...</p>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
