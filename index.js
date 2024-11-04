
import axios from 'axios'
import config from './config.js'
import Trader from './traders.js'
async function fetchLatestTokens() {
    const url = "https://api.dexscreener.com/token-profiles/latest/v1";
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("An error occurred:", error);
        return null;
    }
}

async function getTokenInformation(tokenAddress){
    if(!tokenAddress){return new Error(`Token address is missing`)}
    const response = await axios.get('https://api.dexscreener.com/latest/dex/search?q='+tokenAddress)
    return response.data.pairs.filter(el=>(el.dexId) === "raydium")
}

function parseDuration(durationStr) {
    const regex = /(\d+d)?(\d+h)?(\d+m)?(\d+s)?/;
    const matches = regex.exec(durationStr);

    const days = matches[1] ? parseInt(matches[1].slice(0, -1)) : 0;
    const hours = matches[2] ? parseInt(matches[2].slice(0, -1)) : 0;
    const minutes = matches[3] ? parseInt(matches[3].slice(0, -1)) : 0;
    const seconds = matches[4] ? parseInt(matches[4].slice(0, -1)) : 0;

    return ((days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60) + seconds) * 1000;
}
function isOlderThanLimit(pairCreatedAt, ageLimitStr) {
    const ageLimitMs = parseDuration(ageLimitStr);  // Convert age limit to milliseconds
    const now = Date.now();                         // Get current time in milliseconds
    const threshold = now - ageLimitMs;             // Calculate threshold timestamp

    return pairCreatedAt < threshold;               // Check if timestamp is older
}
async function filterToken(token){
    try{
        const tokenInfo = await getTokenInformation(token.tokenAddress)
        // console.log('tokeninfo',tokenInfo[0])
        return !(tokenInfo[0]['liquidity']['usd'] < config.MIN_LIQUIDITY ||
           tokenInfo[0]['marketCap'] < config.MIN_MARKET_CAP ||
           !isOlderThanLimit(tokenInfo[0]['pairCreatedAt'], config.TRADE_AGE_LIMIT));
   }catch (error){
        console.log(token)
        return false
    }
}


async function getTokenInformationByAddress(address){
    const url = "https://api-v3.raydium.io/mint/ids?mints=" + address;
    const response = await axios.get(url);
    return await response.data;
}
async function main(){
    const trader = new Trader(config.WALLET)
    const tokens = await fetchLatestTokens();
    for (const token of tokens){
        const filterResult = await filterToken(token)
        if(!filterResult) continue;
        const shouldBuy = await getTokenInformationByAddress(token.tokenAddress)
        console.log(shouldBuy)
        try{
            await trader.executeSwap(token.tokenAddress,30000);

        }catch(error){
            console.log(error)
        }
    }
}

main().catch(error => {console.log(error)})