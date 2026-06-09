if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const scriptURL = registration.active?.scriptURL || registration.scriptURL;
        if (scriptURL && scriptURL.endsWith('/sw.js')) {
          await registration.unregister();
          console.log('Desregistrado viejo Service Worker:', scriptURL);
        }
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registrado con éxito:', registration.scope);
    } catch (error) {
      console.log('Error al registrar Service Worker:', error);
    }
  });
}
