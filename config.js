import dotenv from 'dotenv'
dotenv.config()
const  settings =  {
    TRADE_AMOUNT : 1,
    MIN_LIQUIDITY : 1,
    MIN_MARKET_CAP : 1,
    TRADE_AGE_LIMIT : '10s',
    WALLET : process.env.SOL_KEY
}





export default settings;