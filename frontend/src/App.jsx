import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  Database,
  Share2,
  LineChart,
  BarChart2,
  Users2,
  FileText,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Layers,
  MessageSquare,
  Bell,
  ShoppingCart,
  UserCircle,
  Menu,
  Settings,
  BookOpen,
  Code,
  Sparkles,
  Folder
} from 'lucide-react';

import StockChart from './components/StockChart';
import FundamentalView from './components/FundamentalView';
import ChipView from './components/ChipView';
import CollaborativeNotes from './components/CollaborativeNotes';
import SyncStatusModal from './components/SyncStatusModal';

// Initial default custom list
const DEFAULT_WATCHLIST = [
  { symbol: '2330.TW', name: '台積電', market: 'TW' },
  { symbol: '2317.TW', name: '鴻海', market: 'TW' },
  { symbol: '2603.TW', name: '長榮', market: 'TW' },
  { symbol: 'NVDA', name: '輝達 (NVIDIA)', market: 'US' },
  { symbol: 'TSLA', name: '特斯拉 (Tesla)', market: 'US' }
];

export default function App() {
  // Sidebar custom watchlist state (saved in localStorage)
  const [customStocks, setCustomStocks] = useState(() => {
    const saved = localStorage.getItem('stockweb_custom_list');
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
  });

  // Track expanded state for each stock item in sidebar
  const [expandedStocks, setExpandedStocks] = useState(() => ({
    '2330.TW': true,
    'NVDA': true
  }));

  // Active selected stock & sub-view
  const [activeSymbol, setActiveSymbol] = useState('2330.TW');
  const [activeMarket, setActiveMarket] = useState('TW');
  const [activeSubView, setActiveSubView] = useState('chart'); // 'chart', 'fundamentals', 'chips', 'notes'

  // Sidebar visibility toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Add stock dialog/input state
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Data states for current active symbol
  const [stockInfo, setStockInfo] = useState(null);
  const [klineData, setKlineData] = useState([]);
  const [fundamentals, setFundamentals] = useState(null);
  const [chips, setChips] = useState(null);

  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingFund, setLoadingFund] = useState(false);
  const [loadingChips, setLoadingChips] = useState(false);

  // Sync & Share state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Save custom stocks to localStorage
  useEffect(() => {
    localStorage.setItem('stockweb_custom_list', JSON.stringify(customStocks));
  }, [customStocks]);

  // Load stock data on symbol/market change
  useEffect(() => {
    loadAllStockData(activeSymbol, activeMarket);
  }, [activeSymbol, activeMarket]);

  const loadAllStockData = async (sym, mkt) => {
    setLoadingInfo(true);
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sym)}/info?market=${mkt}`);
      if (res.ok) {
        const info = await res.json();
        setStockInfo(info);
      }
    } catch (e) {
      console.warn('Failed to load info:', e);
    } finally {
      setLoadingInfo(false);
    }

    loadKlineData(sym, mkt);

    setLoadingFund(true);
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sym)}/fundamentals?market=${mkt}`);
      if (res.ok) {
        const data = await res.json();
        setFundamentals(data);
      }
    } catch (e) {
      console.warn('Failed to load fundamentals:', e);
    } finally {
      setLoadingFund(false);
    }

    setLoadingChips(true);
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sym)}/chips?market=${mkt}`);
      if (res.ok) {
        const data = await res.json();
        setChips(data);
      }
    } catch (e) {
      console.warn('Failed to load chips:', e);
    } finally {
      setLoadingChips(false);
    }
  };

  const loadKlineData = async (sym, mkt, period = '1y') => {
    setLoadingChart(true);
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sym)}/kline?market=${mkt}&period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setKlineData(data);
      }
    } catch (e) {
      console.warn('Failed to load kline:', e);
    } finally {
      setLoadingChart(false);
    }
  };

  // Add stock search debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (addSearchQuery.trim().length > 0) {
        try {
          const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(addSearchQuery)}`);
          if (res.ok) {
            const results = await res.json();
            setSearchResults(results);
          }
        } catch (e) {
          console.warn('Search error:', e);
        }
      } else {
        setSearchResults([]);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [addSearchQuery]);

  const handleAddStock = (item) => {
    if (!customStocks.some((s) => s.symbol === item.symbol)) {
      const updated = [...customStocks, { symbol: item.symbol, name: item.name, market: item.market }];
      setCustomStocks(updated);
    }
    setExpandedStocks((prev) => ({ ...prev, [item.symbol]: true }));
    setActiveSymbol(item.symbol);
    setActiveMarket(item.market);
    setActiveSubView('chart');
    setAddSearchQuery('');
    setIsAddingStock(false);
  };

  const handleRemoveStock = (sym, e) => {
    e.stopPropagation();
    const updated = customStocks.filter((s) => s.symbol !== sym);
    setCustomStocks(updated);
    if (activeSymbol === sym && updated.length > 0) {
      setActiveSymbol(updated[0].symbol);
      setActiveMarket(updated[0].market);
    }
  };

  const toggleStockExpand = (sym) => {
    setExpandedStocks((prev) => ({
      ...prev,
      [sym]: !prev[sym]
    }));
  };

  const handleSelectSubView = (sym, mkt, subView) => {
    setActiveSymbol(sym);
    setActiveMarket(mkt);
    setActiveSubView(subView);
  };

  const getSubViewTitle = () => {
    switch (activeSubView) {
      case 'chart': return '技術面 (Technical)';
      case 'fundamentals': return '基本面 (Fundamentals)';
      case 'chips': return '籌碼面 (Chips)';
      case 'notes': return '協同筆記 (Notes)';
      default: return '技術面';
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col font-sans text-slate-800">
      
      {/* Smart UI Reference Header (Dark Blue) */}
      <header className="bg-[#175d96] text-white flex items-center justify-between h-14 shrink-0 z-50 sticky top-0">
        
        {/* Left: Logo Area (White background to match sidebar) */}
        <div className="flex items-center h-full">
          {/* Logo container matching sidebar width */}
          <div className="bg-white w-72 h-full flex items-center justify-between px-4 border-b border-slate-200">
            <div className="flex items-center gap-2 text-slate-800">
              <TrendingUp className="w-5 h-5 text-slate-800" />
              <span className="font-bold text-lg">Stock UI</span>
              <span className="text-[10px] text-slate-500 font-normal">build more, trade better</span>
            </div>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-slate-600">
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Top Nav Links */}
          <nav className="flex items-center ml-4 space-x-6 text-sm font-medium">
            <a href="#" className="hover:text-blue-200 transition-colors">Dashboard</a>
            <a href="#" className="hover:text-blue-200 transition-colors">Contact us</a>
            <a href="#" className="text-white border-b-2 border-white pb-1">Watchlist</a>
            <a href="#" className="hover:text-blue-200 transition-colors">Forums</a>
          </nav>
        </div>

        {/* Right: Icons */}
        <div className="flex items-center pr-6 space-x-5">
          <button onClick={() => setIsSyncModalOpen(true)} className="relative hover:text-blue-200" title="PSQL Sync">
            <Database className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">3</span>
          </button>
          <button className="relative hover:text-blue-200">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">4</span>
          </button>
          <button className="hover:text-blue-200">
            <ShoppingCart className="w-5 h-5" />
          </button>
          <button className="hover:text-blue-200 ml-2">
            <UserCircle className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar (White) */}
        {isSidebarOpen && (
          <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto z-40">
            
            {/* Sidebar Sections */}
            <div className="p-4 flex flex-col gap-1 text-sm">
              <a href="#" className="flex items-center gap-3 py-2 text-slate-600 hover:text-slate-900">
                <Layers className="w-4 h-4" />
                <span>Introduction</span>
              </a>
              <a href="#" className="flex items-center gap-3 py-2 text-slate-600 hover:text-slate-900">
                <Sparkles className="w-4 h-4" />
                <span>Get Started</span>
              </a>
            </div>

            {/* My Watchlist Section */}
            <div className="mt-4">
              <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>WATCHLIST</span>
                <button 
                  onClick={() => setIsAddingStock(!isAddingStock)}
                  className="text-slate-400 hover:text-blue-500 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> 加入股票
                </button>
              </div>

              {/* Add Stock Search Popup/Input */}
              {isAddingStock && (
                <div className="mx-4 mb-2 p-2 rounded bg-slate-50 border border-slate-200 shadow-sm relative">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      value={addSearchQuery}
                      onChange={(e) => setAddSearchQuery(e.target.value)}
                      placeholder="搜尋代碼 (例: 2330)..."
                      className="w-full pl-7 pr-2 py-1 text-xs border border-slate-300 rounded outline-none focus:border-blue-500"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100 rounded bg-white border border-slate-200 absolute left-0 right-0 z-50">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAddStock(item)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{item.symbol}</span>
                            <span className="ml-2 text-slate-500">{item.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{item.market}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Watchlist Tree Items */}
              <div className="flex flex-col">
                {customStocks.map((stock) => {
                  const isExpanded = !!expandedStocks[stock.symbol];
                  const isStockSelected = activeSymbol === stock.symbol;
                  
                  // In the Smart UI theme, the parent might not be highlighted if a child is selected, 
                  // or it might just be bold. Let's make the parent look like a category folder.
                  return (
                    <div key={stock.symbol} className="flex flex-col">
                      {/* Parent Row */}
                      <div
                        onClick={() => toggleStockExpand(stock.symbol)}
                        className={`group px-4 py-2.5 flex items-center justify-between cursor-pointer select-none text-sm transition-colors ${
                          isExpanded ? 'text-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BarChart2 className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className={`truncate ${isExpanded ? 'font-semibold' : ''}`}>
                            {stock.symbol} {stock.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => handleRemoveStock(stock.symbol, e)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="移除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Children Sub-Items */}
                      {isExpanded && (
                        <div className="flex flex-col py-1">
                          {[
                            { id: 'chart', label: '技術面 (Chart)', icon: LineChart },
                            { id: 'fundamentals', label: '基本面 (Fundamentals)', icon: Database },
                            { id: 'chips', label: '籌碼面 (Chips)', icon: Users2 },
                            { id: 'notes', label: '筆記 (Notes)', icon: FileText }
                          ].map(sub => {
                            const isActive = isStockSelected && activeSubView === sub.id;
                            return (
                              <button
                                key={sub.id}
                                onClick={() => handleSelectSubView(stock.symbol, stock.market, sub.id)}
                                className={`w-full text-left pl-10 pr-4 py-2 text-sm flex items-center justify-between transition-colors ${
                                  isActive 
                                    ? 'bg-[#f0f9ff] text-[#0ea5e9] border-l-4 border-[#0ea5e9] font-medium' 
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent'
                                }`}
                              >
                                <span>{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        {/* Right Main Content Area */}
        <main className="flex-1 flex flex-col bg-[#f4f5f7] overflow-hidden relative">
          
          {/* Sub-header Breadcrumbs & Action Buttons (White background) */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center text-sm">
              <span className="font-bold text-slate-800">{activeSymbol}</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-500">{stockInfo?.name}</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-500">{getSubViewTitle()}</span>
            </div>
            
            {/* Action Buttons styled like the reference */}
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors">
                <Folder className="w-4 h-4" />
                View Source
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors">
                <BookOpen className="w-4 h-4" />
                Documentation
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>

          {/* Floating Settings Gear Icon (Right edge) */}
          <button className="absolute right-0 top-32 bg-slate-800 text-white p-2 rounded-l-md shadow-lg z-10 hover:bg-slate-700">
            <Settings className="w-5 h-5" />
          </button>

          {/* Dynamic Content Viewport */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Stock Price Header Summary - Optional in light theme, maybe styled as a simple white card */}
            <div className="bg-white rounded border border-slate-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-800">{stockInfo?.name || activeSymbol}</h2>
                  <span className="text-sm text-slate-500 font-mono">{activeSymbol}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                    {stockInfo?.industry || activeMarket}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-500">目前價格</span>
                  <div className="text-2xl font-bold font-mono text-slate-800">
                    {stockInfo?.current_price ? stockInfo.current_price.toLocaleString() : '-'}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-4 text-xs">
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-slate-500">本益比 PE</span>
                    <span className="font-bold text-slate-700">{stockInfo?.pe_ratio ? `${stockInfo.pe_ratio}x` : '-'}</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-slate-500">殖利率 Yield</span>
                    <span className="font-bold text-slate-700">{stockInfo?.dividend_yield ? `${stockInfo.dividend_yield}%` : '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active View Rendering */}
            <div className="bg-white rounded border border-slate-200 p-1 shadow-sm min-h-[500px]">
              {activeSubView === 'chart' && (
                <StockChart
                  symbol={activeSymbol}
                  market={activeMarket}
                  klineData={klineData}
                  loading={loadingChart}
                  onReload={(period) => loadKlineData(activeSymbol, activeMarket, period)}
                  theme="light" // Pass theme prop if needed by KLineCharts
                />
              )}
              {activeSubView === 'fundamentals' && (
                <FundamentalView
                  stockInfo={stockInfo}
                  fundamentals={fundamentals}
                  loading={loadingFund}
                />
              )}
              {activeSubView === 'chips' && (
                <ChipView
                  stockInfo={stockInfo}
                  chips={chips}
                  loading={loadingChips}
                  market={activeMarket}
                />
              )}
              {activeSubView === 'notes' && (
                <CollaborativeNotes
                  symbol={activeSymbol}
                  market={activeMarket}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </div>
  );
}
