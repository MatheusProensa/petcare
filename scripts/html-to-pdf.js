const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, '.report.html'));
  await page.pdf({
    path: path.join(root, 'PetCare-Relatorio-Tecnico.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  console.log('PDF gerado.');
})();
