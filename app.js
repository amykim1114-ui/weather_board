// app.js – 화면 동작 (목록 그리기, 일정 추가)

let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음
let database = null;

function showTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  document.getElementById('todayDate').textContent = `${year}-${month}-${day}`;
}

function getDatabase() {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error('Supabase 연결 정보가 없습니다.');
  }
  if (typeof supabase === 'undefined') {
    throw new Error('Supabase 스크립트를 불러오지 못했습니다.');
  }
  if (!database) database = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  return database;
}

async function loadTasks() {
  const dataMessage = document.getElementById('dataMessage');
  try {
    const { data, error } = await getDatabase()
      .from('wx_tasks')
      .select('id, title, region, kind, owner')
      .order('id', { ascending: true });
    if (error) throw error;
    tasks = data || [];
    dataMessage.textContent = '';
    dataMessage.hidden = true;
  } catch (error) {
    tasks = [];
    dataMessage.textContent = '일정 목록을 불러오지 못했습니다. config.js와 Supabase 설정을 확인해 주세요.';
    dataMessage.hidden = false;
  }
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

async function addTask(e) {
  e.preventDefault();
  const msgBox = document.getElementById('msgBox');
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  msgBox.textContent = '';

  try {
    const { data, error } = await getDatabase()
      .from('wx_tasks')
      .insert(t)
      .select('id, title, region, kind, owner')
      .single();
    if (error) throw error;
    tasks.push(data);
    e.target.reset();
    renderTasks();
  } catch (error) {
    msgBox.textContent = '일정을 저장하지 못했습니다. Supabase 설정을 확인해 주세요.';
  }
}

document.getElementById('taskForm').addEventListener('submit', addTask);
showTodayDate();
loadTasks();
loadWeather();
