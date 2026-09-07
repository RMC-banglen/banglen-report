// Service worker แบบ "ส่งผ่านอย่างเดียว" — ไม่แคชอะไรเลย
// มีไว้เพื่อให้ Chrome บนมือถือขึ้นปุ่ม "ติดตั้งแอป" เท่านั้น
// เจตนาไม่แคช เพราะหน้าเว็บอัปเดตบ่อย ถ้าแคชไว้ผู้ใช้จะเห็นข้อมูลเก่า
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* ปล่อยให้เบราว์เซอร์โหลดจากเน็ตตามปกติ */ });
