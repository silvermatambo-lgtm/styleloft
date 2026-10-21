# Style Loft Boutique — WebDevPro Redesign

Official source for https://styleloft-boutique-redesign.vercel.app

## Architecture
- Static responsive HTML/CSS/JavaScript storefront with verified publicly listed products, local-device wishlist, cart preview, product-detail interaction, a PWA shell, and a guided shopping assistant.
- Hosting: Vercel. Production from `main` when repository Git integration is configured. The original WordPress store remains live at https://styleloft.co.za and is authoritative for payment, stock, customer accounts and existing orders.

## Original WooCommerce migration
Uploaded `uploads.zip` and `themes.zip` are **not** themselves a WooCommerce product/order database export. Final catalog reconciliation, image migration, variants, stock sync, order capture and a secure payment gateway are **not complete**. The website must not claim to process live payments until verified. Product imagery used in the preview is illustrative unless specifically sourced from the original website.

## Shipping
Original WordPress shop currently advertises free shipping above R4,500; confirm the current rules at the original checkout.

## Future development
Keep GitHub as the primary source. Never put WordPress admin credentials, WooCommerce API secrets, gateway secret keys, or customer data in this repository. Production checkout should be implemented with backend-verified payment notifications and inventory transaction handling.
