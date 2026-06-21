/* ============================================================
   Skycast — scriptweather.js
   Weather Dashboard with OpenWeatherMap API integration.
   Uses async/await, Fetch API, DOM Manipulation, localStorage.
 
   ⚠️  SETUP: Replace YOUR_API_KEY_HERE with your free key from
       https://openweathermap.org/api  (takes ~10 mins to activate)
   ============================================================ */
 
/* ─── CONFIG ─────────────────────────────────────────────────── */
 
const API_KEY = "4c0e126064f25d8407fedf15ce5b954a";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const UNITS = "metric";
const MAX_HISTORY = 8;                          // how many searches to remember
 
/* ─── DOM REFERENCES ─────────────────────────────────────────── */
 
const cityInput       = document.getElementById('cityInput');
const searchBtn       = document.getElementById('searchBtn');
const searchSpinner   = document.getElementById('searchSpinner');
const errorBanner     = document.getElementById('errorBanner');
const errorMsg        = document.getElementById('errorMsg');
const errorClose      = document.getElementById('errorClose');
const recentSearches  = document.getElementById('recentSearches');
const mainContent     = document.getElementById('mainContent');
const idleState       = document.getElementById('idleState');
const weatherHero     = document.getElementById('weatherHero');
const forecastSection = document.getElementById('forecastSection');
const forecastStrip   = document.getElementById('forecastStrip');
const historySection  = document.getElementById('historySection');
const historyChips    = document.getElementById('historyChips');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const themeBtn        = document.getElementById('themeBtn');
const themeIcon       = document.getElementById('themeIcon');
const skyBg           = document.getElementById('skyBg');
const brandMark       = document.getElementById('brandMark');
const clockTime       = document.getElementById('clockTime');
const clockDate       = document.getElementById('clockDate');
 
// Hero weather display elements
const heroCity        = document.getElementById('heroCity');
const heroCountry     = document.getElementById('heroCountry');
const heroIcon        = document.getElementById('heroIcon');
const heroTemp        = document.getElementById('heroTemp');
const heroFeels       = document.getElementById('heroFeels');
const heroDesc        = document.getElementById('heroDesc');
const statHumidity    = document.getElementById('statHumidity');
const statWind        = document.getElementById('statWind');
const statPressure    = document.getElementById('statPressure');
const statVisibility  = document.getElementById('statVisibility');
const statSunrise     = document.getElementById('statSunrise');
const statSunset      = document.getElementById('statSunset');
 
/* ─── STATE ──────────────────────────────────────────────────── */
 
let history    = [];   // array of city name strings
let isLoading  = false;
 
/* ─── CLOCK ──────────────────────────────────────────────────── */
 
/**
 * updateClock()
 * Updates the live clock in the header every second.
 */
function updateClock() {
  const now = new Date();
 
  // Time: "14:35:07"
  clockTime.textContent = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
 
  // Date: "Sun Jun 21, 2026"
  clockDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
}
 
// Kick off the clock
updateClock();
setInterval(updateClock, 1000);
 
/* ─── THEME ──────────────────────────────────────────────────── */
 
/**
 * applyTheme(theme)
 * Switches between 'dark' and 'light' themes.
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('skycast_theme', theme);

  // Refresh weather background after theme change
  const currentCondition =
    heroDesc.textContent !== '--'
      ? heroDesc.textContent.split(' ')[0]
      : 'Clear';

  setSkyBackground(currentCondition);
}
 
/* ─── BACKGROUND THEMING ─────────────────────────────────────── */
 
/**
 * Sky gradient presets mapped to OpenWeatherMap condition groups.
 * We read the CSS variable names from :root for clean transitions.
 */
const SKY_MAP = {
  clear:        { dark: 'var(--sky-clear-night)', light: 'var(--sky-clear-day)'   },
  clouds:       { dark: 'var(--sky-clouds)',       light: 'var(--sky-clouds)'      },
  rain:         { dark: 'var(--sky-rain)',          light: 'var(--sky-rain)'        },
  drizzle:      { dark: 'var(--sky-rain)',          light: 'var(--sky-rain)'        },
  thunderstorm: { dark: 'var(--sky-thunderstorm)',  light: 'var(--sky-thunderstorm)'},
  snow:         { dark: 'var(--sky-snow)',          light: 'var(--sky-snow)'        },
  mist:         { dark: 'var(--sky-mist)',          light: 'var(--sky-mist)'        },
  smoke:        { dark: 'var(--sky-mist)',          light: 'var(--sky-mist)'        },
  haze:         { dark: 'var(--sky-mist)',          light: 'var(--sky-mist)'        },
  fog:          { dark: 'var(--sky-mist)',          light: 'var(--sky-mist)'        },
};
 
