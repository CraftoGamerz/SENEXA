import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',fullyParallel:false,workers:1,timeout:30000,use:{baseURL:'http://127.0.0.1:5173',channel:process.platform==='win32'?'msedge':'chromium',headless:true,viewport:{width:1440,height:1000},trace:'retain-on-failure'},reporter:'list'});
