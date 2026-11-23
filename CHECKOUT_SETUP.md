# StyleLoft checkout activation checklist

The Vercel storefront includes a **server-side Paystack hosted checkout** and **The Courier Guy rate quotation** integration. Payments remain switched off by default. The normal enquiry checkout continues to work when configuration is incomplete.

## Security first

- Rotate the Paystack live secret key that was previously shared in chat before accepting payments. Do not put any secret into GitHub, HTML, client-side JavaScript, screenshots, or documentation.
- Add the **new** secret using **Vercel > styleloft-boutique-redesign > Settings > Environment Variables** with the Production target. Keep a separate Paystack test secret for Preview.
- The Paystack public key is not needed for the existing hosted checkout (the backend calls `/transaction/initialize` and redirects to Paystack).
- Keep `STYLELOFT_ENABLE_CHECKOUT=false` until all settings and merchant tests are complete.

## Required Vercel environment variables

| Variable | Value or format |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | New Paystack `sk_live_...` key (Production); `sk_test_...` for Preview |
| `COURIER_GUY_API_KEY` | The Courier Guy / ShipLogic bearer API key |
| `COURIER_GUY_ACCOUNT_NUMBER` | Correct provider/account identifier for the API |
| `COURIER_COLLECTION_ADDRESS` | JSON with `street_address`, `city`, `country` (`ZA`), and `code` (plus any other address fields required by Courier Guy) |
| `COURIER_PARCEL_LENGTH_CM` | Real packed parcel length, e.g. numeric cm (not a placeholder) |
| `COURIER_PARCEL_WIDTH_CM` | Real packed parcel width in cm |
| `COURIER_PARCEL_HEIGHT_CM` | Real packed parcel height in cm |
| `COURIER_PARCEL_WEIGHT_KG` | Real packed parcel weight in kg |
| `STYLELOFT_SITE_URL` | Public HTTPS URL of this deployed storefront, with no path |
| `STYLELOFT_ENABLE_CHECKOUT` | `false` until the final review; set to `true` to enable |

The backend rechecks courier rates immediately before starting Paystack checkout. Product prices are validated against its server-side catalog rather than accepting browser-provided prices.

**Important limitations:** The existing parcel configuration represents ONE packed parcel per order, not automatic product-specific volumetric weight calculation. Confirm rate interpretation, address requirements and service options against the account's actual Courier Guy/ShipLogic API response. Test small and mixed carts and multiple provinces. Quoting is not booking: creating an actual courier waybill, collecting parcels, inventory reservation, order database persistence and automated fulfillment are **not implemented**. A successful Paystack verification reports payment, but shipment remains under manual review.

## Activation and verification

1. Set up or rotate credentials in provider dashboards; configure all required Vercel environment variables.
2. Redeploy the project so the serverless functions receive the new variables.
3. Keep checkout disabled for a manual assessment of actual products, costs, stock, returns, fraud controls, order tracking and fulfillment.
4. In a controlled test environment, enable checkout with test credentials and confirm `/api/checkout?action=status` responds `{"enabled":true,...}`.
5. Test delivery addresses, quote failures, quote changes, Paystack redirects and server-side verification; only mark a transaction paid if Paystack confirms `success`, ZAR currency and expected amount.
6. Set the **new** live secret in Production, verify the merchant's live Paystack approval and Courier Guy account, and only then turn on `STYLELOFT_ENABLE_CHECKOUT=true` for Production.

Paystack verification guidance: https://paystack.com/docs/payments/verify-payments/

This guide intentionally contains no real keys or customer details.