/**
 * setSkyBackground(conditionMain)
 * Animates the sky gradient to match the current weather.
 * @param {string} conditionMain - e.g. "Clear", "Rain", "Clouds"
 */
function setSkyBackground(conditionMain) {
  const key    = conditionMain.toLowerCase();
  const theme  = document.documentElement.getAttribute('data-theme') || 'dark';
  const preset = SKY_MAP[key] || { dark: 'var(--sky-default)', light: 'var(--sky-default)' };
  const grad   = preset[theme];
 
  skyBg.style.background = grad;
}
 
/* ─── LOCAL STORAGE ──────────────────────────────────────────── */
 
/**
 * loadHistory()
 * Reads the search history array from localStorage.
 */
function loadHistory() {
  const raw = localStorage.getItem('skycast_history');
  if (raw) {
    try { history = JSON.parse(raw); }
    catch { history = []; }
  }
}
 
/**
 * saveHistory()
 * Persists the history array to localStorage.
 */
function saveHistory() {
  localStorage.setItem('skycast_history', JSON.stringify(history));
}
 
/**
 * addToHistory(city)
 * Adds a city to the top of the search history (no duplicates).
 * Trims to MAX_HISTORY entries.
 * @param {string} city
 */
function addToHistory(city) {
  // Remove duplicates (case-insensitive)
  history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
  // Add to front
  history.unshift(city);
  // Keep list bounded
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  saveHistory();
  renderHistory();
  renderRecentDropdown();
}
 
/* ─── RENDER HELPERS ─────────────────────────────────────────── */
 
/**
 * renderHistory()
 * Displays clickable city chips in the history section.
 */
function renderHistory() {
  if (history.length === 0) {
    historySection.style.display = 'none';
    return;
  }
  historySection.style.display = 'block';
 
  // Array.map() to build chip HTML
  historyChips.innerHTML = history.map(city => `
    <button class="history-chip" data-city="${escapeAttr(city)}" aria-label="Search ${city} again">
      <span class="history-chip-icon">🕐</span>
      ${escapeHTML(city)}
    </button>
  `).join('');
 
  // Event delegation: listen on parent for chip clicks
  historyChips.querySelectorAll('.history-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const city = chip.dataset.city;
      cityInput.value = city;
      fetchWeather(city);
    });
  });
}
 
/**
 * renderRecentDropdown()
 * Shows the recent-search dropdown under the search bar when input is focused.
 */
function renderRecentDropdown() {
  if (history.length === 0) {
    recentSearches.innerHTML = '';
    recentSearches.classList.remove('open');
    return;
  }
 
  // Show top 5 in dropdown
  const top5 = history.slice(0, 5);
  recentSearches.innerHTML = top5.map(city => `
    <div class="recent-item" data-city="${escapeAttr(city)}" role="listitem">
      <span class="recent-icon">🕐</span>
      ${escapeHTML(city)}
    </div>
  `).join('');
 
  recentSearches.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => {
      const city = item.dataset.city;
      cityInput.value = city;
      recentSearches.classList.remove('open');
      fetchWeather(city);
    });
  });
}
 
/* ─── API CALLS ──────────────────────────────────────────────── */
 
/**
 * fetchWeather(city)
 * Fetches current weather + 5-day forecast concurrently using Promise.all.
 * Uses async/await for readable flow.
 * @param {string} city
 */
