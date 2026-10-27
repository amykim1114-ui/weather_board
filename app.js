// app.js – 화면 동작 (목록 그리기, 일정 추가)

let baseTasks = [];
let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

function showTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  document.getElementById('todayDate').textContent = `${year}-${month}-${day}`;
}

function loadAddedTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

async function loadTasks() {
  const dataMessage = document.getElementById('dataMessage');
  try {
    const response = await fetch('data/tasks.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`일정 파일 오류: ${response.status}`);
    const loaded = await response.json();
    if (!Array.isArray(loaded)) throw new Error('일정 파일 형식이 올바르지 않습니다.');
    baseTasks = loaded;
    dataMessage.textContent = '';
    dataMessage.hidden = true;
  } catch (error) {
    baseTasks = [];
    dataMessage.textContent = '배포 주소로 열어주세요';
    dataMessage.hidden = false;
  }
  tasks = baseTasks.concat(loadAddedTasks());
  renderTasks();
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

async function loadWeather() {
  const weatherBox = document.getElementById('weatherBox');
  const regions = Object.keys(REGION_COORDS);
  const testMode = new URLSearchParams(window.location.search).get('test');
  weatherBox.textContent = '오늘 날씨를 불러오는 중...';

  const results = await Promise.allSettled(regions.map(async (region) => {
    const response = await fetch(buildWeatherUrl(region));
    if (!response.ok) throw new Error(`날씨 API 오류: ${response.status}`);
    const data = await response.json();
    const weather = applyTestMode(parseWeatherResponse(data), testMode);
    return { region, weather };
  }));

  let successCount = 0;
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    weatherByRegion[result.value.region] = result.value.weather;
    successCount += 1;
  }
  renderTasks();

  if (successCount === regions.length) {
    weatherBox.textContent = testMode === 'wind'
      ? '오늘 날씨를 불러왔습니다. (풍속 시험 모드: 12m/s)'
      : '오늘 날씨를 불러왔습니다.';
  } else if (successCount > 0) {
    weatherBox.textContent = `일부 지역의 날씨만 불러왔습니다. (${successCount}/${regions.length})`;
  } else {
    weatherBox.textContent = '날씨를 불러오지 못했습니다. 일정 목록은 계속 확인할 수 있습니다.';
  }
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const saved = loadAddedTasks();
  saved.push(t);
  localStorage.setItem('wx_added', JSON.stringify(saved));
  e.target.reset();
  tasks = baseTasks.concat(saved);
  renderTasks();
}

document.getElementById('taskForm').addEventListener('submit', addTask);
showTodayDate();
loadTasks();
loadWeather();
