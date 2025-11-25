import { FastifyInstance } from "fastify";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Route qui sert le script JavaScript pour l'injection du clickId
 * Ce script est chargé via Theme App Extension (App Embed Block)
 */
export async function registerExtensionRoutes(app: FastifyInstance): Promise<void> {
  // Route pour servir le script JavaScript compilé
  app.get("/extension/analytics-script.js", async (request, reply) => {
    try {
      // En production, on servirait le fichier compilé
      // Pour l'instant, on génère le script inline
      const scriptContent = await generateAnalyticsScript();
      
      reply
        .type("application/javascript")
        .header("Cache-Control", "public, max-age=3600")
        .send(scriptContent);
    } catch (error) {
      reply.code(500).send({ error: "Failed to serve script" });
    }
  });

  // Route pour servir le fichier Liquid de l'App Embed Block
  app.get("/extension/app-embed.liquid", async (request, reply) => {
    try {
      const liquidContent = generateAppEmbedLiquid();
      
      reply
        .type("text/plain")
        .header("Cache-Control", "public, max-age=3600")
        .send(liquidContent);
    } catch (error) {
      reply.code(500).send({ error: "Failed to serve liquid template" });
    }
  });
}

/**
 * Génère le script JavaScript pour l'injection du clickId
 */
async function generateAnalyticsScript(): Promise<string> {
  // Pour l'instant, on génère le script inline
  // En production, on pourrait compiler le fichier TypeScript
  return `(function() {
  const CLICK_COOKIE_NAME = 'cursor_click_id';
  
  function getCookie(name) {
    const value = '; ' + document.cookie;
    const parts = value.split('; ' + name + '=');
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }
  
  async function injectClickIdToCart() {
    const clickId = getCookie(CLICK_COOKIE_NAME);
    
    if (!clickId) {
      return;
    }
    
    try {
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributes: {
            _traaaction_click_id: clickId,
          },
        }),
      });
      
      if (!response.ok) {
        console.warn('[Traaaction] Failed to inject clickId to cart:', response.status);
        return;
      }
      
      if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
        console.log('[Traaaction] ClickId injected to cart:', clickId);
      }
    } catch (error) {
      console.warn('[Traaaction] Error injecting clickId:', error);
    }
  }
  
  function initClickIdInjection() {
    injectClickIdToCart();
    
    let lastUrl = location.href;
    new MutationObserver(function() {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        injectClickIdToCart();
      }
    }).observe(document, { subtree: true, childList: true });
    
    document.addEventListener('cart:updated', function() {
      injectClickIdToCart();
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClickIdInjection);
  } else {
    initClickIdInjection();
  }
  
  if (typeof window !== 'undefined') {
    window.traaactionInjectClickId = injectClickIdToCart;
  }
})();
`;
}

/**
 * Génère le template Liquid pour l'App Embed Block
 */
function generateAppEmbedLiquid(): string {
  return `{% comment %}
  Traaaction Analytics Script Injector
  App Embed Block pour injecter le script de tracking
{% endcomment %}

<script>
  (function() {
    const CLICK_COOKIE_NAME = 'cursor_click_id';
    
    function getCookie(name) {
      const value = '; ' + document.cookie;
      const parts = value.split('; ' + name + '=');
      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
      return null;
    }
    
    async function injectClickIdToCart() {
      const clickId = getCookie(CLICK_COOKIE_NAME);
      
      if (!clickId) {
        return;
      }
      
      try {
        const response = await fetch('/cart/update.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attributes: {
              _traaaction_click_id: clickId,
            },
          }),
        });
        
        if (!response.ok) {
          console.warn('[Traaaction] Failed to inject clickId to cart:', response.status);
          return;
        }
        
        if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
          console.log('[Traaaction] ClickId injected to cart:', clickId);
        }
      } catch (error) {
        console.warn('[Traaaction] Error injecting clickId:', error);
      }
    }
    
    function initClickIdInjection() {
      injectClickIdToCart();
      
      let lastUrl = location.href;
      new MutationObserver(function() {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          injectClickIdToCart();
        }
      }).observe(document, { subtree: true, childList: true });
      
      document.addEventListener('cart:updated', function() {
        injectClickIdToCart();
      });
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initClickIdInjection);
    } else {
      initClickIdInjection();
    }
    
    if (typeof window !== 'undefined') {
      window.traaactionInjectClickId = injectClickIdToCart;
    }
  })();
</script>
`;
}

