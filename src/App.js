import React, { useState, useEffect } from 'react';
import './App.css';
import './press-start-font.css';

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

export default function App() {
    const [accountName, setAccountName] = useState('');
    const [initialInvestment, setInitialInvestment] = useState(0);

    const [accountScope, setAccountScope] = useState(nameToUint64(accountName));
    const [xprAmount, setXprAmount] = useState(0);
    const [priceUSD, setPriceUSD] = useState(0);
    const [krwExchange, setKrwExchange] = useState(1380);
    const [loading, setLoading] = useState(false);

    // accountName or initialInvestment 변경 시 accountScope 업데이트 및 데이터 재요청
    useEffect(() => {
        setAccountScope(nameToUint64(accountName));
    }, [accountName]);

    useEffect(() => {
        if (!accountScope) return;

        setLoading(true);

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateParam = `${yyyy}${mm}${dd}`;

        const fetchPrice = fetch("https://www.api.bloks.io/proton/ticker/null")
            .then((res) => res.json())
            .then((data) => {
                if (data) {
                    const xpr = data;
                    if (xpr) setPriceUSD(xpr);
                }
            });

        const fetchExchange = fetch(`https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json?date=${dateParam}`)
            .then(res => res.json())
            .then(data => {
                const rate = data.conversions.USD.KRW;
                if (rate) setKrwExchange(rate);
            });

        const fetchBalance = fetch("https://rpc.api.mainnet.metalx.com/v1/chain/get_table_rows", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                json: true,
                code: "eosio",
                scope: accountScope,
                table: "delxpr",
                lower_bound: "",
                upper_bound: "",
                index_position: 1,
                key_type: "",
                limit: -1,
                reverse: false,
                show_payer: false
            })
        })
            .then((res) => res.json())
            .then((data) => {
                const row = data.rows.find(r => r.quantity);
                if (row) {
                    const amount = row.quantity.split(' ')[0];
                    setXprAmount(amount);
                } else {
                    setXprAmount(0);
                }
            }).catch(() => {
                setXprAmount(0);
            });

        Promise.all([fetchPrice, fetchExchange, fetchBalance])
            .finally(() => setLoading(false));
    }, [accountScope]);

    const totalValueUSD = xprAmount * priceUSD;
    const totalValueKRW = totalValueUSD * krwExchange;
    const avgPriceKRW = initialInvestment / (xprAmount || 1);
    const currentPriceKRW = priceUSD * krwExchange;
    const pnl = totalValueKRW - initialInvestment;
    const pnlRate = (pnl / initialInvestment) * 100;

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
                    <div className="label">원화 투자 총액</div>
                    <div className="value"><input
                        type="number"
                        value={initialInvestment}
                        onChange={(e) => setInitialInvestment(Number(e.target.value))}
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
                        <div className="value">${priceUSD} / {currentPriceKRW}원</div>

                        <div className="label">💱 환율</div>
                        <div className="value">1 USD = {krwExchange} KRW</div>

                        <div className="label">📦 총 평가액</div>
                        <div className="value">{Math.round(totalValueKRW).toLocaleString()}원 ({totalValueUSD} USD)</div>

                        <div className="label">💸 총 투자금</div>
                        <div className="value">{initialInvestment.toLocaleString()}원</div>

                        <div className="label">📊 현재 평단</div>
                        <div className="value">{avgPriceKRW}원</div>

                        <div className="label">📈 손익</div>
                        <div className={pnl >= 0 ? 'profit-positive' : 'profit-negative'}>
                            {Math.round(pnl).toLocaleString()}원 ({pnlRate.toFixed(2)}%)
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
