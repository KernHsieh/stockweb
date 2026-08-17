import React from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from 'lucide-react';

export default function FundamentalView({ stockInfo, fundamentals, loading }) {
  if (loading) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[350px] text-slate-500">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-3"></div>
        <p className="text-sm">正在載入基本面財報數據...</p>
      </div>
    );
  }

  const { monthly_revenue = [], quarterly_financials = [], dividends = [] } = fundamentals || {};

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-medium">本益比 (P/E Ratio)</span>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {stockInfo?.pe_ratio ? `${stockInfo.pe_ratio}x` : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            {stockInfo?.pe_ratio && stockInfo.pe_ratio < 15 ? '估值合理偏低' : '成長型溢價'}
          </span>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-medium">股價淨值比 (P/B)</span>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {stockInfo?.pb_ratio ? `${stockInfo.pb_ratio}x` : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">資產評價參考</span>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-medium">現金殖利率 (Dividend Yield)</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {stockInfo?.dividend_yield ? `${stockInfo.dividend_yield}%` : '0.00%'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">年度現金配息報酬</span>
        </div>

        <div className="glass-card p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-medium">市值 (Market Cap)</span>
          <div className="text-xl font-bold font-mono text-slate-800 mt-1 truncate">
            {stockInfo?.market_cap
              ? `${(stockInfo.market_cap / 100000000).toLocaleString(undefined, { maximumFractionDigits: 1 })} 億`
              : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">規模量體</span>
        </div>
      </div>

      {/* Monthly Revenue Trend & Table */}
      {monthly_revenue.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-sm text-slate-800">月營收成長趨勢 (近 12 個月)</h3>
            </div>
            <span className="text-xs text-slate-500">單位：百萬 {stockInfo?.currency || 'TWD'}</span>
          </div>

          {/* Simple Visual Bar Chart */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 mb-4 items-end h-32 pt-4 px-2 border-b border-slate-100 pb-2">
            {monthly_revenue.slice(-12).map((item, idx) => {
              const maxRev = Math.max(...monthly_revenue.map((m) => m.revenue || 1));
              const heightPct = Math.max(15, Math.round((item.revenue / maxRev) * 100));
              const isPositive = item.yoy_percent >= 0;

              return (
                <div key={idx} className="flex flex-col items-center gap-1 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 shadow-lg px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-20 pointer-events-none text-slate-700">
                    {item.date}: {item.revenue.toLocaleString()}M (YoY: {item.yoy_percent}%)
                  </div>
                  
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isPositive ? 'bg-rose-500/80 hover:bg-rose-600' : 'bg-emerald-500/80 hover:bg-emerald-600'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-400">{item.date.slice(5)}</span>
                </div>
              );
            })}
          </div>

          {/* Revenue Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-sans">
                  <th className="py-2 px-3">月份</th>
                  <th className="py-2 px-3 text-right">單月營收 (百萬)</th>
                  <th className="py-2 px-3 text-right">月增率 (MoM)</th>
                  <th className="py-2 px-3 text-right">年增率 (YoY)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthly_revenue.slice(-6).reverse().map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-slate-600">{row.date}</td>
                    <td className="py-2 px-3 text-right text-slate-800 font-medium">{row.revenue.toLocaleString()}</td>
                    <td className={`py-2 px-3 text-right ${row.mom_percent >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {row.mom_percent > 0 ? `+${row.mom_percent}%` : `${row.mom_percent}%`}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${row.yoy_percent >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {row.yoy_percent > 0 ? `+${row.yoy_percent}%` : `${row.yoy_percent}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quarterly Margins & Profitability */}
      {quarterly_financials.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
            <PieChart className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-sm text-slate-800">季獲利能力三率 (毛利率 / 營業利益率 / 純益率)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quarterly_financials.slice(0, 4).map((q, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-xs font-bold font-mono text-blue-600">{q.quarter}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    營收: {(q.revenue / 100000000).toFixed(1)} 億
                  </span>
                </div>

                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">毛利率 (Gross):</span>
                  <span className="font-mono font-bold text-rose-600">{q.gross_margin}%</span>
                </div>

                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">營業利益率 (Op):</span>
                  <span className="font-mono text-amber-600">{q.operating_margin}%</span>
                </div>

                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">稅後純益率 (Net):</span>
                  <span className="font-mono text-blue-600">{q.net_margin}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business Profile Description */}
      {stockInfo?.summary && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm text-slate-800 mb-2">公司營運與業務概述</h3>
          <p className="text-xs text-slate-600 leading-relaxed max-h-36 overflow-y-auto">
            {stockInfo.summary}
          </p>
        </div>
      )}
    </div>
  );
}
