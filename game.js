const LOCATIONS = [
  { name: "Amsterdam, Netherlands", lat: 52.3676, lng: 4.9041 },
  { name: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241 },
  { name: "Kyoto, Japan", lat: 35.0116, lng: 135.7681 },
  { name: "Reykjavik, Iceland", lat: 64.1466, lng: -21.9426 },
  { name: "Buenos Aires, Argentina", lat: -34.6037, lng: -58.3816 },
  { name: "Vancouver, Canada", lat: 49.2827, lng: -123.1207 },
  { name: "Marrakesh, Morocco", lat: 31.6295, lng: -7.9811 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393 },
  { name: "Auckland, New Zealand", lat: -36.8509, lng: 174.7645 },
  { name: "Helsinki, Finland", lat: 60.1699, lng: 24.9384 },
  { name: "Nairobi, Kenya", lat: -1.2921, lng: 36.8219 },
  { name: "San Francisco, USA", lat: 37.7749, lng: -122.4194 },
  { name: "Seoul, South Korea", lat: 37.5665, lng: 126.978 },
  { name: "Venice, Italy", lat: 45.4408, lng: 12.3155 },
  { name: "La Paz, Bolivia", lat: -16.4897, lng: -68.1193 },
  { name: "Copenhagen, Denmark", lat: 55.6761, lng: 12.5683 },
  { name: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Istanbul, Türkiye", lat: 41.0082, lng: 28.9784 },
  { name: "Mexico City, Mexico", lat: 19.4326, lng: -99.1332 },
  { name: "Edinburgh, Scotland", lat: 55.9533, lng: -3.1883 },
  { name: "Bangkok, Thailand", lat: 13.7563, lng: 100.5018 },
  { name: "Honolulu, USA", lat: 21.3069, lng: -157.8583 },
  { name: "Dubai, UAE", lat: 25.2048, lng: 55.2708 },
  { name: "Rio de Janeiro, Brazil", lat: -22.9068, lng: -43.1729 },
  { name: "Stockholm, Sweden", lat: 59.3293, lng: 18.0686 },
  { name: "Prague, Czechia", lat: 50.0755, lng: 14.4378 },
  { name: "Lima, Peru", lat: -12.0464, lng: -77.0428 },
  { name: "Taipei, Taiwan", lat: 25.033, lng: 121.5654 },
  { name: "Oslo, Norway", lat: 59.9139, lng: 10.7522 }
];

const DIFFICULTIES = {
  easy: { km: 100, label: "~100 km excerpt" },
  medium: { km: 10, label: "~10 km excerpt" },
  hard: { km: 1, label: "~1 km excerpt" }
};

const state = {
  difficulty: "medium",
  round: 1,
  maxRounds: 5,
  totalScore: 0,
  current: null,
  guess: null,
  guessMarker: null,
  answerMarker: null,
  line: null,
  usedLocations: new Set(),
  submitted: false
};

const elements = {
  difficultyButtons: document.querySelectorAll("[data-difficulty]"),
  extentLabel: document.getElementById("extentLabel"),
  mapScale: document.getElementById("mapScale"),
  clearGuess: document.getElementById("clearGuess"),
  guessPrompt: document.getElementById("guessPrompt"),
  submitGuess: document.getElementById("submitGuess"),
  submitText: document.getElementById("submitText"),
  totalScore: document.getElementById("totalScore"),
  roundScore: document.getElementById("roundScore"),
  roundNumber: document.getElementById("roundNumber"),
  roundDots: document.querySelectorAll(".round-dots span"),
  resultModal: document.getElementById("resultModal"),
  resultPoints: document.getElementById("resultPoints"),
  resultDistance: document.getElementById("resultDistance"),
  resultLocation: document.getElementById("resultLocation"),
  resultTitle: document.getElementById("resultTitle"),
  resultEyebrow: document.getElementById("resultEyebrow"),
  nextRound: document.getElementById("nextRound"),
  modalClose: document.getElementById("modalClose")
};

const clueMap = L.map("clueMap", {
  zoomControl: false,
  attributionControl: true,
  minZoom: 2,
  maxZoom: 18,
  dragging: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  boxZoom: false,
  keyboard: false,
  touchZoom: false
});

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  subdomains: "abcd",
  maxZoom: 20
}).addTo(clueMap);

