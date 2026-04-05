#!/bin/sh
# Baseline all existing migrations (safe to repeat — already-applied ones are ignored).
# This is needed when the DB was created via "db push" and has no migration history yet.
if [ -z "$DIRECT_URL" ] && [ -n "$DATABASE_URL" ]; then
  export DIRECT_URL="$DATABASE_URL"
fi

for migration in \
  20260328164321_init \
  20260328164931_add_users_auth \
  20260328183155_add_customers \
  20260328184147_add_projects \
  20260328190244_redesign_invoices \
  20260328190419_add_project_budget_mode \
  20260328191941_add_order_project_link \
  20260328193011_invoice_form_fields \
  20260328200250_add_user_account_profile \
  20260329090147_add_email_verification \
  20260329094917_add_received_documents \
  20260329101905_add_document_payment_fields \
  20260329123000_add_user_company_ic \
  20260401000100_add_admin_flag \
  20260405143000_add_stock_management \
  20260405200000_add_user_blocked
do
  npx prisma migrate resolve --applied "$migration" 2>/dev/null || true
done

npx prisma migrate deploy
npm run start
