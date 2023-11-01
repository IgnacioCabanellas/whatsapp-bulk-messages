import puppeteer from 'puppeteer';
import { Page } from 'puppeteer';

const fs = require('fs');
var path = require('path');

const WHATS_APP_WEB = 'https://web.whatsapp.com';
var CONTACTS_PATH = path.join(__dirname, '..', 'files', 'contacts.csv');
var MESSAGE_PATH = path.join(__dirname, '..', 'files', 'message.txt');

const MIN = 7000;
const MAX = 23000;
const messageboxClass = '#main > footer > div._2lSWV._3cjY2.copyable-area > div > span:nth-child(2) > div > div._1VZX7 > div._3Uu1_ > div > div.to2l77zo.gfz4du6o.ag5g9lrv.bze30y65.kao4egtt';

function generateLink(contact: string) {
    return `${WHATS_APP_WEB}/send?phone=${contact}`;
}

async function sender(): Promise<void> {
    const contacts = await readCsv();
    writePhonesErrorCSV(contacts, 'Clientes_sin_enviar_difusion');
    
    if (contacts.length === 0) {
        console.log('The file has no contacts.');
        return;
    }

    const message = await readTxtFile();
    if (message.length === 0) {
        console.log('Empty file.');
        return;
    }
    
    console.log('Sign in to WhatsApp Web when your browser is up.');
    const browser = await puppeteer.launch({
        headless: false,
        //userDataDir: 'data/userdata' // Persist the session.
    });

    const page = await browser.newPage();
    
    await page.goto(WHATS_APP_WEB);

    const session = await login(page);
    if (!session) {
        console.log('User in not logged in.');
        return;
    }

    const phonesError = []; 

    for (const c of contacts) {
        try {
            const delay = Math.random() * (MAX - MIN) + MIN;  // Random number between MIN and MAX (included decimals.
            await page.waitForTimeout(delay);
            await page.goto(generateLink(c));
            await page.waitForSelector('#side', { timeout: 60000 });
            await page.waitForSelector(messageboxClass, { timeout: 60000 });
            const input = await page.$(messageboxClass);
            await input?.click();
            await input?.focus();
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyV');
            await page.keyboard.up('Control');
            await page.waitForTimeout(10000);
            await page.keyboard.press('Enter');
            console.log(`Message sent to contact ${c}.`);
        } catch {
            phonesError.push(c);
        }        
    }

    if (phonesError.length > 0) {
        console.log('Messages sent successfully!');
        writePhonesErrorCSV(phonesError, 'contacts_skipped');
    } else {
        console.log('Messages sent with skipped contacts, check the errors folder.');
    }    
}

async function login(page: Page): Promise<boolean> { 
    const maxAttemps = 5;
    let attemps = 0;
       
    while (attemps < maxAttemps) {
        try {
        await page.waitForSelector('canvas');
        console.log('Scan the QR code to sign in to WhatsApp Web.');
        await page.waitForSelector('#side', { timeout: 60000 });
        console.log('User logged.');
        return true;
      } catch (error) {
        console.log('Login timeout. Retrying...');
        await page.waitForTimeout(5000);
      }
    }
    return false;
}

function readCsv(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        fs.readFile(CONTACTS_PATH, 'utf8', (err: any, data: any) => {
            if (err) {
                reject(err);
            } else {
                const rows: string[] = data.trim().split(';');
                const notRepeatedRows = Array.from(new Set(rows));
                resolve(notRepeatedRows);
            }
        });
    });
}

function readTxtFile() {
    try {
        const buffer = fs.readFileSync(MESSAGE_PATH, 'utf8');
        const mensaje = buffer.toString('utf8'); // Convierte el buffer a una cadena de texto
        return mensaje;
    } catch (error) {
        console.error('Cannot read the file:', error);
    }
}

async function writePhonesErrorCSV(data: string[], fileName: string) {
    const csvContent = data.map(phone => `${phone}\n`).join('');
    const filePath = path.join('./errors', fileName);
    fs.writeFileSync(filePath, csvContent);
}

sender();