/* Logika stranice — ovdje ne moraš ništa mijenjati. Sadržaj je u sadrzaj.js */
(function () {
  "use strict";

  const SOL = "milica-i-ja:";
  const KLJUC_SESIJE = "godisnjica-otkljucano";

  /* ---------- SHA-256 (radi i kad se stranica otvori direktno sa diska) ---------- */
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    const maxWord = Math.pow(2, 32);
    let result = "", words = [], hash = [], k = [], primeCounter = 0, isComposite = {};
    const bitLen = ascii.length * 8;
    for (let c = 2; primeCounter < 64; c++) {
      if (!isComposite[c]) {
        for (let i = 0; i < 313; i += c) isComposite[i] = c;
        hash[primeCounter] = (Math.pow(c, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    ascii += "\x80";
    while (ascii.length % 64 - 56) ascii += "\x00";
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      if (j >> 8) return "";
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (bitLen / maxWord) | 0;
    words[words.length] = bitLen;
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, (j += 16));
      const old = hash;
      hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (let i = 0; i < 8; i++)
      for (let j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? "0" : "") + b.toString(16); }
    return result;
  }

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ============================ BRAVA ============================ */
  const brava = $("#brava");
  const tackice = $("#tackice");
  const poruka = $("#bravaPoruka");
  let unos = "";
  let pokusaji = 0;
  let zakljucano = false;

  function osvjeziTackice() {
    tackice.querySelectorAll("span").forEach((s, i) => s.classList.toggle("puna", i < unos.length));
  }

  function pritisni(k) {
    if (zakljucano) return;
    if (k === "del") { unos = unos.slice(0, -1); osvjeziTackice(); return; }
    if (unos.length >= 4) return;
    unos += k;
    osvjeziTackice();
    if (unos.length === 4) setTimeout(provjeri, 180);
  }

  function provjeri() {
    if (sha256(SOL + unos) === PODESAVANJA.sifraOtisak) {
      zakljucano = true;
      tackice.classList.add("tacno");
      poruka.textContent = "❤";
      try { sessionStorage.setItem(KLJUC_SESIJE, "1"); } catch (e) {}
      setTimeout(otkljucaj, 450);
      return;
    }
    pokusaji++;
    zakljucano = true;
    tackice.classList.add("greska");
    if (navigator.vibrate) navigator.vibrate(120);
    poruka.textContent = pokusaji >= 3 && PODESAVANJA.nagovjestaj ? PODESAVANJA.nagovjestaj : "Покушај поново";
    setTimeout(() => {
      tackice.classList.remove("greska");
      unos = ""; osvjeziTackice(); zakljucano = false;
    }, 600);
  }

  $("#tastatura").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-k]");
    if (b) pritisni(b.dataset.k);
  });
  document.addEventListener("keydown", (e) => {
    if (brava.hidden) return;
    if (/^[0-9]$/.test(e.key)) pritisni(e.key);
    else if (e.key === "Backspace") pritisni("del");
  });

  function napraviSrca() {
    const kont = $(".srca-pozadina");
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.className = "srce-lebdi";
      s.textContent = "❤";
      s.style.left = Math.random() * 100 + "%";
      s.style.fontSize = 10 + Math.random() * 22 + "px";
      s.style.animationDuration = 9 + Math.random() * 10 + "s";
      s.style.animationDelay = -Math.random() * 16 + "s";
      kont.appendChild(s);
    }
  }

  function otkljucaj() {
    brava.classList.add("otvoreno");
    pokreniAlbum();
    setTimeout(() => { brava.hidden = true; }, 700);
  }

  /* ============================ ALBUM ============================ */
  let strane = [];
  let trenutna = 0;

  function danaZajedno() {
    const [g, m, d] = PODESAVANJA.datumPocetka.split("-").map(Number);
    const pocetak = Date.UTC(g, m - 1, d);
    const danas = new Date();
    const sad = Date.UTC(danas.getFullYear(), danas.getMonth(), danas.getDate());
    return Math.max(0, Math.round((sad - pocetak) / 86400000));
  }

  // Pravilan oblik riječi: 1 godina, 2 godine, 5 godina…
  function oblik(n, [jedan, dva, pet]) {
    const d = n % 10, s = n % 100;
    if (d === 1 && s !== 11) return jedan;
    if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return dva;
    return pet;
  }
  const OBLICI = {
    god: ["година", "године", "година"],
    sed: ["седмица", "седмице", "седмица"],
    dan: ["дан", "дана", "дана"],
    sat: ["сат", "сата", "сати"],
    min: ["минут", "минута", "минута"],
    sek: ["секунда", "секунде", "секунди"],
  };

  // Koliko ste zajedno: godine, sedmice, dani, sati, minute, sekunde
  function vrijemeZajedno() {
    const [g, m, d] = PODESAVANJA.datumPocetka.split("-").map(Number);
    const sad = new Date();
    let god = sad.getFullYear() - g;
    if (new Date(g + god, m - 1, d) > sad) god--;
    god = Math.max(0, god);
    let ost = Math.max(0, Math.floor((sad - new Date(g + god, m - 1, d)) / 1000));
    const sek = ost % 60; ost = Math.floor(ost / 60);
    const min = ost % 60; ost = Math.floor(ost / 60);
    const sat = ost % 24; ost = Math.floor(ost / 24);
    const dan = ost % 7;
    const sed = Math.floor(ost / 7);
    return { god, sed, dan, sat, min, sek };
  }

  function osvjeziBrojac() {
    const v = vrijemeZajedno();
    document.querySelectorAll(".brojac-detalji [data-j]").forEach((el) => {
      const n = v[el.dataset.j];
      el.querySelector("b").textContent = n;
      el.querySelector("span").textContent = oblik(n, OBLICI[el.dataset.j]);
    });
  }
  setInterval(osvjeziBrojac, 1000);

  // Jedna slika: okvir se prilagodi obliku slike (bez praznog bijelog prostora)
  function uklopiPojedinacne() {
    document.querySelectorAll(".strana.aktivna .raspored-1").forEach((kont) => {
      const fig = kont.firstElementChild, img = fig && fig.querySelector("img");
      if (!img || !img.naturalWidth) return;
      const W = kont.clientWidth, H = kont.clientHeight, pad = 12;
      const r = img.naturalWidth / img.naturalHeight;
      let w = W - pad, h = w / r;
      if (h > H - pad) { h = H - pad; w = h * r; }
      fig.style.width = Math.round(w + pad) + "px";
      fig.style.height = Math.round(h + pad) + "px";
    });
  }
  window.addEventListener("resize", uklopiPojedinacne);

  function dugmad(prva, zadnja) {
    return `<div class="dugmad">
      ${prva ? "" : `<button class="dugme sporedno" data-akcija="nazad">← Назад</button>`}
      <button class="dugme glavno" data-akcija="dalje">${zadnja || "Даље →"}</button>
    </div>`;
  }

  function napraviNaslovnu() {
    const dana = danaZajedno();
    return `<section class="strana naslovna"><div class="sadrzaj">
      <p class="mali-natpis">${esc(PODESAVANJA.datumGodisnjice)}</p>
      <h1 class="veliki-naslov">Срећна годишњица,<br><em>Микице</em></h1>
      <div class="brojac">
        <div class="brojac-broj" data-broj="${dana}">0</div>
        <div class="brojac-oznaka">дана заједно</div>
        <div class="brojac-detalji">
          ${["god", "sed", "dan", "sat", "min", "sek"].map((j) => `<div data-j="${j}"><b>0</b><span></span></div>`).join("")}
        </div>
      </div>
      <p class="tekst">Спремио сам ти малу шетњу кроз наше успомене. Треба ти само неколико минута и осмијех.</p>
    </div>
    <div class="dugmad"><button class="dugme glavno" data-akcija="dalje">Крени ❤</button></div>
    </section>`;
  }

  function napraviStranuSaSlikama(s) {
    const slike = (s.slike || []).slice(0, 4);
    const okviri = slike.map((f) => `<figure class="okvir" data-fajl="${esc(f)}"><img src="slike/${esc(f)}" alt="" loading="eager" decoding="async"></figure>`).join("");
    return `<section class="strana"><div class="sadrzaj">
      ${s.naslov ? `<h2 class="naslov">${esc(s.naslov)}</h2>` : ""}
      ${s.tekst ? `<p class="tekst">${esc(s.tekst)}</p>` : ""}
      ${slike.length ? `<div class="slike raspored-${slike.length}">${okviri}</div>` : ""}
      ${s.opis ? `<p class="opis">${esc(s.opis)}</p>` : ""}
    </div>${dugmad(false)}</section>`;
  }

  function sadrzajPisma() {
    return `<h2>${esc(PISMO.naslov)}</h2>
      ${PISMO.pasusi.map((p) => `<p>${esc(p)}</p>`).join("")}
      <p class="potpis">${esc(PODESAVANJA.potpis)}</p>`;
  }

  function napraviPismo() {
    return `<section class="strana pismo-strana"><div class="sadrzaj">
      <p class="pismo-uvod">И за крај, неколико ријечи само за тебе…</p>
      <article class="pismo">${sadrzajPisma()}</article>
    </div>
    <div class="dugmad uspravno">
      <button class="dugme sporedno" data-akcija="pdf">📄 Сачувај писмо као PDF</button>
      <div class="dugmad" style="margin-top:0">
        <button class="dugme sporedno" data-akcija="nazad">← Назад</button>
        <button class="dugme glavno" data-akcija="dalje">Још нешто →</button>
      </div>
    </div></section>`;
  }

  function napraviKraj() {
    return `<section class="strana kraj"><div class="sadrzaj">
      <div><span class="veliki-srce">❤</span></div>
      <h2 class="veliki-naslov" style="font-size:2.6rem;margin-top:18px">Волим те</h2>
      <p class="tekst">Хвала ти за ове двије године.<br>Једва чекам све што долази.</p>
    </div>
    <div class="dugmad uspravno">
      <button class="dugme glavno" data-akcija="pdf">📄 Преузми писмо (PDF)</button>
      <button class="dugme sporedno" data-akcija="ispocetka">↺ Прелистај поново</button>
    </div></section>`;
  }

  function pokreniAlbum() {
    const album = $("#album");
    const html = [napraviNaslovnu(), ...STRANE.map(napraviStranuSaSlikama), napraviPismo(), napraviKraj()].join("");
    $("#strane").innerHTML = html;
    strane = Array.from(document.querySelectorAll(".strana"));
    osvjeziBrojac();

    // Slike koje još nisu ubačene prikaži kao okvir sa nazivom fajla
    document.querySelectorAll(".okvir img").forEach((img) => {
      const fig = img.parentElement;
      const nema = () => fig.classList.add("nema-slike");
      if (img.complete && img.naturalWidth === 0) nema();
      img.addEventListener("error", nema);
      img.addEventListener("load", uklopiPojedinacne);
    });

    album.hidden = false;
    prikazi(0, 1);
  }

  function prikazi(i, smjer) {
    strane.forEach((s) => s.classList.remove("aktivna", "nazad"));
    const s = strane[i];
    s.classList.add("aktivna");
    if (smjer < 0) s.classList.add("nazad");
    const sc = s.querySelector(".sadrzaj");
    if (sc) sc.scrollTop = 0;
    trenutna = i;
    $("#napredakTraka").style.width = ((i + 1) / strane.length) * 100 + "%";
    uklopiPojedinacne();
    if (i === 0) animirajBrojac();
    if (i === strane.length - 1) konfete();
  }
  function dalje() { if (trenutna < strane.length - 1) prikazi(trenutna + 1, 1); }
  function nazad() { if (trenutna > 0) prikazi(trenutna - 1, -1); }

  function animirajBrojac() {
    const el = document.querySelector(".brojac-broj");
    if (!el) return;
    const cilj = Number(el.dataset.broj);
    const t0 = performance.now(), traj = 1400;
    function korak(t) {
      const p = Math.min(1, (t - t0) / traj);
      el.textContent = Math.round(cilj * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(korak);
    }
    requestAnimationFrame(korak);
  }

  function konfete() {
    const znaci = ["❤", "💕", "❤", "✨", "💗"];
    for (let i = 0; i < 28; i++) {
      const k = document.createElement("span");
      k.className = "konfet";
      k.textContent = znaci[i % znaci.length];
      k.style.left = Math.random() * 100 + "vw";
      k.style.fontSize = 14 + Math.random() * 18 + "px";
      k.style.color = "#c9566f";
      k.style.animationDuration = 2.6 + Math.random() * 2.4 + "s";
      k.style.animationDelay = Math.random() * 0.8 + "s";
      document.body.appendChild(k);
      setTimeout(() => k.remove(), 6000);
    }
  }

  /* ---------- Uvećanje slike na dodir ---------- */
  const lupa = document.createElement("div");
  lupa.id = "lupa";
  lupa.innerHTML = "<img alt=''>";
  document.body.appendChild(lupa);
  lupa.addEventListener("click", () => lupa.classList.remove("vidljiva"));

  /* ---------- PDF ---------- */
  async function sacuvajPdf(dugme) {
    const izvor = $("#pdfIzvor");
    izvor.innerHTML = `<div class="pdf-list">
      <div class="pdf-zaglavlje">${esc(PODESAVANJA.datumGodisnjice)} · наша друга годишњица</div>
      ${sadrzajPisma()}
      <div class="pdf-podnozje">❤</div></div>`;
    const ime = "Писмо_за_Микицу.pdf";
    if (typeof window.html2pdf !== "function") { window.print(); return; }
    const staro = dugme.textContent;
    dugme.disabled = true; dugme.textContent = "Правим PDF…";
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await window.html2pdf().set({
        margin: [10, 0, 10, 0],
        filename: ime,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: "#fffdf9", useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "avoid-all"] },
      }).from(izvor.firstElementChild).save();
    } catch (e) {
      alert("PDF nije uspio. Pokušaj ponovo ili napravi snimak ekrana pisma.");
    } finally {
      dugme.disabled = false; dugme.textContent = staro;
    }
  }

  /* ---------- Događaji ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-akcija]");
    if (b) {
      const a = b.dataset.akcija;
      if (a === "dalje") dalje();
      else if (a === "nazad") nazad();
      else if (a === "ispocetka") prikazi(0, -1);
      else if (a === "pdf") sacuvajPdf(b);
      return;
    }
    const okvir = e.target.closest(".okvir:not(.nema-slike)");
    if (okvir) {
      lupa.querySelector("img").src = okvir.querySelector("img").src;
      lupa.classList.add("vidljiva");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!brava.hidden) return;
    if (e.key === "Escape") lupa.classList.remove("vidljiva");
    if (lupa.classList.contains("vidljiva")) return;
    if (e.key === "ArrowRight") dalje();
    if (e.key === "ArrowLeft") nazad();
  });

  // Prevlačenje prstom lijevo/desno
  let x0 = null, y0 = null;
  document.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (x0 === null || !brava.hidden || lupa.classList.contains("vidljiva")) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? dalje : nazad)();
    x0 = null;
  }, { passive: true });

  /* ---------- Start ---------- */
  napraviSrca();
  let vecOtkljucano = false;
  try { vecOtkljucano = sessionStorage.getItem(KLJUC_SESIJE) === "1"; } catch (e) {}
  if (vecOtkljucano) { brava.hidden = true; pokreniAlbum(); }
})();
