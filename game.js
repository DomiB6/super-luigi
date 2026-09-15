(() => {
  'use strict';

  // ================================================================
  // AUDIO-PLATZHALTER
  // Lege deine eigenen Audiodateien in assets/audio/ ab und ersetze
  // die Dateinamen unten. MP3/OGG/WAV funktionieren in modernen Browsern.
  // ================================================================
  const AUDIO = {
    startTheme: 'assets/audio/01-start-theme.mp3',       // 1. Theme Musik Startscreen
    menuSelect: 'assets/audio/02-menu-select.mp3',      // 2. Durchgehende Musik der Charakterauswahl
    gameTheme: 'assets/audio/03-game-theme.mp3',        // 3. Musik im Spiel
    jump: 'assets/audio/04-jump.mp3',                   // 4. Springen
    collect: 'assets/audio/05-collect-ball.mp3',        // 5. Fussball einsammeln
    stomp: 'assets/audio/06-stomp-enemy.mp3',           // 6. Gegner übersprungen / besiegt
    shoot: 'assets/audio/07-shoot.mp3',                 // 7. Schiessen
    gameOver: 'assets/audio/08-game-over.mp3',          // 8. Verlieren / Game Over
    victory: 'assets/audio/09-victory.mp3'              // optional: Sieg Robi/Holzi
  };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width, H = canvas.height;

  const touchControls = document.getElementById('touch-controls');
  const menuDpad = document.querySelector('.touch-menu-dpad');
  const playMoveControls = document.querySelector('.touch-play-move');
  const playActionControls = document.querySelector('.touch-right');
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches || 'ontouchstart' in window;

  function syncTouchControls() {
    if (!isTouch) {
      touchControls.classList.add('hidden');
      touchControls.style.display = 'none';
      return;
    }

    // Immer zuerst alles ausblenden. Danach wird GENAU die zum Zustand
    // passende Steuerung eingeblendet.
    touchControls.classList.remove('hidden');
    touchControls.style.display = 'none';
    menuDpad.style.display = 'none';
    playMoveControls.style.display = 'none';
    playActionControls.style.display = 'none';

    // Charakterwahl: ausschliesslich 4-Wege-D-Pad.
    if (state === 'select') {
      touchControls.style.display = 'flex';
      menuDpad.style.display = 'grid';
      return;
    }

    // Spiel: ausschliesslich Links/Rechts + Schiessen/Springen.
    if (state === 'playing') {
      touchControls.style.display = 'flex';
      playMoveControls.style.display = 'flex';
      playActionControls.style.display = 'flex';
    }
  }

  const keys = { left:false, right:false, jump:false, shoot:false };
  let jumpPressed = false, shootPressed = false;
  let last = performance.now();

  const audios = {};
  const MUSIC_TRACKS = ['startTheme','menuSelect','gameTheme','gameOver','victory'];
  let wantedMusic = null;
  let musicGeneration = 0;

  for (const [k, src] of Object.entries(AUDIO)) {
    const a = new Audio(src);
    a.preload = 'auto';
    if (k === 'startTheme' || k === 'menuSelect' || k === 'gameTheme') a.loop = true;
    a.volume = MUSIC_TRACKS.includes(k) ? 0.45 : 0.7;
    audios[k] = a;
  }

  function playSfx(name) {
    const a = audios[name];
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
      a.play().catch(()=>{});
    } catch (_) {}
  }

  function hardStopMusic(name, rewind = true) {
    const a = audios[name];
    if (!a) return;
    try {
      a.pause();
      if (rewind) a.currentTime = 0;
    } catch (_) {}
  }

  function stopAllMusic() {
    musicGeneration++;
    wantedMusic = null;
    MUSIC_TRACKS.forEach(k => hardStopMusic(k, true));
  }

  // Zentraler Music-State-Manager:
  // Es darf zu jedem Zeitpunkt GENAU EIN Musiktrack aktiv sein.
  function setMusic(name, { restart = false } = {}) {
    if (!MUSIC_TRACKS.includes(name) || !audios[name]) return;

    wantedMusic = name;
    const generation = ++musicGeneration;

    // Alle anderen Tracks sofort und hart stoppen.
    MUSIC_TRACKS.forEach(k => {
      if (k !== name) hardStopMusic(k, true);
    });

    const a = audios[name];

    // Menü-Musik z.B. beim Navigieren NICHT neu starten.
    if (!restart && !a.paused && !a.ended) return;

    if (restart) {
      try { a.currentTime = 0; } catch (_) {}
    }

    const p = a.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        // Falls während des asynchronen play()-Aufrufs der Screen gewechselt hat,
        // darf dieser alte Track nicht nachträglich wieder loslaufen.
        if (generation !== musicGeneration || wantedMusic !== name) {
          hardStopMusic(name, true);
        }
      }).catch(()=>{});
    }
  }

  // Alias für bestehende Aufrufe.
  function playMusic(name) {
    setMusic(name);
  }


  const palette = {
    sky:'#72c7e7', cloud:'#ecfeff', grass:'#35a853', grass2:'#2d7f45', line:'#f7fafc',
    dirt:'#8f6a3a', dark:'#183153', yellow:'#ffd43b', red:'#e63946', black:'#101010', white:'#fff'
  };

  const CHARACTERS = [
    {id:'luigi', name:'Luigi', desc:'Hat einen Pool', colors:['#2baa43','#f1c7a5','#253040'], boss:'dragon'},
    {id:'robi', name:'Robi', desc:'Messi aus Italien', colors:['#2d6cdf','#f1c7a5','#e6e6e6'], boss:null},
    {id:'carlos', name:'Carlos', desc:'Liebt Mc Donald's', colors:['#d93025','#b97a56','#1f7a3f'], boss:'eagle'},
    {id:'marius', name:'Marius', desc:'Nie ohne Timo', colors:['#6d5dfc','#e0b58e','#333'], locked:'Timo'},
    {id:'timo', name:'Timo', desc:'Nie ohne Marius', colors:['#f59e0b','#ddb38e','#334155'], locked:'Marius'},
    {id:'holzi', name:'Holzi', desc:'Leiden ohne Klagen', colors:['#e67e22','#e5b88b','#303030'], boss:'keeper', invincible:true, bald:true},
    {id:'lars', name:'Lars', desc:'Sammelt Karten', colors:['#0ea5e9','#f0c6a3','#1f2937'], boss:'ref'}
  ];

  let state = 'unlock'; // unlock, start, select, ready, playing, modal, ending
  let selectedIndex = 0;
  let selected = null;
  let modalText = '';
  let cameraX = 0;
  let worldLength = 1680;
  let endTimer = 0;
  let ending = null;
  let shake = 0;
  let particles = [];
  let player, obstacles, enemies, collectibles, projectiles, boss;

  const rectsOverlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const randi = (a,b)=>Math.floor(a+Math.random()*(b-a+1));

  function resetWorld() {
    cameraX = 0;
    particles = []; projectiles = [];
    player = {
      x: 70, y: 125, w: 14, h: 22, vx:0, vy:0,
      onGround:false, facing:1, hp:3, inv:0, balls:0,
      shootCd:0, stompFlash:0
    };
    obstacles = [];
    enemies = [];
    collectibles = [];
    boss = null;

    // Robi: freie Bahn. Keine Hindernisse, keine Gegner, kein Boss.
    if (selected.id !== 'robi') {
      const hurdleXs = [250, 390, 545, 705, 875, 1030, 1185];
      hurdleXs.forEach((x,i)=> obstacles.push({type:i%3===0?'bag':'hurdle', x, y:i%3===0?132:128, w:i%3===0?28:18, h:i%3===0?18:22}));
      // Ballsäcke mit Torwart, der hoch/runter kommt.
      [430, 920, 1215].forEach((x, i)=> enemies.push({type:'keeperPop', x:x+4, y:121, baseY:129, w:16,h:24,t:i*1.4,active:true}));
      // Laufende Gegner
      [320, 610, 790, 1090, 1270].forEach((x,i)=> enemies.push({type:'runner',x,y:132,w:14,h:18,vx:i%2?-28:24,min:x-38,max:x+48,active:true}));
    }

    // Sammelbare Fussbälle
    for (let x=190; x<1360; x+=randi(105,165)) collectibles.push({x,y:randi(82,124),w:10,h:10,taken:false,bob:Math.random()*6});

    if (selected.boss) {
      boss = { type:selected.boss, x:1515, y:85, w:62, h:62, t:0, shot:0, immortal:true, active:false, phase:0, fightTime:0 };
    }
  }

  function startCharacter(ch) {
    selected = ch;
    if (ch.locked) {
      modalText = `${ch.name} kann nur im Multiplayer-Modus mit ${ch.locked} spielen.`;
      state = 'modal';
      // Menü-Musik läuft im Modal bewusst weiter.
      playMusic('menuSelect');
      return;
    }
    resetWorld();
    state = 'ready';
    // Auch auf "Tippe um zu starten" läuft die Menü-Musik weiter.
    playMusic('menuSelect');
  }

  function beginGame() {
    if(state!=='ready') return;
    // Charakterwahl-Musik garantiert beenden, BEVOR das Level startet.
    hardStopMusic('menuSelect', true);
    state='playing';
    setMusic('gameTheme', { restart:true });
  }

  function damagePlayer() {
    if (selected.invincible || player.inv > 0 || state !== 'playing') return;
    player.hp--;
    player.inv = 1.2;
    shake = 0.25;
    burst(player.x+player.w/2, player.y+10, '#ff5d5d', 10);
    if (player.hp <= 0) finish(false);
  }

  function finish(win) {
    state='ending'; endTimer=0; stopAllMusic();
    ending = { win, name:selected.name };
    if (win) setMusic('victory', { restart:true });
    else setMusic('gameOver', { restart:true });
  }

  function burst(x,y,color,n=8) {
    for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-.5)*70,vy:-Math.random()*65-10,life:.7+Math.random()*.4,color});
  }

  function shoot() {
    if(player.shootCd>0) return;
    player.shootCd=.28;
    playSfx('shoot');
    const isFish = selected.id==='carlos';
    projectiles.push({owner:'player', type:isFish?'fish':'ball', x:player.x+(player.facing>0?14:-6), y:player.y+8, w:10,h:8,vx:player.facing*145,vy:isFish?-8:0,life:2.2});
  }

  function bossShoot() {
    if(!boss) return;
    let type='ball';
    if (boss.type==='eagle') type='guitar';
    if (boss.type==='ref') type='card';
    if (boss.type==='keeper') type='glove';

    // Drei klar getrennte Boss-Phasen:
    // 0–5 s: ruhig und gut lesbar, 5–10 s: merklich schwieriger,
    // ab 10 s: volle Eskalation (und für Luigi/Carlos/Lars langfristig ungewinnbar).
    const phase = boss.phase;
    const speed = selected.id==='holzi' ? 95 : (phase===1 ? 105 : phase===2 ? 135 : 175);
    // Exakt wie gewünscht: Phase 1 = 1, Phase 2 = 2, Phase 3 = 3 Geschosse pro Salve.
    const patterns = phase===1 ? [0] : phase===2 ? [-9,9] : [-16,0,16];
    patterns.forEach((dy,i)=>projectiles.push({
      owner:'boss',type,x:boss.x-4,y:boss.y+25+dy,w:12,h:8,
      vx:-speed-randi(0, phase===3?18:8),
      vy:(i-(patterns.length-1)/2) * (phase===3 ? 13 : 9),
      life:4.5
    }));
  }

  function update(dt) {
    if (state!=='playing') {
      if(state==='ending') endTimer += dt;
      updateParticles(dt);
      return;
    }

    player.inv=Math.max(0,player.inv-dt); player.shootCd=Math.max(0,player.shootCd-dt); player.stompFlash=Math.max(0,player.stompFlash-dt);
    let accel=340, max=88;
    if(keys.left){ player.vx-=accel*dt; player.facing=-1; }
    if(keys.right){ player.vx+=accel*dt; player.facing=1; }
    if(!keys.left&&!keys.right) player.vx*=Math.pow(.0008,dt);
    player.vx=clamp(player.vx,-max,max);
    if(jumpPressed && player.onGround){ player.vy=-182; player.onGround=false; playSfx('jump'); }
    if(shootPressed) shoot();
    jumpPressed=false; shootPressed=false;

    player.vy += 480*dt;
    const prevY=player.y;
    player.x += player.vx*dt;
    player.y += player.vy*dt;
    player.x=clamp(player.x, 20, worldLength-20);
    const groundY=154;
    if(player.y+player.h>=groundY){ player.y=groundY-player.h; player.vy=0; player.onGround=true; }

    // Obstacles collision. Holzi zerstört alles.
    for(const o of obstacles){
      if(o.dead) continue;
      if(rectsOverlap(player,o)){
        if(selected.invincible){ o.dead=true; burst(o.x,o.y,'#ffd43b',10); continue; }
        const wasAbove = prevY+player.h <= o.y+5 && player.vy>=0;
        if(wasAbove){ player.y=o.y-player.h; player.vy=0; player.onGround=true; }
        else { if(player.vx>0) player.x=o.x-player.w; else if(player.vx<0) player.x=o.x+o.w; player.vx*=.15; }
      }
    }

    for(const e of enemies){
      if(!e.active) continue;
      if(e.type==='runner'){ e.x+=e.vx*dt; if(e.x<e.min||e.x>e.max)e.vx*=-1; }
      else { e.t+=dt; e.y=e.baseY - Math.max(0,Math.sin(e.t*2.3))*28; }
      if(rectsOverlap(player,e)){
        if(selected.invincible){ e.active=false; burst(e.x,e.y,'#ff934f',12); continue; }
        if(player.vy>20 && prevY+player.h <= e.y+10){
          e.active=false; player.vy=-125; playSfx('stomp'); player.stompFlash=.25; burst(e.x,e.y,'#fff36a',9);
        } else damagePlayer();
      }
    }

    for(const c of collectibles){ if(!c.taken && rectsOverlap(player,c)){ c.taken=true; player.balls++; playSfx('collect'); burst(c.x,c.y,'#fff',7); } }

    // Boss logic: Der Boss wird zuerst sichtbar und startet erst im Bossbereich.
    if(boss){
      boss.t+=dt; boss.shot-=dt;
      boss.y = 78 + Math.sin(boss.t*1.35)*18;
      if(player.x > 1325 && !boss.active){ boss.active=true; boss.fightTime=0; boss.phase=1; boss.shot=1.15; }
      if(boss.active){
        boss.fightTime += dt;
        boss.phase = boss.fightTime < 5 ? 1 : boss.fightTime < 10 ? 2 : 3;
        if(boss.shot<=0){
          boss.shot = selected.id==='holzi' ? .95 : (boss.phase===1 ? 1.35 : boss.phase===2 ? 1.00 : .58);
          bossShoot();
        }
      }
      if(rectsOverlap(player,boss)){
        if(selected.invincible){ finish(true); return; }
        damagePlayer(); player.vx=-90;
      }
    }

    // Projectiles
    for(const p of projectiles){
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
      if(p.owner==='boss' && p.life>0 && rectsOverlap(player,p)){ p.life=0; if(selected.invincible){ burst(p.x,p.y,'#9ff',6);} else damagePlayer(); }
      if(p.owner==='player' && boss && p.life>0 && rectsOverlap(p,boss)){
        p.life=0; burst(p.x,p.y,'#ffd43b',7);
        // Boss bleibt absichtlich unverwundbar. Bei Holzi endet Kontakt/Erreichen im Sieg.
      }
      if(p.owner==='player') for(const e of enemies){ if(e.active && p.life>0 && rectsOverlap(p,e)){ p.life=0; e.active=false; burst(e.x,e.y,'#ffb15f',7); } }
      if(selected.invincible && p.owner==='boss' && Math.abs(p.x-player.x)<16) { p.life=0; }
    }
    projectiles=projectiles.filter(p=>p.life>0 && p.x>-100 && p.x<worldLength+100 && p.y>-50 && p.y<H+50);

    // Robi läuft einfach ins Ziel und gewinnt. Holzi gewinnt beim Erreichen des gegnerischen Tors/Bossbereichs.
    if(selected.id==='robi' && player.x > 1570){ finish(true); return; }
    if(selected.id==='holzi' && player.x > 1500){ finish(true); return; }

    cameraX = clamp(player.x-95,0,worldLength-W);
    updateParticles(dt);
    shake=Math.max(0,shake-dt);
  }

  function updateParticles(dt){ for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=130*dt;p.life-=dt;} particles=particles.filter(p=>p.life>0); }

  function pxRect(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
  function text(s,x,y,size=10,color='#fff',align='left'){
    ctx.font=`bold ${size}px monospace`; ctx.textAlign=align; ctx.textBaseline='top'; ctx.fillStyle='#10131a'; ctx.fillText(s,x+1,y+1); ctx.fillStyle=color; ctx.fillText(s,x,y);
  }

  function drawBackground(cam=0){
    // V3: deutlich detailreicherer 2D-Retro-Look – weiche Landschaftsformen,
    // Tiefenstaffelung, Wolken, Felsen, Bäume, Blumen und ein plastischeres Spielfeld.
    const g=ctx.createLinearGradient(0,0,0,122);
    g.addColorStop(0,'#5fa7ed'); g.addColorStop(.72,'#9bdcf3'); g.addColorStop(1,'#d8f2ef');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,122);

    // Wolken
    const cloud=(x,y,s=1)=>{
      ctx.fillStyle='rgba(255,255,255,.92)';
      ctx.beginPath();
      ctx.arc(x+12*s,y+10*s,10*s,0,Math.PI*2);
      ctx.arc(x+25*s,y+5*s,14*s,0,Math.PI*2);
      ctx.arc(x+41*s,y+11*s,11*s,0,Math.PI*2);
      ctx.arc(x+27*s,y+15*s,18*s,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='rgba(180,225,241,.55)';
      ctx.fillRect(x+10*s,y+17*s,34*s,3*s);
    };
    for(let i=-1;i<5;i++){
      let x=i*105-(cam*.10)%105;
      cloud(x,15+(i%2)*18,.72+(i%3)*.08);
    }

    // Ferne Felsformationen
    const rockShift=-(cam*.12)%190;
    for(let i=-1;i<3;i++){
      const x=rockShift+i*190;
      ctx.fillStyle='#91bdc1';
      ctx.beginPath();
      ctx.moveTo(x,116); ctx.lineTo(x+34,45); ctx.lineTo(x+55,60);
      ctx.lineTo(x+77,26); ctx.lineTo(x+105,70); ctx.lineTo(x+130,50);
      ctx.lineTo(x+166,116); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(220,246,240,.42)';
      ctx.beginPath(); ctx.moveTo(x+36,48);ctx.lineTo(x+55,61);ctx.lineTo(x+46,90);ctx.lineTo(x+30,87);ctx.closePath();ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+78,29);ctx.lineTo(x+102,70);ctx.lineTo(x+91,86);ctx.lineTo(x+70,67);ctx.closePath();ctx.fill();
    }

    // Hügel
    const hillShift=-(cam*.20)%150;
    for(let i=-1;i<4;i++){
      const x=hillShift+i*150;
      ctx.fillStyle=i%2?'#58a96c':'#65b879';
      ctx.beginPath(); ctx.ellipse(x+65,110,80,40,0,Math.PI,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(37,120,76,.22)';
      ctx.beginPath(); ctx.ellipse(x+78,114,54,25,0,Math.PI,Math.PI*2); ctx.fill();
    }

    // Baumgruppen mit Stämmen/Kronen
    const treeShift=-(cam*.34)%145;
    for(let i=-1;i<4;i++){
      const x=treeShift+i*145+20;
      ctx.fillStyle='#8a673e'; ctx.fillRect(x+23,88,10,34);
      ctx.fillStyle='#b58a52'; ctx.fillRect(x+26,89,3,30);
      const blobs=[[15,84,18],[31,76,20],[48,87,17],[29,91,23]];
      blobs.forEach(([bx,by,r],j)=>{
        ctx.fillStyle=j%2?'#48a85c':'#58bd68';
        ctx.beginPath();ctx.arc(x+bx,by,r,0,Math.PI*2);ctx.fill();
      });
      ctx.fillStyle='rgba(22,112,61,.30)';
      ctx.beginPath();ctx.arc(x+29,94,23,0,Math.PI);ctx.fill();
    }

    // Spielfeld
    ctx.fillStyle='#45ae54'; ctx.fillRect(0,119,W,61);
    for(let y=119;y<180;y+=10){
      ctx.fillStyle=(Math.floor((y-119)/10)%2)?'#43a650':'#4ab65a';
      ctx.fillRect(0,y,W,10);
    }
    // Gras-Kante
    ctx.fillStyle='#63d55d'; ctx.fillRect(0,119,W,4);
    for(let x=0;x<W;x+=8){
      ctx.fillStyle=x%16?'#38a94b':'#72e56b';
      ctx.beginPath();ctx.moveTo(x,123);ctx.lineTo(x+4,118);ctx.lineTo(x+8,123);ctx.fill();
    }

    // Blumen und kleine Details
    for(let i=0;i<18;i++){
      const x=((i*47-(cam*.55))%(W+30)+W+30)%(W+30)-10;
      const y=126+(i*17)%23;
      ctx.fillStyle=i%3===0?'#ffe77a':i%3===1?'#fff':'#f5a0d8';
      ctx.fillRect(x,y,2,2); ctx.fillStyle='#287f3e';ctx.fillRect(x,y+2,1,3);
    }

    // Spielfeldlinien
    ctx.fillStyle='rgba(250,255,250,.86)'; ctx.fillRect(0,153,W,2);
  }

  function drawGoal(x, baseY=154, enemy=false){
    const sx=x-cameraX;
    // Schatten und kräftigere Pfosten
    ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(sx+5,151,44,3);
    ctx.fillStyle='#f7fafc';ctx.fillRect(sx,85,5,69);ctx.fillRect(sx+43,85,5,69);ctx.fillRect(sx,85,48,5);
    ctx.fillStyle='#d9e5ec';ctx.fillRect(sx+4,90,2,62);ctx.fillRect(sx+41,90,2,62);
    ctx.strokeStyle='rgba(235,247,252,.72)';ctx.lineWidth=1;
    for(let gx=sx+7;gx<sx+43;gx+=6){ctx.beginPath();ctx.moveTo(gx,91);ctx.lineTo(gx,153);ctx.stroke();}
    for(let gy=94;gy<153;gy+=7){ctx.beginPath();ctx.moveTo(sx+5,gy);ctx.lineTo(sx+43,gy);ctx.stroke();}
    if(enemy){
      ctx.fillStyle='rgba(15,23,42,.76)';ctx.fillRect(sx+6,70,36,12);
      text('ZIEL',sx+24,72,7,'#fff','center');
    }
  }

  function drawCharacter(ch,x,y,scale=1, facing=1){
    const [shirt,skin,pants]=ch.colors; const s=scale;
    const outline='#17202a', boot='#3a2418';
    // Schatten
    pxRect(x+2*s,y+20*s,12*s,2*s,'rgba(0,0,0,.20)');
    // Beine / Schuhe mit Kontur
    pxRect(x+2*s,y+14*s,5*s,7*s,outline); pxRect(x+9*s,y+14*s,5*s,7*s,outline);
    pxRect(x+3*s,y+14*s,3*s,5*s,pants); pxRect(x+10*s,y+14*s,3*s,5*s,pants);
    pxRect(x+1*s,y+19*s,6*s,2*s,boot); pxRect(x+9*s,y+19*s,6*s,2*s,boot);
    // Trikot
    pxRect(x+1*s,y+6*s,14*s,10*s,outline); pxRect(x+2*s,y+7*s,12*s,8*s,shirt);
    pxRect(x+3*s,y+8*s,2*s,1*s,'rgba(255,255,255,.55)');
    // Arme
    pxRect(x-1*s,y+8*s,4*s,8*s,outline); pxRect(x,y+9*s,2*s,6*s,skin);
    pxRect(x+13*s,y+8*s,4*s,8*s,outline); pxRect(x+14*s,y+9*s,2*s,6*s,skin);
    // Hals / Kopf
    pxRect(x+5*s,y+5*s,6*s,3*s,skin);
    pxRect(x+3*s,y-1*s,10*s,9*s,outline); pxRect(x+4*s,y,8*s,7*s,skin);
    // Nase + Auge, blickrichtungsabhängig
    const eyeX=x+(facing>0?10:5)*s;
    pxRect(eyeX,y+2*s,1*s,2*s,'#111');
    pxRect(x+(facing>0?12:3)*s,y+4*s,2*s,2*s,skin);
    // Haare / Glatze / Kappe
    if(ch.bald){
      pxRect(x+4*s,y,8*s,2*s,'#efc59e'); pxRect(x+5*s,y,6*s,1*s,'#f7d5b4');
    } else if(ch.id==='luigi'){
      pxRect(x+2*s,y-3*s,11*s,3*s,'#116b2c'); pxRect(x+3*s,y-4*s,8*s,2*s,'#23a447');
      pxRect(x+(facing>0?10:1)*s,y-1*s,4*s,2*s,'#23a447');
      pxRect(x+6*s,y-3*s,2*s,2*s,'#f5f5f5');
    } else {
      pxRect(x+3*s,y-2*s,10*s,3*s,pants); pxRect(x+4*s,y-1*s,8*s,2*s,'#2c241f');
    }
    // Nummer/Brustdetail
    pxRect(x+7*s,y+9*s,2*s,3*s,'rgba(255,255,255,.75)');
  }

  function drawBall(x,y,r=4){
    ctx.fillStyle='#f8fafc';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#20242a';
    ctx.fillRect(Math.round(x-1),Math.round(y-1),2,2);
    ctx.fillRect(Math.round(x-r+1),Math.round(y),2,2);
    ctx.fillRect(Math.round(x+r-2),Math.round(y),2,2);
    ctx.fillRect(Math.round(x-1),Math.round(y-r+1),2,2);
    ctx.fillRect(Math.round(x-1),Math.round(y+r-2),2,2);
  }

  function drawFish(x,y){
    // Gut sichtbarer Bacalhau-Fisch: grösser, klare Silhouette und Schuppen.
    ctx.save();
    ctx.translate(Math.round(x),Math.round(y));
    ctx.fillStyle='#173c59';
    ctx.beginPath();ctx.ellipse(7,5,8,5,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(13,5);ctx.lineTo(21,0);ctx.lineTo(19,5);ctx.lineTo(21,10);ctx.closePath();ctx.fill();
    ctx.fillStyle='#78c9e8';
    ctx.beginPath();ctx.ellipse(7,5,7,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#c8eff9';
    ctx.beginPath();ctx.ellipse(5,4,4,2,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#4da6ce';
    ctx.beginPath();ctx.moveTo(7,1);ctx.lineTo(11,-3);ctx.lineTo(12,2);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(7,9);ctx.lineTo(11,12);ctx.lineTo(12,8);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(2,3,2,2);ctx.fillStyle='#111';ctx.fillRect(2,3,1,1);
    ctx.strokeStyle='rgba(25,83,112,.65)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(7,3);ctx.lineTo(9,5);ctx.lineTo(7,7);ctx.stroke();
    ctx.restore();
  }

  function drawGuitar(x,y){
    // Pixel-Cifteli: Doppelbauch, langer Hals und Wirbel.
    pxRect(x,y+3,5,7,'#6f3f1e'); pxRect(x+1,y+2,4,8,'#c98238');
    pxRect(x+4,y+4,5,5,'#6f3f1e'); pxRect(x+4,y+3,4,7,'#d79a4d');
    pxRect(x+8,y+5,9,2,'#6f3f1e'); pxRect(x+9,y+5,8,1,'#e3b66c');
    pxRect(x+16,y+4,3,4,'#7d4a23'); pxRect(x+18,y+3,1,2,'#d6a85d'); pxRect(x+18,y+8,1,2,'#d6a85d');
    pxRect(x+4,y+5,1,1,'#2c1b12');
  }

  function drawCard(x,y){
    pxRect(x-1,y-1,10,13,'#402f00'); pxRect(x,y,8,11,'#ffd500');pxRect(x+1,y+1,6,2,'#fff27a');
    pxRect(x+2,y+8,4,1,'#d9a900');
  }

  function drawGlove(x,y){
    pxRect(x+1,y+2,10,8,'#8a94a3');
    pxRect(x+2,y+3,8,6,'#f7fafc');
    pxRect(x,y,3,7,'#eef2f7');pxRect(x+3,y-1,3,6,'#fff');pxRect(x+6,y-1,3,6,'#fff');pxRect(x+9,y,3,6,'#eef2f7');
    pxRect(x+3,y+8,7,3,'#cbd5e1');
  }

  function drawEnemy(e){
    const x=e.x-cameraX,y=e.y;
    if(e.type==='runner'){
      // Gegenspieler mit klarer Fussball-Silhouette
      pxRect(x+1,y+5,12,11,'#2b1a1a'); pxRect(x+2,y+6,10,9,'#8f2727');
      pxRect(x+4,y,7,7,'#dca982'); pxRect(x+5,y-2,6,3,'#38251d');
      pxRect(x+9,y+2,1,1,'#111');
      pxRect(x,y+8,3,5,'#dca982'); pxRect(x+12,y+8,3,5,'#dca982');
      pxRect(x+3,y+15,4,3,'#242424');pxRect(x+9,y+15,4,3,'#242424');
      pxRect(x+5,y+8,3,3,'rgba(255,255,255,.7)');
    } else {
      // Torwart springt sichtbar aus einem gefüllten Ballsack.
      pxRect(x-6,132,29,20,'#4f3625'); pxRect(x-4,130,25,5,'#a47744'); pxRect(x-2,134,21,15,'#7f5735');
      drawBall(x+2,137,3); drawBall(x+10,140,3); drawBall(x+17,136,3);
      pxRect(x+2,y+8,12,13,'#1f4d8a'); pxRect(x+3,y+9,10,11,'#2f6ec0');
      pxRect(x+5,y,7,8,'#d9aa84'); pxRect(x+5,y-2,8,3,'#473026');
      pxRect(x-2,y+10,5,5,'#f7fafc');pxRect(x+14,y+10,5,5,'#f7fafc');
      pxRect(x+7,y+3,1,1,'#111'); pxRect(x+10,y+3,1,1,'#111');
    }
  }

  function drawBoss(){
    if(!boss) return; const x=boss.x-cameraX,y=boss.y;
    if(boss.type==='dragon'){
      // eigener zweiköpfiger Retro-Drache: links alter Brillenkopf, rechts Glatzkopf
      pxRect(x+16,y+26,34,28,'#5c9f45'); pxRect(x+11,y+49,10,9,'#3d7a30');pxRect(x+45,y+49,10,9,'#3d7a30');
      pxRect(x+8,y+13,16,16,'#d9ad8d'); pxRect(x+43,y+13,16,16,'#d9ad8d');
      pxRect(x+8,y+10,16,4,'#d8d8d8'); // alt: graues Haar
      // Brille
      ctx.strokeStyle='#222';ctx.strokeRect(x+10,y+18,5,4);ctx.strokeRect(x+17,y+18,5,4);ctx.fillStyle='#222';ctx.fillRect(x+15,y+19,2,1);
      // Glatze
      pxRect(x+44,y+12,14,2,'#efc7a4');
      pxRect(x+22,y+9,4,22,'#5c9f45'); pxRect(x+39,y+9,4,22,'#5c9f45');
      text('∞',x+32,y+58,10,'#ffd43b','center');
    } else if(boss.type==='eagle'){
      pxRect(x+18,y+22,30,29,'#141414');
      ctx.fillStyle='#111';ctx.beginPath();ctx.moveTo(x+18,y+25);ctx.lineTo(x-2,y+10);ctx.lineTo(x+10,y+40);ctx.fill();
      ctx.beginPath();ctx.moveTo(x+48,y+25);ctx.lineTo(x+68,y+10);ctx.lineTo(x+56,y+40);ctx.fill();
      // two heads
      pxRect(x+13,y+8,14,15,'#eee'); pxRect(x+39,y+8,14,15,'#eee');
      pxRect(x+10,y+14,5,3,'#d6a225');pxRect(x+52,y+14,5,3,'#d6a225');
      pxRect(x+20,y+13,2,2,'#111');pxRect(x+43,y+13,2,2,'#111');
      text('∞',x+33,y+55,10,'#ffd43b','center');
    } else if(boss.type==='ref'){
      pxRect(x+19,y+8,22,16,'#dfb08b'); pxRect(x+17,y+24,26,27,'#222');
      for(let i=0;i<4;i++)pxRect(x+18+i*7,y+24,3,27,'#fff');
      pxRect(x+13,y+27,5,20,'#dfb08b');pxRect(x+43,y+27,5,20,'#dfb08b');
      pxRect(x+21,y+51,7,11,'#222');pxRect(x+34,y+51,7,11,'#222');
      pxRect(x+37,y+30,6,9,'#ffd500'); text('∞',x+31,y+64,10,'#ffd43b','center');
    } else if(boss.type==='keeper'){
      pxRect(x+15,y+18,33,34,'#7c3aed'); pxRect(x+22,y+5,18,16,'#e0b089');
      pxRect(x+6,y+24,10,9,'#fff');pxRect(x+48,y+24,10,9,'#fff');
      pxRect(x+20,y+52,9,10,'#1f2937');pxRect(x+35,y+52,9,10,'#1f2937');
    }
  }

  function drawWorld(){
    const sx=shake>0?(Math.random()-.5)*3:0, sy=shake>0?(Math.random()-.5)*2:0;
    ctx.save();ctx.translate(sx,sy);
    drawBackground(cameraX);
    drawGoal(35,false); drawGoal(1585,true);
    // white pitch marks
    const midfield=840-cameraX; pxRect(midfield,120,2,34,'rgba(255,255,255,.65)');
    ctx.strokeStyle='rgba(255,255,255,.65)';ctx.beginPath();ctx.arc(midfield,137,16,0,Math.PI*2);ctx.stroke();

    for(const o of obstacles){if(o.dead)continue;const x=o.x-cameraX;if(x<-40||x>W+40)continue;
      // Kleine plastische Gras-/Erdinseln um Hindernisse – optisch näher an klassischen 2D-Plattformern.
      if(o.type==='hurdle'){
        ctx.fillStyle='#7b5a35';ctx.fillRect(x-5,148,28,6);
        ctx.fillStyle='#55c956';ctx.fillRect(x-5,146,28,3);
        for(let gx=x-4;gx<x+22;gx+=5){ctx.fillStyle='#76e16b';ctx.fillRect(gx,145,3,2);}
        pxRect(x,129,18,4,'#eee');pxRect(x+2,133,3,20,'#e11d48');pxRect(x+13,133,3,20,'#e11d48');}
      else {pxRect(x,132,28,20,'#79532f');pxRect(x+3,129,22,5,'#9b6a3d');drawBall(x+7,134,3);drawBall(x+16,138,3);drawBall(x+22,134,3);}
    }
    for(const c of collectibles){if(!c.taken){const x=c.x-cameraX;if(x>-20&&x<W+20)drawBall(x,c.y+Math.sin(performance.now()/220+c.bob)*2,4);}}
    for(const e of enemies){if(e.active){const x=e.x-cameraX;if(x>-50&&x<W+50)drawEnemy(e);}}
    drawBoss();
    for(const p of projectiles){const x=p.x-cameraX;if(p.type==='ball')drawBall(x,p.y,4);else if(p.type==='fish')drawFish(x,p.y);else if(p.type==='guitar')drawGuitar(x,p.y);else if(p.type==='card')drawCard(x,p.y);else drawGlove(x,p.y);}

    if(!(player.inv>0 && Math.floor(player.inv*12)%2===0)) drawCharacter(selected,player.x-cameraX,player.y,1,player.facing);
    for(const p of particles) pxRect(p.x-cameraX,p.y,2,2,p.color);

    // HUD
    pxRect(5,5,126,22,'rgba(12,20,30,.75)');
    text(selected.name,10,9,8,'#fff'); text(`LEBEN ${'♥'.repeat(Math.max(0,player.hp))}`,68,9,7,'#ff7777');
    drawBall(18,23,3); text(`${player.balls}`,25,18,7,'#fff');
    if(boss && boss.active){
      const phaseLabel = boss.phase===1 ? 'PHASE 1' : boss.phase===2 ? 'PHASE 2' : 'PHASE 3!';
      const phaseColor = boss.phase===1 ? '#b7f7b7' : boss.phase===2 ? '#ffe38a' : '#ff7777';
      pxRect(242,5,73,16,'rgba(12,20,30,.78)');
      text(phaseLabel,278,9,7,phaseColor,'center');
    }
    ctx.restore();
  }

  function drawUnlock(){
    pxRect(0,0,W,H,'#050505');
    text('BITTE KLICKEN',160,74,15,'#fff','center');
    text('oder tippen',160,98,7,'#aab2bd','center');
  }

  function drawStart(){
    drawBackground(0);
    // banner
    pxRect(30,25,260,98,'rgba(15,24,38,.9)');
    pxRect(35,30,250,88,'#1a2941');
    text('SUPER LUIGI',160,41,25,'#7cff7c','center');
    text('KAMPF UM DIE',160,73,11,'#fff','center');
    text('CHAMPIONS LEAGUE',160,89,13,'#ffd43b','center');
    drawBall(55,56,8); drawBall(267,56,8);
    text('START',160,137,14,'#fff','center');
    text('Klicke / tippe irgendwo',160,157,7,'#e2e8f0','center'); text('V6',303,169,5,'rgba(255,255,255,.55)','right');
  }

  function drawSelect(){
    pxRect(0,0,W,H,'#16253a');
    text('SPIELERWAHL',160,8,15,'#ffd43b','center');
    text('Pfeile / antippen • Enter zum Wählen',160,27,6,'#dbeafe','center');
    const cols=4, cardW=70, cardH=57, gap=6, startX=12, startY=43;
    CHARACTERS.forEach((ch,i)=>{
      const row=Math.floor(i/cols),col=i%cols,x=startX+col*(cardW+gap),y=startY+row*(cardH+gap);
      const sel=i===selectedIndex;
      pxRect(x,y,cardW,cardH,sel?'#ffd43b':'#263a55');
      pxRect(x+2,y+2,cardW-4,cardH-4,sel?'#334155':'#1e293b');
      drawCharacter(ch,x+27,y+7,1.25,1); text(ch.name,x+35,y+36,8,sel?'#ffd43b':'#fff','center');
      if(ch.locked) text('2P',x+61,y+5,6,'#ff8f8f','center');
    });
    const c=CHARACTERS[selectedIndex]; text(c.desc,160,168,6,'#cbd5e1','center');
  }

  function drawReady(){
    drawWorld(); pxRect(35,54,250,67,'rgba(7,14,25,.86)');
    text(selected.name,160,62,16,'#ffd43b','center');
    text('TIPPE UM ZU STARTEN',160,88,11,'#fff','center');
    text('Desktop: ← →  | Leertaste: Sprung | X: Schuss',160,107,5,'#dbeafe','center');
  }

  function drawModal(){
    drawSelect(); pxRect(36,55,248,72,'rgba(8,13,22,.95)');pxRect(41,60,238,62,'#29364a');
    wrapText(modalText,160,72,220,8,'#fff'); text('OK',160,107,9,'#ffd43b','center');
  }

  function wrapText(str,x,y,maxWidth,size,color){
    ctx.font=`bold ${size}px monospace`; const words=str.split(' ');let line='',lines=[];
    for(const w of words){const test=line?line+' '+w:w;if(ctx.measureText(test).width>maxWidth){lines.push(line);line=w;}else line=test;} if(line)lines.push(line);
    lines.forEach((l,i)=>text(l,x,y+i*(size+3),size,color,'center'));
  }

  function drawEnding(){
    drawBackground(2500);
    const win=ending.win;
    if(win){
      // trophy animation on pitch
      const bob=Math.sin(endTimer*4)*2;
      drawCharacter(selected,135,111,1.35,1);
      // trophy
      pxRect(174,102+bob,18,18,'#f6c945');pxRect(178,120+bob,10,5,'#c99022');pxRect(175,125+bob,16,4,'#e2ad2e');
      pxRect(169,105+bob,5,8,'#f6c945');pxRect(192,105+bob,5,8,'#f6c945');
      text('CHAMPIONS!',160,25,20,'#ffd43b','center');
      const winMessages={holzi:'Mindset ist alles',robi:'Liebling von Toni'};
      text(winMessages[selected.id] || `${selected.name} holt den Pokal!`,160,52,9,'#fff','center');
    } else {
      // bench
      pxRect(70,126,180,6,'#8a5a2e');pxRect(80,132,7,24,'#5d3b1f');pxRect(232,132,7,24,'#5d3b1f');
      drawCharacter(selected,147,103,1.25,1);
      text('GAME OVER',160,27,20,'#ff6b6b','center');
      const messages={
        lars:'Wegen zu vielen gelben Karten gesperrt',
        luigi:'Es reicht nur für Team-B',
        carlos:'Hättest du lieber albanische Musik gehört.'
      };
      wrapText(messages[selected.id]||'Heute war nichts zu holen.',160,57,260,9,'#fff');
    }
    pxRect(119,153,82,20,'#101827');pxRect(121,155,78,16,'#334155');text('ZURÜCK',160,159,8,'#fff','center');
  }

  function render(){
    document.body.dataset.gameState = state;
    syncTouchControls();
    ctx.clearRect(0,0,W,H);
    if(state==='unlock')drawUnlock();
    else if(state==='start')drawStart();
    else if(state==='select')drawSelect();
    else if(state==='ready')drawReady();
    else if(state==='modal')drawModal();
    else if(state==='playing')drawWorld();
    else if(state==='ending')drawEnding();
  }

  function loop(now){ const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);render();requestAnimationFrame(loop); }

  function pointFromEvent(e){ const r=canvas.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; return {x:(p.clientX-r.left)*W/r.width,y:(p.clientY-r.top)*H/r.height}; }
  function clickCanvas(e){
    e.preventDefault();
    const p=pointFromEvent(e);
    if(state==='unlock'){
      state='start';
      setMusic('startTheme', { restart:true });
      return;
    }
    if(state==='start'){ hardStopMusic('startTheme', true); state='select'; setMusic('menuSelect', { restart:true }); return; }
    if(state==='ready'){ beginGame(); return; }
    if(state==='modal'){ state='select'; playMusic('menuSelect'); return; }
    if(state==='ending' && p.y>145){ state='select'; selected=null; playMusic('menuSelect'); return; }
    if(state==='select'){
      const cols=4, cardW=70,cardH=57,gap=6,startX=12,startY=43;
      CHARACTERS.forEach((ch,i)=>{const row=Math.floor(i/cols),col=i%cols,x=startX+col*(cardW+gap),y=startY+row*(cardH+gap);if(p.x>=x&&p.x<=x+cardW&&p.y>=y&&p.y<=y+cardH){selectedIndex=i;startCharacter(ch);}});
    }
  }
  canvas.addEventListener('pointerdown', clickCanvas);

  addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowright','arrowup','arrowdown',' ','x','enter'].includes(k))e.preventDefault();
    if(state==='unlock'){
      state='start';
      setMusic('startTheme', { restart:true });
      return;
    }
    if(state==='start'){ hardStopMusic('startTheme', true); state='select'; setMusic('menuSelect', { restart:true }); return; }
    if(state==='modal' && (k==='enter'||k===' ')){state='select';playMusic('menuSelect');return;}
    if(state==='ready'){ if(k==='enter'||k===' '||k==='x'||k.startsWith('arrow'))beginGame(); return; }
    if(state==='ending' && (k==='enter'||k===' ')){state='select';selected=null;playMusic('menuSelect');return;}
    if(state==='select'){
      if(k==='arrowleft')moveSelection('left');
      if(k==='arrowright')moveSelection('right');
      if(k==='arrowup')moveSelection('up');
      if(k==='arrowdown')moveSelection('down');
      if(k==='enter'||k===' ')startCharacter(CHARACTERS[selectedIndex]);
      return;
    }
    if(state==='playing'){
      if(k==='arrowleft')keys.left=true;if(k==='arrowright')keys.right=true;
      if(k===' '){if(!keys.jump)jumpPressed=true;keys.jump=true;}
      if(k==='x'){if(!keys.shoot)shootPressed=true;keys.shoot=true;}
    }
  });
  addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='arrowleft')keys.left=false;if(k==='arrowright')keys.right=false;if(k===' ')keys.jump=false;if(k==='x')keys.shoot=false;});

  function moveSelection(action){
    if(action==='left') selectedIndex=(selectedIndex+CHARACTERS.length-1)%CHARACTERS.length;
    if(action==='right') selectedIndex=(selectedIndex+1)%CHARACTERS.length;
    if(action==='up') selectedIndex=(selectedIndex-4+CHARACTERS.length)%CHARACTERS.length;
    if(action==='down') selectedIndex=(selectedIndex+4)%CHARACTERS.length;
  }

  document.querySelectorAll('#touch-controls button').forEach(btn=>{
    const a=btn.dataset.action;

    const down=e=>{
      if(e.cancelable) e.preventDefault();
      e.stopPropagation();

      // Finger bleibt logisch auf dem Button, auch wenn er beim Halten leicht
      // darüber hinaus rutscht. Wichtig für längeres Laufen.
      if (btn.setPointerCapture && e.pointerId != null) {
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
      }

      if(state==='select' && ['left','right','up','down'].includes(a)){
        moveSelection(a);
        return;
      }

      if(state!=='playing') return;
      if(a==='left'||a==='right') keys[a]=true;
      if(a==='jump'){ if(!keys.jump)jumpPressed=true; keys.jump=true; }
      if(a==='shoot'){ if(!keys.shoot)shootPressed=true; keys.shoot=true; }
    };

    const up=e=>{
      if(e.cancelable) e.preventDefault();
      e.stopPropagation();
      if(a==='left'||a==='right') keys[a]=false;
      if(a==='jump') keys.jump=false;
      if(a==='shoot') keys.shoot=false;

      if (btn.releasePointerCapture && e.pointerId != null) {
        try {
          if (btn.hasPointerCapture?.(e.pointerId)) btn.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    };

    btn.addEventListener('pointerdown',down,{passive:false});
    btn.addEventListener('pointerup',up,{passive:false});
    btn.addEventListener('pointercancel',up,{passive:false});
    btn.addEventListener('lostpointercapture',up,{passive:false});
    btn.addEventListener('contextmenu',e=>e.preventDefault(),{passive:false});
    btn.addEventListener('dragstart',e=>e.preventDefault(),{passive:false});
    btn.addEventListener('selectstart',e=>e.preventDefault(),{passive:false});
  });

  // -------------------------------------------------------------------------
  // HARD MOBILE GESTURE LOCK
  // Diese Seite ist ein Spiel. Deshalb werden die typischen Browser-Gesten
  // vollständig unterdrückt: Long-Press-Auswahl/Copy, Kontextmenü,
  // Dragging, Doppeltipp-Zoom, Pinch-Zoom und Scrollen.
  // -------------------------------------------------------------------------
  const preventBrowserGesture = e => {
    if (e.cancelable) e.preventDefault();
  };

  ['contextmenu','selectstart','dragstart','dblclick'].forEach(type=>{
    document.addEventListener(type, preventBrowserGesture, {capture:true, passive:false});
    window.addEventListener(type, preventBrowserGesture, {capture:true, passive:false});
  });

  // Auf Touch-Geräten Default-Aktionen bereits in der Capture-Phase blockieren.
  // Die Spiellogik läuft über Pointer Events und bleibt dadurch reaktionsschnell.
  ['touchstart','touchmove','touchend','touchcancel'].forEach(type=>{
    document.addEventListener(type, preventBrowserGesture, {capture:true, passive:false});
  });

  // Safari-spezifische Pinch-/Gesture-Events.
  ['gesturestart','gesturechange','gestureend'].forEach(type=>{
    document.addEventListener(type, preventBrowserGesture, {capture:true, passive:false});
  });

  // Zusätzliche Absicherung gegen Safari Double-Tap-Zoom.
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e=>{
    const now = Date.now();
    if (now - lastTouchEnd <= 350 && e.cancelable) e.preventDefault();
    lastTouchEnd = now;
  }, {capture:true, passive:false});

  // Falls die App den Fokus verliert, keine hängen gebliebenen Tasten.
  const releaseAllControls = ()=>{
    keys.left=false; keys.right=false; keys.jump=false; keys.shoot=false;
  };
  window.addEventListener('blur', releaseAllControls);
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) releaseAllControls();
  });

  // Auch inline noch einmal erzwingen – hilft besonders bei iOS WebKit.
  document.documentElement.style.touchAction = 'none';
  document.body.style.touchAction = 'none';
  document.documentElement.style.webkitUserSelect = 'none';
  document.body.style.webkitUserSelect = 'none';

  requestAnimationFrame(loop);
})();
