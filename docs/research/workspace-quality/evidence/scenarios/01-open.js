await page.setViewportSize({width:1440,height:1000});
await page.goto('http://localhost:3040/python/learn/python-execution');
return {title:await page.title(),text:(await page.locator('body').innerText()).slice(-6500),editors:await page.locator('.cm-content').count(),tabs:await page.getByRole('tab').allTextContents(),buttons:await page.getByRole('button').allTextContents()};
