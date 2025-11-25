/**
 * Script client-side injecté via Theme App Extension
 * Lit le cookie cursor_click_id et l'ajoute comme attribut de panier Shopify
 */

import { CLICK_COOKIE_NAME } from "@tracking/shared";

/**
 * Lit un cookie depuis document.cookie
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

/**
 * Injecte le clickId dans le panier Shopify via l'API AJAX
 */
async function injectClickIdToCart(): Promise<void> {
  const clickId = getCookie(CLICK_COOKIE_NAME);
  
  if (!clickId) {
    // Pas de clickId, rien à faire
    return;
  }

  try {
    // Utiliser l'API AJAX de Shopify pour mettre à jour le panier
    const response = await fetch("/cart/update.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attributes: {
          _traaaction_click_id: clickId,
        },
      }),
    });

    if (!response.ok) {
      console.warn("[Traaaction] Failed to inject clickId to cart:", response.status);
      return;
    }

    // Log en mode debug si nécessaire
    if (window.location.hostname === "localhost" || window.location.search.includes("debug=true")) {
      console.log("[Traaaction] ClickId injected to cart:", clickId);
    }
  } catch (error) {
    // Erreur silencieuse pour ne pas perturber l'expérience utilisateur
    console.warn("[Traaaction] Error injecting clickId:", error);
  }
}

/**
 * Initialise l'injection du clickId
 * S'exécute immédiatement et aussi sur les événements de navigation SPA
 */
function initClickIdInjection(): void {
  // Injection immédiate
  void injectClickIdToCart();

  // Réinjecter lors des changements de page (pour les SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      void injectClickIdToCart();
    }
  }).observe(document, { subtree: true, childList: true });

  // Réinjecter lors des événements de panier (ajout, modification)
  document.addEventListener("cart:updated", () => {
    void injectClickIdToCart();
  });
}

// Auto-initialisation si le script est chargé directement
if (typeof window !== "undefined" && document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initClickIdInjection);
} else {
  initClickIdInjection();
}

// Export pour utilisation manuelle si nécessaire
if (typeof window !== "undefined") {
  (window as any).traaactionInjectClickId = injectClickIdToCart;
}

