const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:320,height:850},reducedMotion:'reduce'});
    const page=await context.newPage();
    await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Test denied','NotAllowedError');};});
    await page.route('**/models/ranat-modern-v5.glb',route=>route.abort());
    await page.goto('http://localhost:3000/instruments/ranat/play',{waitUntil:'networkidle'});
    await page.locator('.rn-flat-fallback svg').waitFor();
    await page.getByRole('button',{name:'อัดทำนอง',exact:true}).click();
    await page.getByRole('button',{name:'ลา ลูก 1',exact:true}).click();
    await page.getByRole('button',{name:'หยุดและบันทึก',exact:true}).click();
    const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem('next-instruments.ranat.takes.v1'))[0].events.length);
    if(notes!==1)throw new Error('Fallback did not play and record');
    await page.getByRole('button',{name:/กล้อง/}).first().click();
    await page.getByRole('button',{name:'เปิดกล้อง',exact:true}).click();
    await page.getByText('ยังไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาต Camera ในการตั้งค่าเบราว์เซอร์').waitFor();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(overflow)throw new Error('320px overflow');
    await page.screenshot({path:'docs/ranat-hand-play/recovery-320.png',fullPage:true});
    fs.writeFileSync('docs/ranat-hand-play/recovery-report.json',JSON.stringify({modelLoadFailureFallback:true,fallbackRecordedNotes:notes,cameraDeniedMessage:true,mobile320Overflow:overflow,reducedMotion:true},null,2));
    console.log('PASS: model failure fallback, audio recording, camera denied, reduced motion, 320px layout');
    const preview=await browser.newPage({viewport:{width:1440,height:1050}});
    await preview.goto('http://localhost:3000/instruments/ranat/play',{waitUntil:'networkidle'});
    await preview.locator('canvas[aria-label="โมเดลระนาดเอกสามมิติ"]').waitFor();await preview.waitForTimeout(1000);
    await preview.locator('.rn-stage').screenshot({path:'docs/ranat-hand-play/stage-preview.png'});
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
