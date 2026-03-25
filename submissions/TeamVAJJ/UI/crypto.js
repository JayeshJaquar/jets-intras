let currentCurrency = "USD";
let allCoins = [];
let models = {};

function handleNavClick(id, target){
    document.getElementById(id).onclick = () => {
        document.getElementById(target).scrollIntoView({behavior:"smooth"});
    };
}
document.getElementById("terms").addEventListener("click", () => {
    
  
    setTimeout(() => {
        window.location.href = "terms.html";
    }, 150);
});
document.getElementById("privacy").addEventListener("click", () => {
    
  
    setTimeout(() => {
        window.location.href = "privacy.html";
    }, 150);
});
document.getElementById("cookies").addEventListener("click", () => {
    
  
    setTimeout(() => {
        window.location.href = "cookie.html";
    }, 150);
});
document.getElementById("data").addEventListener("click", () => {
    
  
    setTimeout(() => {
        window.location.href = "data_sources.html";
    }, 150);
});
document.getElementById('div7').addEventListener('click', function(e) {
   
    e.preventDefault();
        alert("Please search for a coin first!");
    
});
handleNavClick("div2","hometitle");
handleNavClick("div3","table");
handleNavClick("div5","hometitle");
handleNavClick("div6","footer");


async function loadModel(){
    try{
        const res = await fetch("model_data.json");
        models = await res.json();
        console.log("Models Loaded:", models);
    }catch(err){
        console.error("Error loading model:", err);
    }
}


function createFeatures(coin){
    const change = (coin.price_change_percentage_24h || 0) / 100;

    return [
        change,                                // return_1
        change * 2,                            // return_3
        change * 0.5,                          // ma_distance_7
        Math.abs(change),                      // volatility_7
        (coin.total_volume || 0) / 1e9,        // volume_change
        change > 0 ? 1 : -1                    // momentum
    ];
}


function predictCoin(coin){
    try{
        const modelKey = Object.keys(models).find(
            key => key.toLowerCase() === coin.name.toLowerCase().replace(/\s/g,'')
        );

        if(!modelKey) return null;

        const model = models[modelKey];
        const features = createFeatures(coin);

        if(!model.scaler_center || !model.scaler_scale) return null;

        const scaled = features.map((x,i)=> 
            (x - model.scaler_center[i]) / model.scaler_scale[i]
        );

        let z = model.bias || 0;

        for(let i=0;i<scaled.length;i++){
            z += scaled[i] * model.weights[i];
        }

        const prob = 1 / (1 + Math.exp(-z));

        return {
            text: prob > 0.5
                ? `🟢 UP (${(prob*100).toFixed(1)}%)`
                : `🔴 DOWN (${(prob*100).toFixed(1)}%)`,
            prob: prob
        };

    }catch(err){
        console.log("Prediction error:", err);
        return null;
    }
}




async function fetchMarketData(currency="USD"){
    const table=document.getElementById("market-body");
    const apiCurrency=currency.toLowerCase();
    const symbol = apiCurrency==="inr"?"₹":"$";

    table.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

    try{
        const res=await fetch(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${apiCurrency}&order=market_cap_desc&per_page=50&page=1`
        );

        const data=await res.json();
        allCoins=data;

        
        const filteredData = data.filter(coin => {
            const modelKey = Object.keys(models).find(
                key => key.toLowerCase() === coin.name.toLowerCase().replace(/\s/g,'')
            );
            return modelKey;
        });

        if(filteredData.length === 0){
            table.innerHTML = `<tr><td colspan="6">No AI-supported coins found</td></tr>`;
            return;
        }

        table.innerHTML="";

        filteredData.forEach((coin,i)=>{
            const change = coin.price_change_percentage_24h
                ? coin.price_change_percentage_24h.toFixed(2)
                : "0.00";

            const cls = change >= 0 ? "up" : "down";

            const prediction = predictCoin(coin);

            table.innerHTML += `
            <tr>
                <td>${i+1}</td>

                <td class="coin-cell">
                    <img src="${coin.image}">
                    ${coin.name}
                </td>

                <td>${symbol}${coin.current_price.toLocaleString()}</td>

                <td class="${cls}">${change}%</td>

                <td>${symbol}${coin.market_cap.toLocaleString()}</td>

                <td>${prediction ? prediction.text : "N/A"}</td>
            </tr>`;
        });

    }catch(err){
        table.innerHTML = `<tr><td colspan="6" style="color:red;">Error loading data</td></tr>`;
    }
}


const input=document.getElementById("input");
const suggestions=document.getElementById("suggestions");

input.oninput=()=>{
    const val=input.value.toLowerCase();
    suggestions.innerHTML="";

    if(!val){
        suggestions.style.display="none";
        return;
    }

    const filtered=allCoins.filter(c=>c.name.toLowerCase().includes(val));

    suggestions.style.display="block";

    filtered.forEach(c=>{
        const div=document.createElement("div");
        div.className="suggestion-item";
        div.innerHTML=c.name;

        div.onclick=()=>{
            input.value=c.name;
            suggestions.style.display="none";
        };

        suggestions.appendChild(div);
    });
};

document.getElementById("buttonid").onclick = () => {
    const query = input.value.trim().toLowerCase();
    
   
    const foundCoin = allCoins.find(c => 
        c.name.toLowerCase() === query || 
        c.id.toLowerCase() === query
    );

    if (foundCoin) {
      
        window.location.href = `coin-details.html?coin=${foundCoin.id}`;
    } else {
        alert("Coin not found. Please select a valid coin from the suggestions.");
    }
};


window.onload=async ()=>{
    await loadModel();
    await fetchMarketData();
};


   
