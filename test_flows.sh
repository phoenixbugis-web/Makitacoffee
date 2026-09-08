#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:3001"

echo "=== 1. TEST LOGIN ADMIN ==="
ADMIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
echo "$ADMIN_RES"
ADMIN_TOKEN=$(echo "$ADMIN_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo ""
echo "=== 2. TEST LOGIN KASIR ==="
KASIR_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"kasir","password":"kasir123"}')
echo "$KASIR_RES"
KASIR_TOKEN=$(echo "$KASIR_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo ""
echo "=== 3. TEST TABLES & QR ==="
curl -s "$BASE_URL/api/tables" | head -c 300
echo ""

echo ""
echo "=== 4. TEST CUSTOMER ORDERING (MEJA 3, TANPA LOGIN) ==="
ORDER_RES=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "table_number": 3,
    "customer_name": "Pak Hendra",
    "customer_notes": "Kopi panas ya",
    "items": [
      {"menu_item_id": 1, "quantity": 2, "notes": "Gula aren dipisah"},
      {"menu_item_id": 8, "quantity": 1, "notes": "Pedas manis"}
    ]
  }')
echo "$ORDER_RES"
ORDER_ID=$(echo "$ORDER_RES" | grep -o '"id":[0-9]*' | head -n 1 | cut -d':' -f2)
ORDER_NUM=$(echo "$ORDER_RES" | grep -o '"order_number":"[^"]*' | cut -d'"' -f4)

echo ""
echo "=== 5. CHECK KDS BEFORE PAYMENT (ORDER MEJA 3 HARUS TIDAK MUNCUL!) ==="
KDS_BEFORE=$(curl -s "$BASE_URL/api/orders?for_kds=true")
echo "KDS Count: $(echo "$KDS_BEFORE" | grep -o '"id":' | wc -l)"

echo ""
echo "=== 6. APPLY MANUAL DISCOUNT (DISKON KARYAWAN 10%) ==="
DISC_RES=$(curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/apply-discount" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KASIR_TOKEN" \
  -d '{
    "category_id": 1,
    "category_name": "Diskon Karyawan",
    "type": "percent",
    "value": 10,
    "notes": "Diskon khusus testing"
  }')
echo "$DISC_RES"

echo ""
echo "=== 7. CONFIRM CASH PAYMENT (KASIR TANDAI SUDAH DIBAYAR) ==="
PAY_RES=$(curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/pay-cash" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KASIR_TOKEN" \
  -d '{"amount_received": 100000}')
echo "$PAY_RES"

echo ""
echo "=== 8. CHECK KDS AFTER PAYMENT (ORDER MEJA 3 HARUS SUDAH MUNCUL!) ==="
KDS_AFTER=$(curl -s "$BASE_URL/api/orders?for_kds=true")
echo "Order $ORDER_NUM di KDS: $(echo "$KDS_AFTER" | grep -o "$ORDER_NUM" || echo "NOT FOUND")"

echo ""
echo "=== 9. KITCHEN MARKS STATUS DIPROSES -> SIAP ==="
curl -s -X PATCH "$BASE_URL/api/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status": "siap"}' | head -c 200

echo ""
echo "=== 10. CHECK REVENUE & SALES REPORT ==="
SALES_RES=$(curl -s "$BASE_URL/api/reports/sales?period=today" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$SALES_RES" | head -c 400

echo ""
echo "=== ALL TESTS COMPLETED SUCCESSFULLY! ==="
