// logic.js – 판단 규칙만 (화면을 다루는 코드 금지)

// 교육용 가상 기준 (실제 작업 중지 · 행사 취소 기준은 각 기관 규정을 따름)
const RULES = { wind: 10, rain: 60, heat: 33 };

const REGION_COORDS = {
  '세종': { latitude: 36.48, longitude: 127.29 },
  '대전': { latitude: 36.35, longitude: 127.38 },
  '태안': { latitude: 36.75, longitude: 126.30 },
  '보령': { latitude: 36.33, longitude: 126.61 },
};

function buildWeatherUrl(region) {
  const coords = REGION_COORDS[region];
  if (!coords) throw new Error('지원하지 않는 지역입니다.');

  const params = new URLSearchParams({
    latitude: coords.latitude,
    longitude: coords.longitude,
    daily: 'temperature_2m_max,wind_speed_10m_max,precipitation_probability_max',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Seoul',
    forecast_days: '1',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function firstDailyNumber(data, field) {
  const values = data && data.daily && data.daily[field];
  const value = Array.isArray(values) ? values[0] : undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`날씨 응답에 ${field} 값이 없습니다.`);
  }
  return value;
}

function parseWeatherResponse(data) {
  return {
    tempMax: firstDailyNumber(data, 'temperature_2m_max'),
    windMax: firstDailyNumber(data, 'wind_speed_10m_max'),
    rainProb: firstDailyNumber(data, 'precipitation_probability_max'),
  };
}

function applyTestMode(weather, testMode) {
  return testMode === 'wind' ? { ...weather, windMax: 12 } : weather;
}

// 일정 구분과 날씨로 판단 (w가 없으면 '날씨 확인 전')
function judge(kind, w) {
  if (kind === '실내') return { level: 'ok', text: '영향 없음' };
  if (!w) return { level: 'none', text: '날씨 확인 전' };
  if (kind === '고소' && w.windMax >= RULES.wind) return { level: 'stop', text: '중지 검토 (강풍)' };
  if (w.tempMax >= RULES.heat) return { level: 'warn', text: '폭염 휴식' };
  if (w.rainProb >= RULES.rain) return { level: 'warn', text: '우천 주의' };
  return { level: 'ok', text: '진행' };
}

if (typeof module !== 'undefined') {
  module.exports = {
    RULES,
    REGION_COORDS,
    buildWeatherUrl,
    parseWeatherResponse,
    applyTestMode,
    judge,
  };
}
