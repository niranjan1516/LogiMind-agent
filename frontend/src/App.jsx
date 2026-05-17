import { Activity, Map, TrendingUp, ClipboardList, List } from 'lucide-react';
import DemandChart from './components/DemandChart';
import LiveMap from './components/LiveMap';
import OrderTable from './components/OrderTable';
import DispatchForm from './components/DispatchForm';

function App() {
  return (
    <div className="min-h-screen p-6 flex flex-col gap-6 bg-slate-900 text-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-700 pb-4">
        <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-2">
          <Activity size={32} />
          LogiMind OS
        </h1>
        <div className="flex items-center gap-4">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm text-slate-400 font-medium tracking-wide">AI SYSTEM ONLINE</span>
        </div>
      </header>

      {/* TOP ROW: Monitoring (Map & Forecast) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Live Map */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-lg flex flex-col min-h-[400px]">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Map className="text-blue-400" />
            Live Fleet Tracking
          </h2>
          <div className="flex-1 rounded-lg overflow-hidden w-full relative z-0">
            <LiveMap />
          </div>
        </div>

        {/* Right Column: AI Forecast & Stats */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-lg flex-1">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-emerald-400" />
              24h Demand Forecast
            </h2>
            <div className="w-full h-48">
              <DemandChart city="Mumbai" />
            </div>
            <p className="text-xs text-slate-500 mt-4 italic">
              * Neural Network predicting next 24 hourly cycles for Mumbai regional hub.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
             <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Active Drivers</h3>
             <p className="text-4xl font-bold text-white mt-1">1</p>
             <div className="mt-4 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-1/3"></div>
             </div>
          </div>
        </div>

      </div>

      {/* BOTTOM ROW: Operations (Dispatch & Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dispatch Form Panel */}
        <div className="lg:col-span-1 bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="text-blue-400" />
            Dispatch Command
          </h2>
          {/* Form container with white background to match the component we built earlier */}
          <div className="rounded-lg overflow-hidden text-gray-800">
             <DispatchForm />
          </div>
        </div>

        {/* Active Orders Panel */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-lg flex flex-col">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <List className="text-blue-400" />
            Active Fleet Manifest
          </h2>
          <div className="flex-1 bg-slate-900 rounded-lg p-2 overflow-auto">
            <OrderTable />
          </div>
        </div>

      </div>

    </div>
  );
}

export default App;
