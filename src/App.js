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
    const [accountName, setAccountName] = useState('');
    const [accountScope, setAccountScope] = useState(nameToUint64(accountName));
    const [xprAmount, setXprAmount] = useState(0);
    const [priceUSD, setPriceUSD] = useState(0);
    
    const [loading, setLoading] = useState(false);
    const [initialInvestment, setInitialInvestment] = useState(0);

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
        const fetchBalance = fetch("https://rpc.api.mainnet.metalx.com/v1/chain/get_table_rows", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ json: true, code: "eosio", scope: accountScope, table: "delxpr", limit: -1 })
        }).then(res => res.json());

        Promise.all([fetchPrice, fetchBalance])
            .then(([priceData, balanceData]) => {
                if (priceData) setPriceUSD(priceData);
                const row = balanceData.rows.find(r => r.quantity);
                setXprAmount(row ? row.quantity.split(' ')[0] : 0);
            })
            .catch(err => console.error("Error fetching initial data:", err))
            .finally(() => setLoading(false));
    }, [accountName, accountScope]);

    

    // Calculated values based on analysis
    const totalValueUSD = xprAmount * priceUSD;
    const totalInvestmentForPNL = initialInvestment;
    const avgPriceUSD = initialInvestment > 0 ? initialInvestment / (xprAmount || 1) : 0;
    const pnl = totalValueUSD - totalInvestmentForPNL;
    const pnlRate = totalInvestmentForPNL > 0 ? (pnl / totalInvestmentForPNL) * 100 : 0;

    return (
        <div className="app-container">
            <div className="dashboard">
                <h1>🕹️ XPR CALCULATOR</h1>
                <div className='grid' style={{marginBottom:'20px'}}>
                    <div className="label">Account Name</div>
                    <div className="value"><input
                        type="text"
                        value={accountName}
                        maxLength={12}
                        onChange={(e) => setAccountName(e.target.value.toLowerCase())}
                        style={{ padding: '6px', fontFamily: 'monospace', width: '150px' }}
                    /></div>
                </div>

                {loading ? (
                    <div className="loading">🔄 Loading data...</div>
                ) : (
                    <div className="grid">
                        <div className="label">🎮 Total Holdings</div>
                        <div className="value">{parseFloat(xprAmount).toLocaleString()} XPR</div>
                        <div className="label">💰 Current XPR Price</div>
                        <div className="value">${priceUSD.toFixed(6)}</div>
                        <div className="label">📦 Total Valuation</div>
                        <div className="value">${totalValueUSD.toFixed(2)} USD</div>
                        <div className="label">💸 Total Investment</div>
                        <div className="value">${totalInvestmentForPNL.toFixed(2)} USD</div>
                        <div className="label">📊 Average Cost</div>
                        <div className="value">${avgPriceUSD.toFixed(6)}</div>
                        <div className="label">📈 P&L</div>
                        <div className={pnl >= 0 ? 'profit-positive' : 'profit-negative'}>
                            ${pnl.toFixed(2)} USD ({pnlRate.toFixed(2)}%)
                        </div>
                    </div>
                )}

                <div className="label">Total Investment (USD)</div>
                    <div className="value"><input
                        type="number"
                        value={initialInvestment}
                        onChange={(e) => setInitialInvestment(Number(e.target.value))}
                        placeholder="Enter total USD invested"
                        style={{ padding: '6px', fontFamily: 'monospace', width: '150px' }}
                    /></div>
            </div>
        </div>
    );
}