async function fetchWeather(city) {
  if (!city.trim()) return;
  if (isLoading) return;
 
  // Guard: no API key set
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    showError('Please add your OpenWeatherMap API key in scriptweather.js (line 16).');
    return;
  }
 
  setLoadingState(true);
  hideError();
  recentSearches.classList.remove('open');
 
  try {
    // ── Fetch current + forecast in parallel ──────────────────
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=${UNITS}&appid=${API_KEY}`),
      fetch(`${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=${UNITS}&appid=${API_KEY}`)
    ]);
 
    // ── Handle HTTP errors ────────────────────────────────────
    if (!currentRes.ok) {
      const err = await currentRes.json().catch(() => ({}));
      throw new WeatherError(currentRes.status, err.message || 'Unknown error');
    }
 
    // ── Parse JSON ────────────────────────────────────────────
    const currentData  = await currentRes.json();
    const forecastData = forecastRes.ok ? await forecastRes.json() : null;
 
    // ── Render ────────────────────────────────────────────────
    displayCurrentWeather(currentData);
    if (forecastData) displayForecast(forecastData);
 
    // ── Update background + history ───────────────────────────
    setSkyBackground(currentData.weather[0].main);
    addToHistory(currentData.name);
 
    // ── Show main content, hide idle ─────────────────────────
    idleState.style.display = 'none';
 
  } catch (err) {
    handleError(err);
  } finally {
    setLoadingState(false);
  }
}
 
/**
 * Custom error class to carry status codes from the API.
 */
class WeatherError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
 
/* ─── DISPLAY FUNCTIONS ──────────────────────────────────────── */
 
/**
 * displayCurrentWeather(data)
 * Populates the weather hero card with current conditions.
 * @param {Object} data - OpenWeatherMap /weather response
 */
function displayCurrentWeather(data) {
  const { name, sys, weather, main, wind, visibility } = data;
 
  // Location
  heroCity.textContent    = name;
  heroCountry.textContent = sys.country || '';
 
  // Icon (use 2x size for crisp display)
  const iconCode    = weather[0].icon;
  heroIcon.src      = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  heroIcon.alt      = weather[0].description;
 
  // Temperature
  heroTemp.textContent   = `${Math.round(main.temp)}°C`;
  heroFeels.textContent  = `Feels like ${Math.round(main.feels_like)}°C`;
  heroDesc.textContent   = weather[0].description;
 
  // Stats
  statHumidity.textContent   = `${main.humidity}%`;
  statWind.textContent       = `${Math.round(wind.speed * 3.6)} km/h`; // m/s → km/h
  statPressure.textContent   = `${main.pressure} hPa`;
  statVisibility.textContent = visibility ? `${(visibility / 1000).toFixed(1)} km` : '—';
  statSunrise.textContent    = formatUnixTime(sys.sunrise, data.timezone);
  statSunset.textContent     = formatUnixTime(sys.sunset,  data.timezone);
 
  // Show card
  weatherHero.style.display = 'block';
}
 
/**
 * displayForecast(data)
 * Builds the 5-day forecast strip.
 * The OWM /forecast endpoint returns data in 3-hour intervals.
 * We pick one reading per day (noon if possible).
 * @param {Object} data - OpenWeatherMap /forecast response
 */
function displayForecast(data) {
  // Group forecast items by day
  const dayMap = {};
 
  data.list.forEach(item => {
    // item.dt_txt → "2026-06-21 12:00:00"
    const date = item.dt_txt.split(' ')[0]; // "2026-06-21"
    const hour = parseInt(item.dt_txt.split(' ')[1]);
 
    if (!dayMap[date]) {
      dayMap[date] = item; // take first available reading
    } else if (hour === 12) {
      dayMap[date] = item; // prefer midday reading
    }
  });
 
  // Take next 5 days (skip today if we have 6+)
  const days = Object.values(dayMap).slice(0, 5);
 
  // Array.map() to generate forecast card HTML
  forecastStrip.innerHTML = days.map(item => {
    const date    = new Date(item.dt * 1000);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const icon    = item.weather[0].icon;
    const high    = Math.round(item.main.temp_max);
    const low     = Math.round(item.main.temp_min);
    const desc    = item.weather[0].description;
 
    return `
      <div class="forecast-card" role="listitem">
        <div class="forecast-day">${dayName}</div>
        <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" loading="lazy"/>
        <div class="forecast-high">${high}°</div>
        <div class="forecast-low">${low}°</div>
        <div class="forecast-desc">${desc}</div>
      </div>
    `;
  }).join('');
 
  forecastSection.style.display = 'block';
}
 
/* ─── UTILITY FUNCTIONS ──────────────────────────────────────── */
 
/**
 * formatUnixTime(unix, timezoneOffsetSec)
 * Converts a Unix timestamp to a local time string like "06:32 AM".
 * Uses the city's timezone offset from UTC.
 * @param {number} unix - seconds since epoch
 * @param {number} timezoneOffsetSec - offset in seconds (from OWM)
 * @returns {string}
 */
function formatUnixTime(unix, timezoneOffsetSec) {
  const utcMs  = unix * 1000;
  const local  = new Date(utcMs + timezoneOffsetSec * 1000);
  const h      = local.getUTCHours();
  const m      = String(local.getUTCMinutes()).padStart(2, '0');
  const ampm   = h >= 12 ? 'PM' : 'AM';
  const h12    = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
 
/** escapeHTML — prevents XSS in injected content */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
 
/** escapeAttr — safe for use inside HTML attribute values */
function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
 
/* ─── ERROR HANDLING ─────────────────────────────────────────── */
 
/**
 * handleError(err)
 * Maps error types to user-friendly messages and shows the error banner.
 * @param {Error|WeatherError} err
 */
function handleError(err) {
  let msg = 'Something went wrong. Please try again.';
 
  if (err instanceof WeatherError) {
    if (err.status === 404) msg = 'City not found. Check the spelling and try again.';
    else if (err.status === 401) msg = 'Invalid API key. Check your key in scriptweather.js.';
    else if (err.status === 429) msg = 'Too many requests. Please wait a moment and retry.';
    else msg = `API error ${err.status}: ${err.message}`;
  } else if (err.name === 'TypeError' || err.message.includes('fetch')) {
    msg = 'Network error. Check your internet connection and try again.';
  }
 
  showError(msg);
}
 
/** showError(msg) — reveals the error banner with a message */
function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.classList.add('visible');
  errorBanner.setAttribute('aria-hidden', 'false');
}
 
/** hideError() — hides the error banner */
function hideError() {
  errorBanner.classList.remove('visible');
  errorBanner.setAttribute('aria-hidden', 'true');
}
 
errorClose.addEventListener('click', hideError);
 
/* ─── LOADING STATE ──────────────────────────────────────────── */
 
/**
 * setLoadingState(loading)
 * Toggles the spinner and disables the search button while fetching.
 * @param {boolean} loading
 */
function setLoadingState(loading) {
  isLoading = loading;
  searchBtn.disabled = loading;
 
  // Toggle search button text vs. spinner
  const textEl = searchBtn.querySelector('.search-btn-text');
  textEl.style.display = loading ? 'none' : '';
  searchSpinner.classList.toggle('visible', loading);
}
 
/* ─── SEARCH EVENTS ──────────────────────────────────────────── */
 
/** Trigger search on button click */
searchBtn.addEventListener('click', () => {
  fetchWeather(cityInput.value.trim());
});
 
/** Trigger search on Enter key */
cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchWeather(cityInput.value.trim());
});
 
/** Show/hide recent dropdown when input is focused/blurred */
cityInput.addEventListener('focus', () => {
  if (history.length > 0) recentSearches.classList.add('open');
});
 
// Close dropdown when clicking anywhere outside
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) {
    recentSearches.classList.remove('open');
  }
});
 
/** Filter the dropdown as the user types */
cityInput.addEventListener('input', () => {
  hideError();
  const q = cityInput.value.toLowerCase();
  const filtered = history.filter(c => c.toLowerCase().includes(q));
 
  if (filtered.length === 0 || q === '') {
    recentSearches.classList.remove('open');
    renderRecentDropdown();
    if (q === '' && history.length > 0) recentSearches.classList.add('open');
    return;
  }
 
  recentSearches.innerHTML = filtered.slice(0, 5).map(city => `
    <div class="recent-item" data-city="${escapeAttr(city)}" role="listitem">
      <span class="recent-icon">🕐</span>
      ${escapeHTML(city)}
    </div>
  `).join('');
 
  recentSearches.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => {
      cityInput.value = item.dataset.city;
      recentSearches.classList.remove('open');
      fetchWeather(item.dataset.city);
    });
  });
 
  recentSearches.classList.add('open');
});
 
/* ─── CLEAR HISTORY ──────────────────────────────────────────── */
 
clearHistoryBtn.addEventListener('click', () => {
  history = [];
  saveHistory();
  renderHistory();
  recentSearches.innerHTML = '';
  recentSearches.classList.remove('open');
});
 
/* ─── INIT ───────────────────────────────────────────────────── */
 
/**
 * init()
 * Bootstraps the application state on page load.
 */
function init() {
  // Restore theme
  const savedTheme = localStorage.getItem('skycast_theme') || 'dark';
  applyTheme(savedTheme);
 
  // Load history
  loadHistory();
  renderHistory();
  renderRecentDropdown();
 
  // If there's a recent city, auto-load it for instant value
  // (commented out by default — uncomment to enable)
  // if (history.length > 0) fetchWeather(history[0]);
}
 
init();
 
