const map = L.map("map").setView([22.9734, 78.6569], 5);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "© OpenStreetMap © CARTO",
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

const statusText = document.getElementById("status");

let allLayers = [];

// ---------------- STATE COORDINATES ----------------
const stateCoords = {
  Maharashtra: [19.7515, 75.7139],
  Delhi: [28.7041, 77.1025],
  Karnataka: [15.3173, 75.7139],
  "Tamil Nadu": [11.1271, 78.6569],
  "Uttar Pradesh": [26.8467, 80.9462],
  "West Bengal": [22.9868, 87.855],
  Gujarat: [22.2587, 71.1924],
  Rajasthan: [27.0238, 74.2179],
  Kerala: [10.8505, 76.2711],
  Punjab: [31.1471, 75.3412],

  "Andhra Pradesh": [15.9129, 79.74],
  Telangana: [18.1124, 79.0193],
  "Jammu and Kashmir": [33.7782, 76.5762],
  Ladakh: [34.1526, 77.5771],
  Assam: [26.2006, 92.9376],
  Bihar: [25.0961, 85.3131],
  "Madhya Pradesh": [22.9734, 78.6569],
  Odisha: [20.9517, 85.0985],
  Jharkhand: [23.6102, 85.2799],
  Haryana: [29.0588, 76.0856],
  Uttarakhand: [30.0668, 79.0193],
  Goa: [15.2993, 74.124],
  "Himachal Pradesh": [31.1048, 77.1734],

  Manipur: [24.6637, 93.9063],
  Meghalaya: [25.467, 91.3662],
  Mizoram: [23.1645, 92.9376],
  Nagaland: [26.1584, 94.5624],
  Tripura: [23.9408, 91.9882],
  Sikkim: [27.533, 88.5122],
};

// ---------------- RISK ----------------
function getRiskLevel(active) {
  if (active > 1000) return "high";
  if (active > 300) return "medium";
  if (active > 50) return "low";
  return "safe";
}

function getColor(active) {
  if (active > 1000) return "rgba(255, 60, 60, 0.6)";
  if (active > 300) return "rgba(255, 165, 60, 0.55)";
  if (active > 50) return "rgba(255, 220, 80, 0.5)";
  return "rgba(60, 200, 120, 0.45)";
}

// keep your working radius logic
function getRadius(active) {
  return Math.max(8000, active * 50);
}

// ---------------- FETCH DATA ----------------
async function fetchCovidData() {
  try {
    const res = await fetch("https://api.rootnet.in/covid19-in/stats/latest");
    const data = await res.json();

    const states = data.data.regional;

    const totalActive = states.reduce((sum, s) => {
      const active = Math.max(
        (s.totalConfirmed || 0) - (s.discharged || 0) - (s.deaths || 0),
        0
      );
      return sum + active;
    }, 0);

    statusText.innerText = `🟢 Live • Active Cases: ${totalActive.toLocaleString()}`;

    states.forEach((state) => {
      const confirmed = state.totalConfirmed || 0;
      const recovered = state.discharged || 0;
      const deaths = state.deaths || 0;

      const active = Math.max(confirmed - recovered - deaths, 0);

      const coords = stateCoords[state.loc];
      if (!coords) return;

      const color = getColor(active);

      const layer = L.circle(coords, {
        radius: getRadius(active),
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.35,
        opacity: 0.8,
      }).addTo(map);

      layer.bindPopup(`
        <b>${state.loc}</b><br>
        Active: ${active}<br>
        Confirmed: ${confirmed}<br>
        Deaths: ${deaths}
      `);

      layer.risk = getRiskLevel(active);
      layer.stateData = { state: state.loc, active, confirmed, deaths };

      allLayers.push(layer);
    });
  } catch (err) {
    console.error(err);
    statusText.innerText = "Error loading data ❌";
  }
}

// ---------------- LOCATION ----------------
function trackUser() {
  if (!navigator.geolocation) return alert("Geolocation not supported");

  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;

    L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup("📍 You are here")
      .openPopup();

    map.setView([latitude, longitude], 6);
  });
}

// ---------------- FILTER ----------------
function filterRisk(level) {
  allLayers.forEach((layer) => {
    if (level === "all") {
      map.addLayer(layer);
    } else {
      layer.risk === level ? map.addLayer(layer) : map.removeLayer(layer);
    }
  });
}

// ---------------- SEARCH ----------------
function searchCity() {
  const input = document.getElementById("searchBox").value.trim().toLowerCase();
  const resultBox = document.getElementById("searchResult");

  if (!input) {
    resultBox.style.display = "none";
    return;
  }

  const found = allLayers.find((layer) =>
    layer.stateData.state.toLowerCase().includes(input)
  );

  resultBox.style.display = "block";

  if (!found) {
    resultBox.innerHTML = "❌ No data found";
    return;
  }

  map.setView(found.getLatLng(), 6);
  found.openPopup();

  resultBox.innerHTML = `
    <b>${found.stateData.state}</b><br>
    🔴 Active: ${found.stateData.active}<br>
    📊 Confirmed: ${found.stateData.confirmed}<br>
    ⚰️ Deaths: ${found.stateData.deaths}
  `;
}

// ---------------- AUTOCOMPLETE ----------------
const searchInput = document.getElementById("searchBox");
const suggestionsBox = document.getElementById("suggestions");

const stateNames = Object.keys(stateCoords);

searchInput.addEventListener("input", () => {
  const value = searchInput.value.trim().toLowerCase();

  if (!value) {
    suggestionsBox.style.display = "none";
    return;
  }

  const matches = stateNames.filter((name) =>
    name.toLowerCase().includes(value)
  );

  if (matches.length === 0) {
    suggestionsBox.style.display = "none";
    return;
  }

  suggestionsBox.style.display = "block";

  suggestionsBox.innerHTML = matches
    .slice(0, 6)
    .map(
      (name) => `
      <div class="suggestion-item" onclick="selectCity('${name}')">
        ${name}
      </div>
    `
    )
    .join("");
});

function selectCity(name) {
  searchInput.value = name;
  suggestionsBox.style.display = "none";
  searchCity();
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#suggestions") && e.target !== searchInput) {
    suggestionsBox.style.display = "none";
  }
});

// ---------------- INIT ----------------
fetchCovidData();
trackUser();

// ENTER KEY SUPPORT
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchCity();
  }
});