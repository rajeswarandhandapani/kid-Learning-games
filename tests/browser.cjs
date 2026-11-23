const {chromium}=require('playwright');
const CAT=require('../assets/js/catalogue.js');const GAME_COUNT=CAT.GAMES.length;const LEVEL4=CAT.GAMES.filter(g=>g.levels.some(l=>l.band===4)).length;
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
async function waitCount(loc,n){
 for(let i=0;i<40;i++){if(await loc.count()===n)return;await new Promise(r=>setTimeout(r,25));}
 assert.equal(await loc.count(),n);
}
async function launchBrowser(){
 const opts={headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})};
 return chromium.launch(opts).catch(()=>chromium.launch({...opts,channel:'chrome'})).catch(()=>chromium.launch({...opts,channel:'msedge'}));
}
(async()=>{
 fs.mkdirSync('artifacts',{recursive:true});
 const server=process.env.BASE_URL?null:await require('../scripts/serve-dist.cjs').start(4173);
 const base=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
 const browser=await launchBrowser();
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 const errors=[];const external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto(base);await page.locator('.game-card').first().waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.game-card').count(),GAME_COUNT);
 await page.evaluate(()=>localStorage.setItem('klg-stage','2'));await page.reload();await page.locator('.game-card').first().waitFor({state:'attached'});await page.screenshot({path:'artifacts/home-desktop.png'});
 await page.goto(`${base}/index.html#all`);await page.reload();await page.locator('#game-search').waitFor();
 await page.locator('#game-search').fill('fractions');await waitCount(page.locator('.game-tile:visible'),CAT.GAMES.filter(g=>(g.name+' '+g.blurb).toLowerCase().includes('fractions')).length);
 await page.locator('#game-search').fill('unfindable');await page.locator('#empty-games').waitFor();assert.ok(await page.locator('#empty-games').isVisible());
 await page.locator('#clear-filters').click();
 await page.getByRole('button',{name:'Favorite Counting',exact:true}).click();
 await page.locator('[data-subject="favorites"]').click();await waitCount(page.locator('.game-tile:visible'),1);
 await page.reload();await page.getByRole('button',{name:'Favorite Counting',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Favorite Counting',exact:true}).getAttribute('aria-pressed'),'true');
 await page.locator('#level-filter').selectOption('4');await waitCount(page.locator('.game-tile:visible'),LEVEL4);
 await page.locator('#parent-open').click();await page.locator('#parent-dialog').waitFor();assert.ok(await page.locator('#parent-dialog').isVisible());await page.keyboard.press('Escape');
 await page.locator('#level-filter').selectOption('all');
 await page.locator('#game-search').fill('Picture Words');await waitCount(page.locator('.game-tile:visible'),CAT.GAMES.filter(g=>(g.name+' '+g.blurb).toLowerCase().includes('picture words')).length);
 await page.locator('#game-search').fill('');
 await page.setViewportSize({width:390,height:844});await page.goto(`${base}/index.html#home`);await page.reload();await page.locator('#worlds').waitFor();await page.screenshot({path:'artifacts/home-mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const games=fs.readdirSync('games').filter(id=>fs.existsSync(path.join('games',id,'index.html')));
 for(const id of games){
  // Hand-built activities are played through in tests/tamil-games-browser.cjs and tests/math-games-browser.cjs.
  if(['tamil-letter-chart','tamil-letter-pop','tamil-tracing','tamil-word-puzzle','tamil-memory','share-fairly','array-garden','multiples-hunt'].includes(id))continue;
  // New hand-built picture games (marked in their <head>) are played in tests/picture-games-browser.cjs.
  if(fs.readFileSync(path.join('games',id,'index.html'),'utf8').includes('name="klg-handbuilt"'))continue;
  // Spelling Bee opens on its training (tests/bee-browser.cjs); its quiz has its own address.
  await page.goto(`${base}/games/${id}/index.html${id==='spelling-bee'?'?level=1':''}`);await page.locator('#start-btn').click();
  if(id==='memory-match')continue;
  if(id==='tamil-sentence-words'||id==='tamil-missing-letters'){
    assert.ok(await page.locator('#tamil-answer').isVisible());
    await page.locator('#typing-exit').click();
    continue;
  }
  await page.locator('.quiz-choice-btn').first().waitFor();
  if(['picture-words','feelings-faces','everyday-tools'].includes(id)){
    assert.ok(await page.locator('#quiz-screen .quiz-listen').isVisible(),id);
    assert.ok(await page.locator('.quiz-choice-btn').first().getAttribute('aria-label'),id);
    assert.match(await page.locator('.quiz-choice-btn').first().textContent(),/[^A-Za-z\s]/u,id);
  }
  assert.equal(await page.locator('#timer-text').textContent(),'Practice · no timer',id);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${id}: mobile overflow`);
  await page.locator('.quiz-choice-btn').first().click();await page.locator('.quiz-next').waitFor({state:'visible'});
  if(['picture-words','feelings-faces','everyday-tools'].includes(id)) assert.equal(await page.locator('.quiz-choice-listen').first().isDisabled(),false,id);
  assert.ok((await page.locator('#quiz-feedback').textContent()).length>5,id);
  await page.locator('.quiz-next').click();assert.equal(await page.locator('#question-number').textContent(),'2',id);
  await page.locator('#quiz-exit').click();assert.ok(await page.locator('#start-screen').isVisible(),id);
  console.log('PASS start, answer, feedback, next, exit:',id);
 }
 // Complete an actual practice round with clicks, then verify rewards survive reload.
 await page.goto(`${base}/games/counting/index.html?max=5`);await page.locator('#start-btn').click();
 await page.screenshot({path:'artifacts/counting-mobile.png'});
 const total=Number(await page.locator('#total-questions').textContent());
 for(let i=0;i<total;i++){await page.locator('.quiz-choice-btn').first().click();await page.locator('.quiz-next').click();}
 assert.ok(await page.locator('#results-screen').isVisible());
 assert.equal(await page.evaluate(()=>KlgProgress.summary().plays),1);
 await page.locator('#play-again-btn').click();assert.equal(await page.locator('#question-number').textContent(),'1');
 await page.reload();assert.equal(await page.evaluate(()=>KlgProgress.summary().plays),1);
 // Timed mode expires; practice does not. Use the browser clock rather than waiting.
 await page.clock.install();await page.evaluate(()=>{document.querySelector('.kid-more').open=true;});await page.locator('[data-play-mode="challenge"]').click();assert.equal(await page.locator('#play-mode').inputValue(),'challenge');await page.locator('#start-btn').click();
 await page.clock.fastForward(25000);assert.match(await page.locator('#quiz-feedback').textContent(),/answer is/);
 await page.clock.fastForward(4000);assert.equal(await page.locator('#question-number').textContent(),'2');
 await page.locator('#quiz-exit').click();await page.clock.fastForward(30000);assert.ok(await page.locator('#start-screen').isVisible());
 await page.locator('[data-play-mode="practice"]').click();await page.locator('#start-btn').click();await page.clock.fastForward(60000);assert.equal(await page.locator('#question-number').textContent(),'1');
 await page.clock.resume();
 await page.goto(`${base}/games/reading-stories/index.html`);await page.setViewportSize({width:1440,height:1100});await page.locator('#start-btn').click();await page.screenshot({path:'artifacts/story-desktop.png'});
 assert.ok(await page.locator('#quiz-screen .quiz-listen').isVisible());
 assert.ok(await page.locator('.quiz-choice-listen').count()>0);
 await page.goto(`${base}/games/shapes-colors/index.html?mode=color`);
 await page.locator('#start-btn').click();
 assert.ok(await page.locator('#quiz-screen .quiz-listen').isVisible());
 assert.ok(await page.locator('.quiz-choice-btn').first().getAttribute('aria-label'));
 assert.ok(await page.locator('.quiz-choice-btn').first().textContent());
 const speechPage=await browser.newPage();
 await speechPage.addInitScript(()=>{
   window.__spoken=[];
   window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
   Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(utterance){window.__spoken.push(utterance.text);}}});
 });
 await speechPage.goto(`${base}/games/picture-words/index.html`);
 await speechPage.locator('.quiz-intro-listen').click();
 assert.match((await speechPage.evaluate(()=>window.__spoken.at(-1))),/Picture Words/);
 await speechPage.locator('#start-btn').click();
 assert.match((await speechPage.evaluate(()=>window.__spoken.at(-1))),/Find the/);
 const spokenBefore=await speechPage.evaluate(()=>window.__spoken.length);
 await speechPage.locator('#quiz-screen .quiz-listen').click();
 assert.equal(await speechPage.evaluate(()=>window.__spoken.length),spokenBefore+1);
 await speechPage.locator('.quiz-choice-listen').first().click();
 assert.ok((await speechPage.evaluate(()=>window.__spoken.at(-1))).length>2);
 await speechPage.close();
 // Discover the deck through visible card flips, then match known pairs.
 await page.goto(`${base}/games/memory-match/index.html`);await page.locator('#start-btn').click();
 const deck=[];
 for(let i=0;i<12;i+=2){await page.locator('.memory-card').nth(i).click();await page.locator('.memory-card').nth(i+1).click();deck[i]=await page.locator('.memory-card').nth(i).textContent();deck[i+1]=await page.locator('.memory-card').nth(i+1).textContent();await page.waitForTimeout(1500);}
 for(const symbol of new Set(deck)){const indices=deck.map((s,i)=>s===symbol?i:-1).filter(i=>i>=0);if(await page.locator('.memory-card').nth(indices[0]).isDisabled())continue;for(const i of indices)await page.locator('.memory-card').nth(i).click();}
 assert.match(await page.locator('#memory-feedback').textContent(),/all 6 pairs/);
 await page.screenshot({path:'artifacts/memory-desktop.png'});
 assert.equal(await page.evaluate(()=>KlgProgress.summary().plays),2);
 await page.locator('#restart-memory').click();assert.equal(await page.locator('.memory-card:disabled').count(),0);
 await page.locator('#memory-change-size').click();
 await page.locator('#memory-size').selectOption('10');
 await page.locator('#start-btn').click();
 assert.equal(await page.locator('.memory-card').count(),20);
 assert.match(await page.locator('#memory-status').textContent(),/0 of 10 pairs/);
 await page.locator('#memory-change-size').click();
 await page.locator('#memory-size').selectOption('15');
 await page.locator('#start-btn').click();
 assert.equal(await page.locator('.memory-card').count(),30);
 assert.match(await page.locator('#memory-status').textContent(),/0 of 15 pairs/);
 // Start with invalid storage and with localStorage unavailable.
 await page.evaluate(()=>localStorage.setItem('klg-progress-v1','null'));await page.goto(base);await page.locator('.game-card').first().waitFor({state:'attached'});assert.equal(await page.locator('.game-card').count(),GAME_COUNT);
 const blocked=await browser.newPage();blocked.on('pageerror',e=>errors.push(e.message));await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage disabled');}});});await blocked.goto(base);await blocked.locator('.game-card').first().waitFor({state:'attached'});assert.equal(await blocked.locator('.game-card').count(),GAME_COUNT);await blocked.close();
 // Legacy v1-vanilla localStorage progress, favorites, and review items continue to load seamlessly.
 const legacy=await browser.newPage();legacy.on('pageerror',e=>errors.push(e.message));
 await legacy.goto(base);await legacy.locator('#stars-chip').waitFor();
 await legacy.evaluate(()=>{
  localStorage.setItem('klg-progress-v1',JSON.stringify({
   xp:140,plays:4,streak:3,bestStreak:3,lastDay:'2026-11-22',
   games:{
    counting:{bestStars:3,plays:2,recent:[80,100],byMode:{}},
    'addition-subtraction':{bestStars:2,plays:2,recent:[70,80],byMode:{}},
   },
   badges:{'first-star':'2026-11-22'},
  }));
  localStorage.setItem('klg-favorites',JSON.stringify(['counting','addition-subtraction']));
  localStorage.setItem('klg-review-v1',JSON.stringify({
   epoch:1,cleared:0,
   items:[{id:'counting||x',gameId:'counting',query:'',snapshot:{prompt:'How many?',correctAnswer:3,choices:[3,4],dedupeKey:'x'},step:0,due:'2000-01-01',misses:1}],
  }));
 });
 await legacy.reload();await legacy.locator('#stars-chip').waitFor();
 assert.match(await legacy.locator('#stars-chip').textContent(),/5/);
 assert.ok(await legacy.locator('#review-card').isVisible());
 assert.match(await legacy.locator('#review-count').textContent(),/1/);
 await legacy.goto(`${base}/index.html#world/favorites`);
 await legacy.locator('.game-tile:visible').first().waitFor();
 await waitCount(legacy.locator('.game-tile:visible'),2);
 await legacy.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS all '+GAME_COUNT+' activities, discovery, persistence, legacy compatibility, timers, replay, memory, mobile overflow; no runtime errors or external requests.');
 }finally{await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
