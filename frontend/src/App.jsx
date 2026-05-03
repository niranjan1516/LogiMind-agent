import React from 'react';
import { Activity, Map, TrendingUp } from 'lucide-react';
import DemandChart from './components/DemandChart';
import LiveMap from './components/LiveMap';
import OrderTable from './components/OrderTable';

function App() {
  return (
    <div className="min-h-screen p-6 flex flex-col gap-6 bg-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-700 pb-4">
        <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-2">
          <Activity size={32} />
          LogiMind OS
        </h1>
        <div className="flex items-center gap-4">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm text-slate-400">AI SYSTEM ONLINE</span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column: Live Map */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-lg flex flex-col">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Map className="text-blue-400" />
            Live Fleet Tracking
          </h2>
          <div className="flex-1 rounded-lg text-slate-500 w-full relative z-0">
            <LiveMap />
          </div>
        </div>

        {/* Right Column: AI Forecast */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-emerald-400" />
              24h Demand Forecast
            </h2>
            <div className="p-2">
              <DemandChart city="Mumbai" />
            </div>
            <p className="text-xs text-slate-500 mt-4 italic">
              * Neural Network predicting next 24 hourly cycles for Mumbai regional hub.
            </p>
          </div>

          {/* Quick Stats Widget */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
             <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Active Drivers</h3>
             <p className="text-4xl font-bold text-white">1</p>
             <div className="mt-4 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-1/3"></div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;