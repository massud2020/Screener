const V="bal-v1",SHELL=["./","index.html","manifest.json","icon.svg","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;               // داده‌های بازار همیشه زنده از شبکه
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(clients.openWindow("./"));});
