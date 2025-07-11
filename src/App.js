import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import './press-start-font.css';

// Helper function from original code
function nameToUint64(name) {
    const charmap = '.12345abcdefghijklmnopqrstuvwxyz';
    // eslint-disable-next-line no-undef
    let value = BigInt(0);
    for (let i = 0; i < 13; i++) {
        let c = 0n;
        if (i < name.length) {
            // eslint-disable-next-line no-undef
            c = BigInt(charmap.indexOf(name[i]));
        }
        if (i < 12) {
            value <<= 5n;
            value |= c & 0x1fn;
        } else {
            value <<= 4n;
            value |= c & 0xfn;
        }
    }
    return value.toString();
}

// Main App Component
export default function App() {
    // States
    const [accountName, setAccountName] = useState('inch12');
    const [accountScope, setAccountScope] = useState(nameToUint64(accountName));
    const [xprAmount, setXprAmount] = useState(0);
    const [priceUSD, setPriceUSD] = useState(0);
    const [krwExchange, setKrwExchange] = useState(1380);
    const [loading, setLoading] = useState(false);
    const [actions, setActions] = useState([]);
    const [actionsLoading, setActionsLoading] = useState(false);
    const [actionsError, setActionsError] = useState(null);
    const [analyzedData, setAnalyzedData] = useState(null);

    // Effect to update scope when account name changes
    useEffect(() => {
        setAccountScope(nameToUint64(accountName));
    }, [accountName]);

    // Effect to fetch initial account data
    useEffect(() => {
        if (!accountName) return;
        setLoading(true);
        const today = new Date();
        const dateParam = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        const fetchPrice = fetch("https://www.api.bloks.io/proton/ticker/null").then(res => res.json());
        const fetchExchange = fetch(`https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json?date=${dateParam}`).then(res => res.json());
        const fetchBalance = fetch("https://rpc.api.mainnet.metalx.com/v1/chain/get_table_rows", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ json: true, code: "eosio", scope: accountScope, table: "delxpr", limit: -1 })
        }).then(res => res.json());

        Promise.all([fetchPrice, fetchExchange, fetchBalance])
            .then(([priceData, exchangeData, balanceData]) => {
                if (priceData) setPriceUSD(priceData);
                if (exchangeData?.conversions?.USD?.KRW) setKrwExchange(exchangeData.conversions.USD.KRW);
                const row = balanceData.rows.find(r => r.quantity);
                setXprAmount(row ? row.quantity.split(' ')[0] : 0);
            })
            .catch(err => console.error("Error fetching initial data:", err))
            .finally(() => setLoading(false));
    }, [accountName, accountScope]);

    // Function to analyze fetched actions
    const analyzeActions = useCallback(async (actionsToAnalyze, currentKrwRate) => {
        setActionsLoading(true);
        const deposits = actionsToAnalyze
            .map(a => a.action_trace)
            .filter(trace =>
                trace.act.name === 'transfer' &&
                trace.act.data.to === accountName &&
                trace.act.data.quantity?.endsWith('XPR')
            );

        if (deposits.length === 0) {
            setAnalyzedData({ totalInvestedKRW: 0, averagePriceKRW: 0, deposits: [] });
            setActionsLoading(false);
            return;
        }

        const priceCache = new Map();
        const getPriceForDate = async (date) => {
            if (priceCache.has(date)) return priceCache.get(date);
            try {
                const response = await fetch(`/v3/coins/proton/history?date=${date}&localization=false`);
                if (!response.ok) throw new Error(`CoinGecko API error! Status: ${response.status}`);
                const data = await response.json();
                const price = data?.market_data?.current_price?.usd;
                if (price) priceCache.set(date, price);
                return price;
            } catch (error) {
                console.error(`Failed to fetch price for ${date}:`, error);
                return null; // Return null if price fetch fails
            }
        };

        let totalInvestedKRW = 0;
        let totalQuantity = 0;

        const depositDetails = await Promise.all(deposits.map(async (trace) => {
            const quantity = parseFloat(trace.act.data.quantity);
            const timestamp = new Date(trace.block_time + 'Z'); // Append Z for UTC
            const dateStr = `${timestamp.getDate()}-${timestamp.getMonth() + 1}-${timestamp.getFullYear()}`;

            const priceUsdOnDate = await getPriceForDate(dateStr);
            if (priceUsdOnDate === null) return null; // Skip if price is not available

            const investedKRW = quantity * priceUsdOnDate * currentKrwRate;
            totalInvestedKRW += investedKRW;
            totalQuantity += quantity;

            return {
                date: timestamp.toLocaleString(),
                quantity,
                priceUsdOnDate,
                investedKRW
            };
        }));

        const validDeposits = depositDetails.filter(Boolean); // Filter out nulls
        const averagePriceKRW = totalQuantity > 0 ? totalInvestedKRW / totalQuantity : 0;

        setAnalyzedData({ totalInvestedKRW, averagePriceKRW, deposits: validDeposits });
        setActionsLoading(false);
    }, [accountName]);

    // Function to fetch actions from Greymass
    const fetchAndAnalyzeActions = useCallback(async () => {
        if (!accountName) {
            setActionsError("Please enter an account name first.");
            return;
        }
        setActionsLoading(true);
        setActionsError(null);
        setAnalyzedData(null);
        let allActions = [];
        let lastPos = -1;

        try {
            for (let i = 0; i < 10; i++) { // Increased loop to fetch more history if needed
                const response = await fetch(`http://proton.protonuk.io/v1/history/get_actions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ account_name: accountName, pos: lastPos, offset: -100 }),
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                const fetchedActions = data.actions || [];
                if (fetchedActions.length > 0) {
                    allActions = allActions.concat(fetchedActions);
                    const nextPos = fetchedActions[fetchedActions.length - 1].account_action_seq;
                    if (nextPos <= 1) break; // Stop if we are at the beginning
                    lastPos = nextPos - 1;
                } else {
                    break; // No more actions
                }
            }
            setActions(allActions);
            await analyzeActions(allActions, krwExchange);
        } catch (e) {
            setActionsError(e.message);
            setActionsLoading(false);
        }
    }, [accountName, analyzeActions, krwExchange]);

    // Calculated values based on analysis
    const totalValueUSD = xprAmount * priceUSD;
    const totalValueKRW = totalValueUSD * krwExchange;
    const totalInvestmentForPNL = analyzedData?.totalInvestedKRW || 0;
    const avgPriceKRW = analyzedData?.averagePriceKRW || 0;
    const pnl = totalValueKRW - totalInvestmentForPNL;
    const pnlRate = totalInvestmentForPNL > 0 ? (pnl / totalInvestmentForPNL) * 100 : 0;

    return (
        <div className="app-container">
            <div className="dashboard">
                <h1>🕹️ XPR CALCULATOR</h1>
                <div className='grid' style={{marginBottom:'20px'}}>
                    <div className="label">계정명</div>
                    <div className="value"><input
                        type="text"
                        value={accountName}
                        maxLength={12}
                        onChange={(e) => setAccountName(e.target.value.toLowerCase())}
                        style={{ padding: '6px', fontFamily: 'monospace', width: '150px' }}
                    /></div>
                </div>

                {loading ? (
                    <div className="loading">🔄 정보 불러오는 중...</div>
                ) : (
                    <div className="grid">
                        <div className="label">🎮 총 보유 수량</div>
                        <div className="value">{parseFloat(xprAmount).toLocaleString()} XPR</div>
                        <div className="label">💰 현재 XPR 가격</div>
                        <div className="value">${priceUSD.toFixed(6)} / { (priceUSD * krwExchange).toFixed(3)}원</div>
                        <div className="label">📦 총 평가액</div>
                        <div className="value">{Math.round(totalValueKRW).toLocaleString()}원 (${totalValueUSD.toFixed(2)} USD)</div>
                        <div className="label">💸 총 투자금 (분석)</div>
                        <div className="value">{Math.round(totalInvestmentForPNL).toLocaleString()}원</div>
                        <div className="label">📊 현재 평단 (분석)</div>
                        <div className="value">{avgPriceKRW.toFixed(3)}원</div>
                        <div className="label">📈 손익</div>
                        <div className={pnl >= 0 ? 'profit-positive' : 'profit-negative'}>
                            {Math.round(pnl).toLocaleString()}원 ({pnlRate.toFixed(2)}%)
                        </div>
                    </div>
                )}

                <div className='grid' style={{marginTop: '20px'}}>
                    <div className="label">거래내역 분석</div>
                    <div className="value">
                        <button onClick={fetchAndAnalyzeActions} disabled={actionsLoading} style={{ padding: '6px', fontFamily: 'monospace' }}>
                            {actionsLoading ? '분석 중...' : 'XPR 입금 내역 분석'}
                        </button>
                    </div>
                </div>

                {actionsError && <div style={{ color: 'red', marginTop: '10px' }}>{actionsError}</div>}
                
                {analyzedData && (
                    <div style={{marginTop: '20px'}}>
                        <h2>분석 결과</h2>
                        <div className="grid">
                            <div className="label">총 투자액 (계산)</div>
                            <div className="value">{Math.round(analyzedData.totalInvestedKRW).toLocaleString()} 원</div>
                            <div className="label">평균 매수 단가 (계산)</div>
                            <div className="value">{analyzedData.averagePriceKRW.toFixed(3)} 원</div>
                        </div>
                        <h3 style={{marginTop: '20px'}}>입금 내역 ({analyzedData.deposits.length} 건)</h3>
                        <div style={{textAlign: 'left', backgroundColor: '#f0f0f0', border: '1px solid #ccc', padding: '10px', maxHeight: '300px', overflowY: 'scroll', wordBreak: 'break-all', whiteSpace: 'pre-wrap'}}>
                            {analyzedData.deposits.map((deposit, index) => (
                                <div key={index} style={{borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '5px'}}>
                                    <p><strong>일시:</strong> {deposit.date}</p>
                                    <p><strong>수량:</strong> {deposit.quantity.toLocaleString()} XPR</p>
                                    <p><strong>당시 시세 (USD):</strong> ${deposit.priceUsdOnDate.toFixed(6)}</p>
                                    <p><strong>매수액 (KRW):</strong> {Math.round(deposit.investedKRW).toLocaleString()} 원</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
