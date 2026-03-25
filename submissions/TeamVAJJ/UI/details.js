

async function loadCoinDetails() {
    const params = new URLSearchParams(window.location.search);
    const coinId = params.get('coin');

    if (!coinId) {
        window.location.href = 'index.html';
        return;
    }

    try {
       
        const modelRes = await fetch("model_data.json");
        const models = await modelRes.json();

        
        const coinRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}`);
        const coinData = await coinRes.json();
        
        if (!coinData || coinData.length === 0) {
            document.getElementById("coin-title").innerText = "Coin Not Found or Rate Limited";
            return;
        }

        const coin = coinData[0];

       
        document.getElementById("coin-title").innerText = `${coin.name} AI Analysis`;
        document.getElementById("curr-price").innerText = `$${coin.current_price.toLocaleString()}`;
        document.getElementById("m-cap").innerText = `$${coin.market_cap.toLocaleString()}`;
        document.getElementById("high-24").innerText = `$${coin.high_24h.toLocaleString()}`;
        document.getElementById("low-24").innerText = `$${coin.low_24h.toLocaleString()}`;
        document.getElementById("volatility").innerText = `${Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%`;

        const changeValue = coin.price_change_percentage_24h || 0;
        const momentumText = document.getElementById("det-momentum");
        momentumText.innerText = changeValue > 0 ? "Positive" : "Negative";
        momentumText.style.color = changeValue > 0 ? "#00ffcc" : "#ff4d4d";

  
        const modelKey = Object.keys(models).find(k => k.toLowerCase() === coin.name.toLowerCase().replace(/\s/g,''));
        const model = models[modelKey];

        if (model) {
            const acc = (model.metrics.accuracy * 100).toFixed(2);
            document.getElementById("model-accuracy").innerText = `${acc}%`;

            const predictionResult = calculatePrediction(coin, model);
            document.getElementById("prediction-display").innerHTML = predictionResult.html;

            const avgMove = Math.abs(coin.price_change_percentage_24h || 2.0) / 100;
            let targetPrice = predictionResult.prob > 0.5 ? coin.current_price * (1 + avgMove) : coin.current_price * (1 - avgMove);
            document.getElementById("det-predicted-price").innerText = `$${targetPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        }

      
        loadHistoricalChart(coinId);

    } catch (e) {
        console.error("Error loading details:", e);
    }
}

async function loadHistoricalChart(coinId) {
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`);
        const data = await res.json();
        
        const labels = data.prices.map(p => new Date(p[0]).toLocaleDateString());
        const prices = data.prices.map(p => p[1]);

        const ctx = document.getElementById('priceChart').getContext('2d');
        if (window.myChart) window.myChart.destroy();

        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Price (USD)',
                    data: prices,
                    borderColor: '#00ffcc',
                    backgroundColor: 'rgba(0, 255, 204, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    pointRadius: 0,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { display: true,
                        title: {
                display: true,
                text: 'Date', 
                color:'white',
                font: {
                    size: 18,
                    weight: 'bold'
                }
            },
                    },
                    y: { display: true,
                        title: {
                display: true,
                text: 'Price(USD)', 
                color: 'white',
                font: {
                    size: 18,
                    weight: 'bold'
                        }},grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    } catch (err) {
        console.error("Chart Fetch Error:", err);
    }
}

function calculatePrediction(coin, model) {
    const change = (coin.price_change_percentage_24h || 0) / 100;
    const features = [change, change*2, change*0.5, Math.abs(change), (coin.total_volume||0)/1e9, change > 0 ? 1 : -1];
    
    const scaled = features.map((x, i) => (x - model.scaler_center[i]) / model.scaler_scale[i]);
    let z = model.bias || 0;
    scaled.forEach((val, i) => z += val * model.weights[i]);
    
    const prob = 1 / (1 + Math.exp(-z));
    const html = prob > 0.5 
        ? `<span style="color:#00ffcc">🟢 AI Prediction: UP (${(prob*100).toFixed(1)}%)</span>`
        : `<span style="color:#ff4d4d">🔴 AI Prediction: DOWN (${(prob*100).toFixed(1)}%)</span>`;
        
    return { html, prob };
}


window.onload = loadCoinDetails;