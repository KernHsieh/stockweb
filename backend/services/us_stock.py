import datetime
import yfinance as yf
import pandas as pd
from typing import Dict, Any, List, Optional

US_POPULAR_NAMES = {
    "AAPL": "Apple Inc. (蘋果)",
    "NVDA": "NVIDIA Corp (輝達)",
    "TSLA": "Tesla Inc. (特斯拉)",
    "MSFT": "Microsoft Corp (微軟)",
    "AMZN": "Amazon.com (亞馬遜)",
    "GOOGL": "Alphabet Inc. (谷歌)",
    "META": "Meta Platforms (臉書)",
    "AMD": "Advanced Micro Devices (超微)",
    "AVGO": "Broadcom Inc. (博通)",
    "PLTR": "Palantir Technologies",
    "SMCI": "Super Micro Computer",
    "COIN": "Coinbase Global"
}

def normalize_us_symbol(symbol: str) -> str:
    return symbol.strip().upper()

def get_us_stock_info(symbol: str) -> Dict[str, Any]:
    norm_sym = normalize_us_symbol(symbol)
    ticker = yf.Ticker(norm_sym)
    
    try:
        info = ticker.info or {}
        market_cap = info.get("marketCap", 0)
        trailing_pe = info.get("trailingPE", 0)
        forward_pe = info.get("forwardPE", 0)
        price_to_book = info.get("priceToBook", 0)
        dividend_yield = (info.get("dividendYield") or 0) * 100
        current_price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
        short_name = info.get("shortName") or US_POPULAR_NAMES.get(norm_sym, norm_sym)
        sector = info.get("sector", "Technology")
        industry = info.get("industry", "Semiconductors")
        summary = info.get("longBusinessSummary", "")
        fifty_two_week_high = info.get("fiftyTwoWeekHigh", 0)
        fifty_two_week_low = info.get("fiftyTwoWeekLow", 0)
    except Exception:
        market_cap = 0
        trailing_pe = 0
        forward_pe = 0
        price_to_book = 0
        dividend_yield = 0
        current_price = 0
        short_name = US_POPULAR_NAMES.get(norm_sym, norm_sym)
        sector = "Technology"
        industry = "Tech"
        summary = ""
        fifty_two_week_high = 0
        fifty_two_week_low = 0

    return {
        "symbol": norm_sym,
        "name": short_name,
        "market": "US",
        "current_price": current_price,
        "currency": "USD",
        "market_cap": market_cap,
        "pe_ratio": round(trailing_pe, 2) if trailing_pe else None,
        "forward_pe": round(forward_pe, 2) if forward_pe else None,
        "pb_ratio": round(price_to_book, 2) if price_to_book else None,
        "dividend_yield": round(dividend_yield, 2) if dividend_yield else None,
        "fifty_two_week_high": fifty_two_week_high,
        "fifty_two_week_low": fifty_two_week_low,
        "sector": sector,
        "industry": industry,
        "summary": summary
    }

def get_us_kline(symbol: str, period: str = "1y", interval: str = "1d") -> List[Dict[str, Any]]:
    norm_sym = normalize_us_symbol(symbol)
    ticker = yf.Ticker(norm_sym)
    df = ticker.history(period=period, interval=interval)

    if df.empty:
        return []

    df = df.reset_index()
    kline_data = []

    for _, row in df.iterrows():
        if "Date" in row:
            dt = pd.to_datetime(row["Date"])
        elif "Datetime" in row:
            dt = pd.to_datetime(row["Datetime"])
        else:
            dt = datetime.datetime.now()

        timestamp = int(dt.timestamp() * 1000)
        open_val = float(row.get("Open", 0))
        high_val = float(row.get("High", 0))
        low_val = float(row.get("Low", 0))
        close_val = float(row.get("Close", 0))
        volume_val = float(row.get("Volume", 0))
        turnover_val = volume_val * close_val

        kline_data.append({
            "timestamp": timestamp,
            "open": round(open_val, 2),
            "high": round(high_val, 2),
            "low": round(low_val, 2),
            "close": round(close_val, 2),
            "volume": volume_val,
            "turnover": turnover_val
        })

    return kline_data

def get_us_fundamentals(symbol: str) -> Dict[str, Any]:
    norm_sym = normalize_us_symbol(symbol)
    ticker = yf.Ticker(norm_sym)

    quarterly_data = []
    try:
        fin = ticker.quarterly_financials
        if fin is not None and not fin.empty:
            for col in fin.columns[:8]:
                revenue = float(fin.loc["Total Revenue", col]) if "Total Revenue" in fin.index else 0
                gross_profit = float(fin.loc["Gross Profit", col]) if "Gross Profit" in fin.index else 0
                operating_income = float(fin.loc["Operating Income", col]) if "Operating Income" in fin.index else 0
                net_income = float(fin.loc["Net Income", col]) if "Net Income" in fin.index else 0

                gross_margin = round((gross_profit / revenue * 100), 2) if revenue > 0 else 0
                operating_margin = round((operating_income / revenue * 100), 2) if revenue > 0 else 0
                net_margin = round((net_income / revenue * 100), 2) if revenue > 0 else 0

                quarterly_data.append({
                    "quarter": str(col)[:10],
                    "revenue": revenue,
                    "gross_margin": gross_margin,
                    "operating_margin": operating_margin,
                    "net_margin": net_margin,
                    "net_income": net_income
                })
    except Exception:
        pass

    # Earnings history
    earnings_history = []
    try:
        earn = ticker.earnings_history
        if earn is not None and not earn.empty:
            earn = earn.reset_index()
            for _, row in earn.tail(6).iterrows():
                earnings_history.append({
                    "date": str(row.get("Earnings Date", ""))[:10],
                    "eps_estimate": row.get("EPS Estimate"),
                    "eps_actual": row.get("Reported EPS"),
                    "surprise_percent": row.get("Surprise(%)")
                })
    except Exception:
        pass

    return {
        "symbol": norm_sym,
        "quarterly_financials": quarterly_data,
        "earnings_history": earnings_history
    }

def get_us_institutional(symbol: str) -> Dict[str, Any]:
    norm_sym = normalize_us_symbol(symbol)
    ticker = yf.Ticker(norm_sym)

    major_holders = []
    try:
        inst_holders = ticker.institutional_holders
        if inst_holders is not None and not inst_holders.empty:
            for _, row in inst_holders.head(10).iterrows():
                major_holders.append({
                    "holder": str(row.get("Holder", "")),
                    "shares": int(row.get("Shares", 0)),
                    "date_reported": str(row.get("Date Reported", ""))[:10],
                    "percent_out": round(float(row.get("% Out", 0)) * 100, 2) if row.get("% Out") else None,
                    "value": int(row.get("Value", 0))
                })
    except Exception:
        pass

    return {
        "symbol": norm_sym,
        "major_holders": major_holders
    }
