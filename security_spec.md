# Security Specification & Adversarial Test Matrix

## 1. Data Invariants
1. **Public Catalog Transparency**: Anyone (even unauthenticated customers) can view active products, packs, delivery zones, and store settings (`products`, `packs`, `deliveryZones`, `settings`).
2. **Catalog Mutation Lockdown**: Only an authenticated and verified vendor administrator whose UID exists in the `/admins/` collection can create, update, or delete products, packs, delivery zones, or store settings.
3. **Public Order Creation Guarantee**: Any client can create an order in `/orders/{orderId}` with status strictly initialized to `'enregistrée'`. The payload must conform to required fields (client names, phone numbers, delivery info, valid item lines array, valid numbers).
4. **Order Status & Mutation Lockdown**: Once placed, orders can only be updated or cancelled by the vendor administrator. Public clients cannot edit, cancel, list, or delete existing orders.
5. **No Blind Admin Creation**: An admin record `/admins/{adminId}` can only be created during initial bootstrapping if no admins exist or by the authenticated user matching `adminId` with valid metadata.
6. **Rate-Limiting & Spam Honeypot Invariants**: Order documents must not contain injected malware or unknown ghost fields.

## 2. The "Dirty Dozen" Payloads (Adversarial Attack Scenarios)

1. **Spoofed Order Cancellation (Public Client)**:
   - Target: `UPDATE /orders/ord_123`
   - Payload: `{"status": "annulée"}` without authentication.
   - Expected Result: `PERMISSION_DENIED`.

2. **Malicious Catalog Price Deflation (Unauthenticated Write)**:
   - Target: `UPDATE /products/prod_1`
   - Payload: `{"price": 100}` without authentication.
   - Expected Result: `PERMISSION_DENIED`.

3. **Ghost Field Injection in Order (Shadow Property)**:
   - Target: `CREATE /orders/ord_ghost`
   - Payload: Standard order fields + `{"isVendor": true, "freeDeliveryBypass": true}`.
   - Expected Result: `PERMISSION_DENIED`.

4. **Self-Promoted Admin Escalation**:
   - Target: `CREATE /admins/attacker_uid`
   - Payload: `{"uid": "attacker_uid", "role": "superadmin"}` by an unverified guest.
   - Expected Result: `PERMISSION_DENIED`.

5. **Blanket Order Scraping (Customer Listing All Orders)**:
   - Target: `LIST /orders`
   - Unauthenticated query to scrape customer phone numbers and addresses.
   - Expected Result: `PERMISSION_DENIED`.

6. **Order Creation with Corrupted Status**:
   - Target: `CREATE /orders/ord_invalid_status`
   - Payload: Valid order data but with `status: "delivered"` or `status: "annulée"`.
   - Expected Result: `PERMISSION_DENIED` (must be `enregistrée`).

7. **Negative or Overflow Price Injection on Product**:
   - Target: `CREATE /products/prod_neg`
   - Payload: Admin sets `price: -5000`.
   - Expected Result: `PERMISSION_DENIED` (price must be positive).

8. **Over-sized Document Denial-of-Wallet Attack**:
   - Target: `CREATE /orders/ord_spam`
   - Payload: `clientLastName` string with 10,000 characters.
   - Expected Result: `PERMISSION_DENIED` (string size guard `<= 100`).

9. **Customer Deleting Order History**:
   - Target: `DELETE /orders/ord_123`
   - Unauthenticated HTTP delete request.
   - Expected Result: `PERMISSION_DENIED`.

10. **Delivery Zone Price Hijack**:
    - Target: `UPDATE /deliveryZones/zone_akwa`
    - Payload: `{"price": 0}` from guest user.
    - Expected Result: `PERMISSION_DENIED`.

11. **Settings WhatsApp Override by Attacker**:
    - Target: `UPDATE /settings/shop`
    - Payload: `{"whatsappNumber": "+237699999999"}` from unauthenticated client.
    - Expected Result: `PERMISSION_DENIED`.

12. **Malformed Empty Item List in Order**:
    - Target: `CREATE /orders/ord_empty_items`
    - Payload: `items: []` with 0 elements.
    - Expected Result: `PERMISSION_DENIED` (must have at least 1 item).