const guessMap = L.map("guessMap", {
  zoomControl: false,
  minZoom: 2,
  maxZoom: 18,
  worldCopyJump: true
}).setView([18, 8], 2);

L.control.zoom({ position: "bottomright" }).addTo(guessMap);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19
}).addTo(guessMap);

const guessIcon = L.divIcon({
  className: "",
  html: '<div class="guess-pin"></div>',
  iconSize: [25, 25],
  iconAnchor: [8, 22]
});

const answerIcon = L.divIcon({
  className: "",
  html: '<div class="answer-pin"></div>',
  iconSize: [25, 25],
  iconAnchor: [8, 22]
});

function chooseLocation() {
  let available = LOCATIONS.filter((_, index) => !state.usedLocations.has(index));
  if (!available.length) {
    state.usedLocations.clear();
    available = [...LOCATIONS];
  }
  const location = available[Math.floor(Math.random() * available.length)];
  state.usedLocations.add(LOCATIONS.indexOf(location));
  return location;
}

function startRound() {
  state.current = chooseLocation();
  state.guess = null;
  state.submitted = false;
  clearMapResults();

  setClueExtent();
  guessMap.setView([18, 8], 2, { animate: false });

  elements.guessPrompt.classList.remove("hidden");
  elements.clearGuess.disabled = true;
  elements.submitGuess.disabled = true;
  elements.submitText.textContent = "Place a pin to guess";
  elements.roundScore.textContent = "—";
  elements.roundNumber.textContent = state.round;
  elements.resultModal.hidden = true;
  updateProgress();

  requestAnimationFrame(() => {
    clueMap.invalidateSize();
    guessMap.invalidateSize();
  });
}

function setClueExtent() {
  const distance = DIFFICULTIES[state.difficulty].km;
  const halfLatitude = (distance / 111) / 2;
  const longitudeScale = Math.max(0.2, Math.cos(state.current.lat * Math.PI / 180));
  const halfLongitude = (distance / (111 * longitudeScale)) / 2;
  clueMap.fitBounds([
    [state.current.lat - halfLatitude, state.current.lng - halfLongitude],
    [state.current.lat + halfLatitude, state.current.lng + halfLongitude]
  ], { animate: false, padding: [0, 0] });
}

function clearMapResults() {
  [state.guessMarker, state.answerMarker, state.line].forEach(layer => {
    if (layer && guessMap.hasLayer(layer)) guessMap.removeLayer(layer);
  });
  state.guessMarker = null;
  state.answerMarker = null;
  state.line = null;
}

function placeGuess(latlng) {
  if (state.submitted) return;
  state.guess = latlng;
  if (state.guessMarker) {
    state.guessMarker.setLatLng(latlng);
  } else {
    state.guessMarker = L.marker(latlng, { icon: guessIcon }).addTo(guessMap);
  }
  elements.guessPrompt.classList.add("hidden");
  elements.clearGuess.disabled = false;
  elements.submitGuess.disabled = false;
  elements.submitText.textContent = "Lock in guess";
}

function clearGuess() {
  if (state.submitted || !state.guessMarker) return;
  guessMap.removeLayer(state.guessMarker);
  state.guessMarker = null;
  state.guess = null;
  elements.guessPrompt.classList.remove("hidden");
  elements.clearGuess.disabled = true;
  elements.submitGuess.disabled = true;
  elements.submitText.textContent = "Place a pin to guess";
}

