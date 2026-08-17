import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Activity,
  Briefcase,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft
} from 'lucide-react';

export default function ChipView({ stockInfo, chips, loading, market }) {
  const [activeTab, setActiveTab] = useState('institutional'); // 'institutional', 'margin', 'shareholders'

  if (loading) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[350px] text-slate-500">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-3"></div>
        <p className="text-sm">正在載入籌碼面主力數據...</p>
      </div>
    );
  }

  // Handle US Institutional holders
  if (market === 'US') {
    const majorHolders = chips?.major_holders || [];
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
            <Briefcase className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-sm text-slate-800">美股機構法人與頂級基金持股 (Institutional Ownership)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-sans">
                  <th className="py-2.5 px-3">機構機構名稱 (Holder)</th>
                  <th className="py-2.5 px-3 text-right">持股總股數 (Shares)</th>
                  <th className="py-2.5 px-3 text-right">在外流通占比 (% Out)</th>
                  <th className="py-2.5 px-3 text-right">申報日期 (Reported)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {majorHolders.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 font-sans">{item.holder}</td>
                    <td className="py-2.5 px-3 text-right text-blue-600">{item.shares.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{item.percent_out ? `${item.percent_out}%` : '-'}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{item.date_reported}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Taiwan Stock Chips (三大法人, 融資融券, 集保大戶)
  const { institutional_flow = [], margin_trading = [], shareholder_distribution = [] } = chips || {};

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Sub tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('institutional')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'institutional'
              ? 'bg-blue-50 text-blue-600 border border-blue-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          三大法人買賣超 (外資/投信/自營)
        </button>
        <button
          onClick={() => setActiveTab('margin')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'margin'
              ? 'bg-blue-50 text-blue-600 border border-blue-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          融資融券 (散戶槓桿指標)
        </button>
        <button
          onClick={() => setActiveTab('shareholders')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeTab === 'shareholders'
              ? 'bg-blue-50 text-blue-600 border border-blue-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          集保股權分散 (千張大戶持股比)
        </button>
      </div>

      {/* Tab 1: 三大法人 */}
      {activeTab === 'institutional' && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-sm text-slate-800">三大法人每日買賣超 (張數)</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">正數 = 買超 (紅) / 負數 = 賣超 (綠)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-sans">
                  <th className="py-2.5 px-3">日期</th>
                  <th className="py-2.5 px-3 text-right">收盤價</th>
                  <th className="py-2.5 px-3 text-right">外資 (Foreign)</th>
                  <th className="py-2.5 px-3 text-right">投信 (Trust)</th>
                  <th className="py-2.5 px-3 text-right">自營商 (Dealer)</th>
                  <th className="py-2.5 px-3 text-right font-bold">合計買賣超 (Total)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {institutional_flow.slice(-15).reverse().map((row, idx) => {
                  const isTotalPositive = row.total_net >= 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-600">{row.date}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">{row.close}</td>
                      <td className={`py-2.5 px-3 text-right ${row.foreign >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {row.foreign > 0 ? `+${row.foreign.toLocaleString()}` : row.foreign.toLocaleString()}
                      </td>
                      <td className={`py-2.5 px-3 text-right ${row.trust >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {row.trust > 0 ? `+${row.trust.toLocaleString()}` : row.trust.toLocaleString()}
                      </td>
                      <td className={`py-2.5 px-3 text-right ${row.dealer >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {row.dealer > 0 ? `+${row.dealer.toLocaleString()}` : row.dealer.toLocaleString()}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${isTotalPositive ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {row.total_net > 0 ? `+${row.total_net.toLocaleString()}` : row.total_net.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: 融資融券 */}
      {activeTab === 'margin' && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-sm text-slate-800">信用交易與散戶籌碼指標 (融資融券)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-sans">
                  <th className="py-2.5 px-3">日期</th>
                  <th className="py-2.5 px-3 text-right">融資餘額 (張)</th>
                  <th className="py-2.5 px-3 text-right">融資增減</th>
                  <th className="py-2.5 px-3 text-right">融券餘額 (張)</th>
                  <th className="py-2.5 px-3 text-right">融券增減</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {margin_trading.slice(-15).reverse().map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600">{row.date}</td>
                    <td className="py-2.5 px-3 text-right text-slate-800 font-medium">{row.margin_balance.toLocaleString()}</td>
                    <td className={`py-2.5 px-3 text-right ${row.margin_change >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {row.margin_change > 0 ? `+${row.margin_change}` : row.margin_change}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-800 font-medium">{row.short_balance.toLocaleString()}</td>
                    <td className={`py-2.5 px-3 text-right ${row.short_change >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {row.short_change > 0 ? `+${row.short_change}` : row.short_change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: 集保大戶 */}
      {activeTab === 'shareholders' && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-sm text-slate-800">集保中心股權分散趨勢 (大戶籌碼鎖定度)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shareholder_distribution.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-mono text-blue-600 font-bold text-xs">{item.date} 週資料</span>
                  <span className="text-[10px] text-slate-500">大戶持股集中度</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-600">&gt; 1000張 超級大戶比率:</span>
                  <span className="font-mono font-bold text-indigo-600">{item.large_ratio_1000}%</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-600">&gt; 400張 大戶持股比率:</span>
                  <span className="font-mono font-bold text-blue-600">{item.large_ratio_400}%</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-600">散戶持股比率:</span>
                  <span className="font-mono text-slate-600">{item.retail_ratio}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
