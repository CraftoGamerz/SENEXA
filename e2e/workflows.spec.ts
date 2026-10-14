import {test,expect} from '@playwright/test';
test('maintenance journey, persistence, filters and exports',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your factory, at a glance.'})).toBeVisible();
 await page.screenshot({path:'../.build/app-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Machines',exact:true}).click();
 await page.getByRole('button',{name:'Add machine',exact:true}).click();
 await page.getByLabel('Machine ID',{exact:true}).fill('TEST-03');await page.getByLabel('Display name').fill('Test conveyor');await page.getByLabel('Zone',{exact:true}).fill('Line C');await page.getByRole('button',{name:'Register machine',exact:true}).click();
 await expect(page.getByRole('button',{name:/Test conveyor/})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:/Test conveyor/})).toBeVisible();
 await page.getByRole('button',{name:'Inspect TEST-03'}).click();await page.getByRole('button',{name:'Plan maintenance',exact:true}).click();
 await page.getByLabel('Task title').fill('Inspect conveyor belt');await page.getByLabel('Assigned engineer').fill('Test engineer');await page.getByLabel('Inspection notes').fill('Inspect alignment and record outcome.');await page.getByRole('button',{name:'Save work order'}).click();
 await page.getByRole('button',{name:'Maintenance',exact:true}).click();await expect(page.getByRole('heading',{name:'Inspect conveyor belt'})).toBeVisible();
 await page.getByRole('button',{name:'Edit Inspect conveyor belt'}).click();await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('completed');await page.getByRole('button',{name:'Save work order'}).click();
 await page.getByRole('button',{name:'completed',exact:true}).click();await expect(page.getByRole('heading',{name:'Inspect conveyor belt'})).toBeVisible();
 const exportEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export report'}).click();await page.getByRole('button',{name:'Filtered records CSV'}).click();expect((await exportEvent).suggestedFilename()).toContain('senexa-orders');
 await page.getByRole('button',{name:'Anomalies',exact:false}).first().click();await page.getByRole('button',{name:'Create work order'}).last().click();await expect(page.getByRole('heading',{name:'Maintenance',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Toggle color theme'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.screenshot({path:'../.build/app-dark.png',fullPage:true});
 expect(errors).toEqual([]);
});
test('responsive navigation and empty search',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.screenshot({path:'../.build/app-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('button',{name:'Machines',exact:true}).click();await expect(page.getByRole('heading',{name:'Machines',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Add machine',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.setViewportSize({width:1440,height:1000});await page.getByLabel('Search machines and records').fill('nothing-matches');await expect(page.getByRole('heading',{name:'No machines found'})).toBeVisible();
});
test('gateway connection, actual API simulator and local model lifecycle',async({page})=>{
 await page.goto('/#edge');await page.getByLabel('Gateway address').fill('http://127.0.0.1:8001');await page.getByLabel('Gateway access token').fill('senexa-e2e-local-test-token');await page.getByRole('button',{name:'Connect and read telemetry'}).click();await expect(page.getByRole('heading',{name:'Gateway connected'})).toBeVisible();
 await page.getByRole('button',{name:'Start gateway simulator'}).click();await expect(page.getByRole('button',{name:'Stop gateway simulator'})).toBeVisible();
 await page.getByRole('button',{name:'Train candidate'}).click();await expect(page.getByRole('button',{name:'Promote candidate'})).toBeEnabled({timeout:20000});await page.getByRole('button',{name:'Promote candidate'}).click();await expect(page.getByRole('status')).toContainText('now active');
 await page.screenshot({path:'../.build/app-edge.png',fullPage:true});await page.getByRole('button',{name:'Stop gateway simulator'}).click();
});
test('profession onboarding, sensor walkthrough, glossary and classified exports',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Account',exact:true}).click();
 await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();await expect(page.getByRole('button',{name:'Continue anonymously'})).toBeVisible();
 await page.getByRole('button',{name:'Explore locally without a cloud account'}).click();
 await page.getByLabel('Your name',{exact:true}).fill('Sankirtans');await page.getByRole('button',{name:/Maintenance engineer Investigate/}).click();await page.getByRole('button',{name:'Continue to sensor setup'}).click();
 await expect(page.getByText('Demo pairing animation. No physical hardware is being connected.')).toBeVisible();await page.getByRole('button',{name:'Pair demo sensors'}).click();await expect(page.getByRole('button',{name:'Enter workspace'})).toBeVisible();await page.screenshot({path:'../.build/app-onboarding.png',fullPage:true});await page.getByRole('button',{name:'Enter workspace'}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByText('engineer',{exact:true}).first()).toBeVisible();await page.reload();await expect(page.getByText('Sankirtans',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'Explain technical terms'}).click();await page.getByLabel('Find a term').fill('Isolation');await expect(page.getByText(/An anomaly-detection algorithm/)).toBeVisible();await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:'Machines',exact:true}).click();await page.getByLabel('Search machines and records').fill('CNC-01');
 const file=page.waitForEvent('download');await page.getByRole('button',{name:'Export report'}).click();await page.getByRole('button',{name:'AI analysis brief (.md)'}).click();const downloaded=await file;expect(downloaded.suggestedFilename()).toMatch(/\.md$/);
 const fs=await import('node:fs/promises');const contents=await fs.readFile((await downloaded.path())!,'utf8');expect(contents).toContain('CNC-01');expect(contents).not.toContain('PMP-01');expect(contents).toContain('unreviewed');
});