function haversineKm(a, b) {
  const earthRadius = 6371;
  const toRadians = degrees => degrees * Math.PI / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function calculateScore(distance) {
  return Math.max(0, Math.round(5000 * Math.exp(-distance / 1800)));
}

function scoreTitle(distance) {
  if (distance < 15) return "Pinpoint precision!";
  if (distance < 150) return "Excellent read.";
  if (distance < 600) return "Nice detective work.";
  if (distance < 1800) return "Right part of the world.";
  return "A bold expedition.";
}

function submitGuess() {
  if (!state.guess || state.submitted) return;
  state.submitted = true;
  elements.submitGuess.disabled = true;
  elements.clearGuess.disabled = true;

  const target = L.latLng(state.current.lat, state.current.lng);
  const distance = haversineKm(state.guess, target);
  const points = calculateScore(distance);
  state.totalScore += points;

  state.answerMarker = L.marker(target, { icon: answerIcon }).addTo(guessMap);
  state.line = L.polyline([state.guess, target], {
    color: "#17342f",
    weight: 2,
    opacity: 0.72,
    dashArray: "5 8"
  }).addTo(guessMap);
  guessMap.fitBounds(L.latLngBounds([state.guess, target]).pad(0.25), { maxZoom: 7 });

  elements.roundScore.textContent = points.toLocaleString();
  elements.totalScore.textContent = state.totalScore.toLocaleString();
  elements.resultPoints.textContent = points.toLocaleString();
  elements.resultDistance.textContent = formatDistance(distance);
  elements.resultLocation.textContent = state.current.name;
  elements.resultTitle.textContent = scoreTitle(distance);
  elements.resultEyebrow.textContent = `Round ${state.round} complete`;
  elements.nextRound.querySelector("span").textContent =
    state.round === state.maxRounds ? "See final score" : "Next round";

  window.setTimeout(() => {
    elements.resultModal.hidden = false;
  }, 650);
}

function formatDistance(distance) {
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${Math.round(distance).toLocaleString()} km`;
}

function nextRound() {
  if (state.round === state.maxRounds) {
    showFinal();
    return;
  }
  state.round += 1;
  startRound();
}

function handleNextAction() {
  if (state.round === state.maxRounds &&
      elements.resultEyebrow.textContent === "Journey complete") {
    resetGame();
  } else {
    nextRound();
  }
}

function showFinal() {
  const maximum = state.maxRounds * 5000;
  const percentage = Math.round((state.totalScore / maximum) * 100);
  elements.resultEyebrow.textContent = "Journey complete";
  elements.resultTitle.textContent =
    percentage >= 75 ? "Master cartographer." :
    percentage >= 50 ? "Worldly wanderer." :
    percentage >= 25 ? "Promising explorer." : "The world is a big place.";
  elements.resultPoints.textContent = state.totalScore.toLocaleString();
  elements.resultDistance.textContent = `${percentage}% of the classic maximum`;
  elements.resultLocation.textContent = `${state.maxRounds} places explored`;
  elements.nextRound.querySelector("span").textContent = "Play again";
  elements.modalClose.hidden = true;
}

function resetGame() {
  state.round = 1;
  state.totalScore = 0;
  state.usedLocations.clear();
  elements.totalScore.textContent = "0";
  elements.modalClose.hidden = false;
  startRound();
}

function updateDifficulty(difficulty) {
  if (state.submitted) return;
  state.difficulty = difficulty;
  elements.difficultyButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.difficulty === difficulty);
  });
  const config = DIFFICULTIES[difficulty];
  elements.extentLabel.textContent = config.label;
  elements.mapScale.textContent = `${config.km} × ${config.km} km`;
  setClueExtent();
}

function updateProgress() {
  elements.roundDots.forEach((dot, index) => {
    dot.classList.toggle("active", index === state.round - 1);
    dot.classList.toggle("complete", index < state.round - 1);
  });
}

guessMap.on("click", event => placeGuess(event.latlng));
elements.clearGuess.addEventListener("click", clearGuess);
elements.submitGuess.addEventListener("click", submitGuess);
elements.nextRound.addEventListener("click", handleNextAction);
elements.modalClose.addEventListener("click", () => {
  elements.resultModal.hidden = true;
});
elements.difficultyButtons.forEach(button => {
  button.addEventListener("click", () => updateDifficulty(button.dataset.difficulty));
});
document.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  if (!elements.resultModal.hidden) {
    handleNextAction();
  } else if (!elements.submitGuess.disabled) {
    submitGuess();
  }
});

startRound();
