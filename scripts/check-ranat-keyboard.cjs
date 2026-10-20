const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const range=async(value)=>{await page.getByRole('combobox',{name:'ช่วงเสียงคีย์บอร์ดและพื้นที่ขยาย'}).selectOption(value);await page.locator('h1').click();};
 const start=()=>page.getByRole('button',{name:'อัดทำนอง',exact:true}).click();
 const stop=async()=>{await page.getByRole('button',{name:'หยุดและบันทึก',exact:true}).click();return page.evaluate(()=>JSON.parse(localStorage.getItem('next-instruments.ranat.takes.v1'))[0].events.map(e=>e.bar));};
 try {
  await page.goto('http://localhost:3000/instruments/ranat/play',{waitUntil:'networkidle'});
  await range('0');await start();
  for(const n of '1234567890')await page.keyboard.press(n);
  await page.keyboard.down('1');await page.keyboard.down('1');await page.keyboard.up('1');
  await page.keyboard.press('a');
  await page.evaluate(()=>{for(const type of ['keydown','keyup'])window.dispatchEvent(new KeyboardEvent(type,{code:'Numpad1',key:'1',bubbles:true}));});
  await page.getByRole('spinbutton',{name:'ความเร็วจังหวะ BPM'}).focus();await page.keyboard.press('2');
  assert.deepEqual(await stop(),[0,1,2,3,4,5,6,7,8,9,0,0,0]);
  await start();
  const numberOne=page.getByRole('button',{name:'ปุ่ม 1: ลา ลูก 1',exact:true});
  await numberOne.click();await page.getByRole('button',{name:'ปุ่ม 0: โด ลูก 10',exact:true}).tap();
  await numberOne.focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');
  assert.deepEqual(await stop(),[0,9,0,0]);
  await range('13');await start();for(const n of '1234567890')await page.keyboard.press(n);
  assert.deepEqual(await stop(),[13,14,15,16,17,18,19,20]);
  assert(await page.getByRole('button',{name:'ปุ่ม 9: ไม่ใช้ในช่วงนี้',exact:true}).isDisabled());
  await range('7');await page.getByRole('button',{name:'เล่น 8 ลูก',exact:true}).click();await start();
  for(const n of '1234567890')await page.keyboard.press(n);
  assert.deepEqual(await stop(),[7,8,9,10,11,12,13,14]);
  await page.getByRole('button',{name:'ดูเต็มราง',exact:true}).click();await range('0');
  await page.getByRole('button',{name:/รัวเสียงเดียว ROLL/}).click();await start();
  await page.keyboard.down('1');await page.waitForTimeout(450);await page.keyboard.up('1');await page.waitForTimeout(150);
  const first=await stop();assert(first.length>=3);assert(first.every(n=>n===0));
  await start();const numberBox=await numberOne.boundingBox();await page.mouse.move(numberBox.x+numberBox.width/2,numberBox.y+numberBox.height/2);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.move(numberBox.x-30,numberBox.y-30);await page.mouse.up();
  const pointerRoll=await stop();assert(pointerRoll.length>=2);assert(pointerRoll.every(n=>n===0));
  await start();await page.waitForTimeout(250);await page.keyboard.down('2');await page.waitForTimeout(180);await page.keyboard.up('2');const next=await stop();assert(next.length>=1);assert(next.every(n=>n===1));
  fs.mkdirSync('docs/previews/ranat-keyboard',{recursive:true});
  await page.locator('.rn-stage').screenshot({path:'docs/previews/ranat-keyboard/desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.locator('.rn-stage').screenshot({path:'docs/previews/ranat-keyboard/mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log('PASS: number row, numpad mapping, letter compatibility, repeats, input focus, high range, eight-bar range, hold/release, desktop/mobile');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

