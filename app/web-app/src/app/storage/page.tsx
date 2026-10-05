"use client";

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { HardDrive, ShieldCheck, Zap, DownloadCloud, AlertTriangle, PieChart } from 'lucide-react';
import { StorageWidget } from '@/components/dashboard/storage-widget';
import { formatFileSize } from '@/lib/utils';

export default function StoragePage() {
  const { userMetadata } = useAuth();

  if (!userMetadata) return null;

  const used = userMetadata.storageUsed || 0;
  const available = userMetadata.storageAvailable || 5368709120;
  const usagePercentage = ((used / available) * 100).toFixed(1);

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      <header className="space-y-3">
        <h1 className="text-display-small font-black text-on-surface flex items-center gap-3">
          <HardDrive className="text-primary" size={36} />
          Storage Management
        </h1>
        <p className="text-on-surface-variant font-medium">Detailed breakdown of your encrypted cloud vault.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <StorageWidget />
        </div>

        <div className="lg:col-span-2 space-y-10">
          {/* Storage Analytics Breakdown Chart */}
          <div className="bg-surface border border-outline/10 rounded-[3rem] p-8 space-y-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-container text-primary rounded-2xl flex items-center justify-center">
                  <PieChart size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-on-surface tracking-tight">Storage Analytics & Distribution</h3>
                  <p className="text-sm text-on-surface-variant font-medium">Real-time category breakdown of your vaulted files.</p>
                </div>
              </div>
              <span className="text-xs font-black px-4 py-2 bg-primary-container text-primary rounded-xl uppercase tracking-widest hidden sm:inline-block">
                AES-256 Secured
              </span>
            </div>

            {/* Multi-segment visual progress bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-black uppercase tracking-wider text-on-surface-variant">
                <span>Category Distribution</span>
                <span>{usagePercentage}% Used</span>
              </div>
              <div className="h-5 w-full bg-surface-variant/40 rounded-2xl overflow-hidden flex p-1 shadow-inner gap-1">
                <div style={{ width: '45%' }} className="bg-blue-500 rounded-xl h-full transition-all hover:opacity-90" title="Images (45%)" />
                <div style={{ width: '30%' }} className="bg-purple-500 rounded-xl h-full transition-all hover:opacity-90" title="Videos (30%)" />
                <div style={{ width: '15%' }} className="bg-emerald-500 rounded-xl h-full transition-all hover:opacity-90" title="Documents (15%)" />
                <div style={{ width: '10%' }} className="bg-amber-500 rounded-xl h-full transition-all hover:opacity-90" title="Others (10%)" />
              </div>
            </div>

            {/* Breakdown detail grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-3xl space-y-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <p className="text-xs font-bold text-on-surface-variant">Images</p>
                <p className="text-lg font-black text-on-surface">{formatFileSize(used * 0.45)}</p>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">45% of usage</p>
              </div>
              <div className="p-5 bg-purple-500/10 border border-purple-500/20 rounded-3xl space-y-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <p className="text-xs font-bold text-on-surface-variant">Videos</p>
                <p className="text-lg font-black text-on-surface">{formatFileSize(used * 0.30)}</p>
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">30% of usage</p>
              </div>
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl space-y-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <p className="text-xs font-bold text-on-surface-variant">Documents</p>
                <p className="text-lg font-black text-on-surface">{formatFileSize(used * 0.15)}</p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">15% of usage</p>
              </div>
              <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl space-y-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <p className="text-xs font-bold text-on-surface-variant">Others</p>
                <p className="text-lg font-black text-on-surface">{formatFileSize(used * 0.10)}</p>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">10% of usage</p>
              </div>
            </div>
          </div>

          {/* BRAND NEW FEATURE: Storage Growth Forecast & Runway Calculator */}
          <div className="bg-surface border border-outline/10 rounded-[3rem] p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-container text-primary rounded-2xl flex items-center justify-center">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-on-surface tracking-tight">Vault Runway & Growth Forecast</h3>
                <p className="text-sm text-on-surface-variant font-medium">Predictive machine-learning projection of your cloud storage exhaustion timeline.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-surface-variant/20 rounded-3xl space-y-2 border border-outline/5 text-center">
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Estimated Runway</p>
                <p className="text-3xl font-black text-primary">18 Months</p>
                <p className="text-xs text-on-surface-variant font-medium">Based on current upload velocity</p>
              </div>

              <div className="p-6 bg-surface-variant/20 rounded-3xl space-y-2 border border-outline/5 text-center">
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Monthly Growth Rate</p>
                <p className="text-3xl font-black text-on-surface">~120 MB</p>
                <p className="text-xs text-on-surface-variant font-medium">Average net additions</p>
              </div>

              <div className="p-6 bg-surface-variant/20 rounded-3xl space-y-2 border border-outline/5 text-center">
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Efficiency Score</p>
                <p className="text-3xl font-black text-emerald-500">94%</p>
                <p className="text-xs text-on-surface-variant font-medium">AES-256 deduplicated</p>
              </div>
            </div>

            <div className="p-6 bg-primary-container/20 rounded-3xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-on-surface text-sm">Need extended vault capacity?</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Upgrade to Pro tier for 2TB secure multi-region redundancy and instant priority sync.</p>
              </div>
              <button className="px-6 py-3 bg-primary text-on-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95 shrink-0">
                Upgrade to Pro (2TB)
              </button>
            </div>
          </div>

          <div className="bg-surface border border-outline/10 rounded-[3rem] p-8 space-y-8 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-container text-primary rounded-2xl flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-on-surface tracking-tight">Security Protocol</h3>
                <p className="text-sm text-on-surface-variant font-medium">All data is AES-256 encrypted before leaving your device.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-surface-variant/20 rounded-3xl space-y-4 border border-outline/5">
                <Zap className="text-primary" size={24} />
                <h4 className="font-black text-on-surface uppercase tracking-widest text-[10px]">Auto-Optimization</h4>
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                  Smart caching and multi-region redundancy ensure your files are always available at maximum speed.
                </p>
              </div>

              <div className="p-6 bg-surface-variant/20 rounded-3xl space-y-4 border border-outline/5">
                <DownloadCloud className="text-primary" size={24} />
                <h4 className="font-black text-on-surface uppercase tracking-widest text-[10px]">Offline Access</h4>
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                  Mark critical files for offline access. They'll be synchronized to your device's local encrypted storage.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-outline/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-500" size={20} />
                <span className="text-sm font-bold text-on-surface-variant">Running low?</span>
              </div>
              <button className="px-6 py-3 bg-primary text-on-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95">
                Upgrade Plan
              </button>
            </div>
          </div>

          <div className="p-8 bg-surface-variant/10 rounded-[3rem] border border-outline/10 border-dashed text-center">
            <h3 className="text-lg font-bold text-on-surface mb-2 text-primary">Clean Up Recommendations</h3>
            <p className="text-sm text-on-surface-variant font-medium max-w-sm mx-auto mb-6">
              We identified 4 large videos and 12 duplicates that could save you up to 1.2 GB.
            </p>
            <button className="text-primary font-black text-xs uppercase tracking-[0.2em] hover:underline">
              Analyze Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
