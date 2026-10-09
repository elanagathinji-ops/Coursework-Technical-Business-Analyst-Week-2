// Mock data for the prototype only; keyed by digits-only phone number.
const TODAYS_APPOINTMENTS = {
  "07700900101": { owner: "Sam", pet: "Bella (dog)", petName: "Bella", time: "10:30", reason: "Annual vaccination" },
  "07700900102": { owner: "Priya", pet: "Milo (cat)", petName: "Milo", time: "11:00", reason: "Dental check" },
};
// 07700900103 is a known client with no appointment today, so it falls through to reception.

const PHONE_LENGTH = 11;
const IDLE_RESET_MS = 60000;

const $ = (id) => document.getElementById(id);
let digits = "";
let idleTimer;

function formatPhone(d) {
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

function renderPhone() {
  $("phone-display").textContent = formatPhone(digits);
  $("lookup").disabled = digits.length !== PHONE_LENGTH;
}

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  if (id === "phone") {
    digits = "";
    renderPhone();
  }
  resetIdle();
}

function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => show("welcome"), IDLE_RESET_MS);
}

document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-goto]");
  if (nav) show(nav.dataset.goto);

  const key = e.target.closest("[data-key]");
  if (key) {
    const k = key.dataset.key;
    if (k === "clear") digits = "";
    else if (k === "back") digits = digits.slice(0, -1);
    else if (digits.length < PHONE_LENGTH) digits += k;
    renderPhone();
    resetIdle();
  }
});

$("lookup").addEventListener("click", () => {
  const appt = TODAYS_APPOINTMENTS[digits];
  if (!appt) return show("reception");

  $("c-owner").textContent = appt.owner;
  $("c-pet").textContent = appt.pet;
  $("c-time").textContent = appt.time;
  $("c-reason").textContent = appt.reason;
  $("i-pet").textContent = appt.petName;
  $("i-pet-2").textContent = appt.petName;
  $("d-time").textContent = appt.time;
  show("confirm");
});

renderPhone();
resetIdle();
