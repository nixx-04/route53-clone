import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface ComingSoonViewProps {
  title: string;
  description: string;
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({ title, description }) => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs text-aws-text-muted mb-4">
        <span>Route 53</span>
        <span>&gt;</span>
        <span className="text-aws-text">{title}</span>
      </div>

      <div className="bg-white border border-aws-border p-8 rounded shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-50 text-aws-blue rounded">
            <Clock className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-aws-text mb-2">{title}</h1>
            <p className="text-aws-text-muted mb-6 text-sm leading-relaxed">
              {description}
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">Mock Environment Active</h4>
                <p className="text-xs text-amber-700 mt-1">
                  This feature is currently under active simulation in our mocked sandbox. The core DNS Hosted Zones 
                  and record sets CRUD operations are fully functional!
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-aws-border">
              <h3 className="text-sm font-medium text-aws-text mb-4">Route 53 Developer Reference</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-aws-border rounded hover:bg-slate-50 transition">
                  <h4 className="text-xs font-semibold text-aws-blue uppercase tracking-wider">Traffic flow</h4>
                  <p className="text-xs text-aws-text-muted mt-1">
                    Route internet traffic dynamically using geographic routing, latency-based routing, or multi-value answers.
                  </p>
                </div>
                <div className="p-4 border border-aws-border rounded hover:bg-slate-50 transition">
                  <h4 className="text-xs font-semibold text-aws-blue uppercase tracking-wider">Health checks</h4>
                  <p className="text-xs text-aws-text-muted mt-1">
                    Monitor resources such as web servers and email servers. Automatically failover traffic when resources go offline.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
