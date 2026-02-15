const opportunities = [
  "Empresas buscando Cardiologistas agora",
  "Alta demanda para Clinica Geral neste turno",
  "Psiquiatria com agendas abertas hoje",
  "Dermatologia com chamadas em menos de 30 minutos",
];

let index = 0;
const tickerText = document.getElementById("ticker-text");

if (tickerText) {
  setInterval(() => {
    index = (index + 1) % opportunities.length;
    tickerText.textContent = opportunities[index];
  }, 2600);
}

const revealTargets = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

revealTargets.forEach((target) => observer.observe(target));
