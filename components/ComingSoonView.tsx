'use client';

import React from 'react';
import { Settings, ShieldAlert, ChevronRight } from 'lucide-react';

interface ComingSoonViewProps {
  title: string;
  description: string;
}

export function ComingSoonView({ title, description }: ComingSoonViewProps) {
  return (
    <div className="p-8 font-sans" id="coming-soon-view">
      {/* Breadcrumb */}
      <div className="flex items-center text-xs text-aws-text-muted mb-6">
        <span>Route 53</span>
        <ChevronRight className="w-3.5 h-3.5 mx-1" />
        <span className="text-aws-text">{title}</span>
      </div>

      {/* Header */}
      <div className="border-b border-[#eaeded] pb-4 mb-6">
        <h1 className="text-2xl font-bold text-aws-text">{title}</h1>
        <p className="text-sm text-aws-text-muted mt-1">
          Explore advanced routing, traffic steering, and VPC resolver policies.
        </p>
      </div>

      {/* Content Card */}
      <div className="bg-white border border-[#d5dbdb] p-8 rounded shadow-sm max-w-3xl">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-[#e2f0fd] rounded">
            <Settings className="w-8 h-8 text-[#0073bb] animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-aws-text mb-2">Feature Preview: {title}</h2>
            <p className="text-sm text-aws-text-muted leading-relaxed mb-6">
              {description}
            </p>

            <div className="bg-amber-50 border border-amber-300 p-4 rounded text-xs text-amber-800 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">AWS Route53 Global Service Note</p>
                <p className="mt-1 text-amber-700">
                  This console capability is currently simulated in this Route53 mock workspace environment. Real-time updates, VPC triggers, and custom JSON profiles will be activated soon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
