const express = require('express');
const axios = require('axios');
const { RSI, MACD } = require('technicalindicators');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Binance mum verilerini alıp teknik analiz üreten fonksiyon
async function analyzeCoin(symbol = 'BTCUSDT') {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=100`;
  const response = await axios.get(url);
  
  // Kapanış fiyatları
  const closePrices = response.data.map(candle => parseFloat(candle[4]));
  const currentPrice = closePrices[closePrices.length - 1];

  // 1. RSI Hesaplama (14 Periyot)
  const rsiValues = RSI.calculate({ values: closePrices, period: 14 });
  const currentRSI = rsiValues[rsiValues.length - 1];

  // 2. MACD Hesaplama
  const macdValues = MACD.calculate({
    values: closePrices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const currentMACD = macdValues[macdValues.length - 1];

  // 3. Destek & Direnç (Son 20 mum)
  const recentPrices = closePrices.slice(-20);
  const support = Math.min(...recentPrices);
  const resistance = Math.max(...recentPrices);

  // 4. Sinyal Skorlama
  let score = 50;
  let signals = [];

  if (currentRSI < 30) {
    score += 25;
    signals.push("RSI Aşırı Satım Bölgesinde (Aşırı Düşmüş)");
  } else if (currentRSI > 70) {
    score -= 25;
    signals.push("RSI Aşırı Alım Bölgesinde (Aşırı Yükselmiş)");
  }

  if (currentMACD.histogram > 0) {
    score += 15;
    signals.push("MACD Pozitif Momentum Gösteriyor");
  } else {
    score -= 15;
    signals.push("MACD Negatif Momentum Gösteriyor");
  }

  let decision = "NÖTR / TUT";
  if (score >= 70) decision = "GÜÇLÜ AL";
  else if (score > 55) decision = "AL";
  else if (score <= 30) decision = "GÜÇLÜ SAT";
  else if (score < 45) decision = "SAT";

  return {
    symbol,
    currentPrice,
    rsi: currentRSI.toFixed(2),
    support: support.toFixed(2),
    resistance: resistance.toFixed(2),
    score,
    decision,
    signals
  };
}

// API Endpoint
app.get('/api/analysis/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const result = await analyzeCoin(symbol);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Analiz oluşturulurken hata oluştu." });
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});