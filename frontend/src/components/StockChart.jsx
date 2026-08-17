import React, { useEffect, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import {
  TrendingUp,
  Maximize2,
  Minimize2,
  Trash2,
  Save,
  Layers,
  Sparkles,
  MousePointer,
  HelpCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

const DRAWING_TOOLS = [
  { id: 'segment', name: '趨勢線段 (Segment)', icon: '/' },
  { id: 'rayLine', name: '射線 (Ray)', icon: '→' },
  { id: 'horizontalStraightLine', name: '水平支撐壓力 (Horiz Line)', icon: '—' },
  { id: 'priceLine', name: '價格線 (Price Line)', icon: '$' },
  { id: 'parallelStraightLine', name: '平行通道 (Channel)', icon: '||' },
  { id: 'fibonacciLine', name: '斐波那契回撤 (Fibonacci)', icon: 'Fib' },
  { id: 'rect', name: '矩形區間 (Box)', icon: '□' },
  { id: 'simpleAnnotation', name: '文字標註 (Text)', icon: 'T' }
];

const INDICATORS = [
  { id: 'MA', name: '均線 (MA 5/10/20/60)' },
  { id: 'EMA', name: '指數均線 (EMA)' },
  { id: 'BOLL', name: '布林通道 (BOLL)' },
  { id: 'VOL', name: '成交量 (Volume)', pane: true },
  { id: 'MACD', name: '平滑異同 (MACD)', pane: true },
  { id: 'RSI', name: '相對強弱 (RSI)', pane: true },
  { id: 'KDJ', name: '隨機指標 (KDJ)', pane: true }
];

export default function StockChart({ symbol, market, klineData, loading, onReload }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [activeIndicators, setActiveIndicators] = useState(['MA', 'VOL', 'MACD']);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState('1d');

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Dispose existing chart if any
    if (chartInstanceRef.current) {
      dispose(chartContainerRef.current);
    }

    const chart = init(chartContainerRef.current, {
      styles: {
        grid: {
          show: true,
          horizontal: { color: 'rgba(0, 0, 0, 0.05)', style: 'dash' },
          vertical: { color: 'rgba(0, 0, 0, 0.05)', style: 'dash' }
        },
        yAxis: {
          axisLine: { color: 'rgba(0, 0, 0, 0.1)' },
          tickText: { color: '#64748b' }
        },
        xAxis: {
          axisLine: { color: 'rgba(0, 0, 0, 0.1)' },
          tickText: { color: '#64748b' }
        },
        candle: {
          type: 'candle_solid',
          bar: {
            // TW Market default: Up is Red (#ef4444), Down is Green (#10b981)
            upColor: market === 'TW' ? '#ef4444' : '#10b981',
            downColor: market === 'TW' ? '#10b981' : '#ef4444',
            noChangeColor: '#94a3b8',
            upBorderColor: market === 'TW' ? '#ef4444' : '#10b981',
            downBorderColor: market === 'TW' ? '#10b981' : '#ef4444',
            upWickColor: market === 'TW' ? '#ef4444' : '#10b981',
            downWickColor: market === 'TW' ? '#10b981' : '#ef4444'
          },
          tooltip: {
            text: {
              color: '#1e293b',
              size: 12
            }
          }
        },
        indicator: {
          lastValueMark: { show: true }
        }
      }
    });

    chartInstanceRef.current = chart;

    // Setup initial main indicators
    chart.createIndicator('MA', false, { id: 'candle_pane' });

    // Setup sub pane indicators
    chart.createIndicator('VOL', true);
    chart.createIndicator('MACD', true);

    // Apply data
    if (klineData && klineData.length > 0) {
      chart.applyNewData(klineData);
    }

    // Load saved drawings for this stock
    loadSavedDrawings(symbol);

    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      dispose(chartContainerRef.current);
    };
  }, [symbol, market]);

  // Update data when klineData updates
  useEffect(() => {
    if (chartInstanceRef.current && klineData && klineData.length > 0) {
      chartInstanceRef.current.applyNewData(klineData);
    }
  }, [klineData]);

  // Load saved drawings from DB
  const loadSavedDrawings = async (sym) => {
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sym)}/drawings`);
      if (res.ok) {
        const drawings = await res.json();
        if (drawings && drawings.length > 0 && chartInstanceRef.current) {
          // Re-apply drawing overlays if saved
          drawings.forEach((d) => {
            if (Array.isArray(d.drawing_data)) {
              d.drawing_data.forEach((item) => {
                try {
                  chartInstanceRef.current.createOverlay(item);
                } catch (err) {
                  console.warn('Overlay error:', err);
                }
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load drawings:', e);
    }
  };

  // Select drawing tool
  const handleSelectTool = (toolId) => {
    if (!chartInstanceRef.current) return;
    if (selectedTool === toolId) {
      setSelectedTool(null);
      return;
    }
    setSelectedTool(toolId);
    chartInstanceRef.current.createOverlay({
      name: toolId,
      lock: false,
      onDrawEnd: () => {
        setSelectedTool(null);
      }
    });
  };

  // Toggle indicators
  const toggleIndicator = (ind) => {
    if (!chartInstanceRef.current) return;
    const chart = chartInstanceRef.current;
    
    if (activeIndicators.includes(ind.id)) {
      chart.removeIndicator('candle_pane', ind.id);
      setActiveIndicators(activeIndicators.filter((i) => i !== ind.id));
    } else {
      if (ind.pane) {
        chart.createIndicator(ind.id, true);
      } else {
        chart.createIndicator(ind.id, false, { id: 'candle_pane' });
      }
      setActiveIndicators([...activeIndicators, ind.id]);
    }
  };

  // Clear all overlays
  const handleClearDrawings = () => {
    if (!chartInstanceRef.current) return;
    chartInstanceRef.current.removeOverlay();
  };

  // Save drawing state to DB
  const handleSaveDrawings = async () => {
    if (!chartInstanceRef.current) return;
    setSaveStatus('saving');
    try {
      // Collect overlays from chart (or current state)
      const overlays = chartInstanceRef.current.getOverlays() || [];
      const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/drawings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'User',
          drawing_data: overlays,
          is_public: true
        })
      });
      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 2500);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <div className={`glass-card p-4 flex flex-col gap-3 relative transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50 bg-white shadow-2xl' : ''}`}>
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Left: Timeframes & Drawing tools indicator */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-medium">
            {['1d', '1wk', '1mo'].map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setCurrentPeriod(tf);
                  onReload && onReload(tf);
                }}
                className={`px-3 py-1 rounded transition-colors ${currentPeriod === tf ? 'bg-blue-100 text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {tf === '1d' ? '日 K' : tf === '1wk' ? '周 K' : '月 K'}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Indicator toggles dropdown / buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {INDICATORS.slice(0, 4).map((ind) => (
              <button
                key={ind.id}
                onClick={() => toggleIndicator(ind)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all border ${
                  activeIndicators.includes(ind.id)
                    ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm font-medium'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {ind.id}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Save, Clear, Fullscreen */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleSaveDrawings}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-all font-medium"
            title="儲存所有畫線至雲端資料庫"
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveStatus === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saveStatus === 'success' ? '已儲存' : '儲存畫線'}</span>
          </button>

          <button
            onClick={handleClearDrawings}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-500 hover:border-rose-200 transition-colors shadow-sm"
            title="清除畫線"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-sm"
            title={isFullscreen ? '退出全螢幕' : '全螢幕圖表'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Chart Container with Left Side Floating Drawing Toolbox */}
      <div className="relative w-full flex-1 min-h-[500px] flex">
        {/* TradingView Style Floating Drawing Toolbar */}
        <div className="absolute left-2 top-4 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-lg">
          <div className="text-[10px] text-slate-400 font-bold px-1 text-center border-b border-slate-100 pb-1">
            畫線
          </div>
          {DRAWING_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleSelectTool(tool.id)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                selectedTool === tool.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600'
              }`}
              title={tool.name}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Chart Canvas */}
        <div
          ref={chartContainerRef}
          className="w-full h-full min-h-[500px] rounded-lg overflow-hidden"
          style={{ background: 'transparent' }}
        />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30">
            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
            <span className="text-xs text-slate-600 font-mono">載入 K 線即時行情中...</span>
          </div>
        )}
      </div>

      {/* Footer tips */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>點選左側畫線工具後，在圖表上點擊起點與終點即可完成畫線；畫完點擊右上角「儲存畫線」即可跨裝置同步。</span>
        </div>
        <div className="font-mono text-slate-400">
          市場顏色：{market === 'TW' ? '紅漲綠跌 (台股標準)' : '綠漲紅跌 (美股標準)'}
        </div>
      </div>
    </div>
  );
}
