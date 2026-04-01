import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
import logoSrc from './assets/logo.png'
import './App.css'

type Language = 'en' | 'cz' | 'ger' | 'ru'
type Theme = 'light' | 'dark'
type MenuSection = 'invoices' | 'orders' | 'projects' | 'customers' | 'documents' | 'account' | 'taxes' | 'reports'
type SubmenuKey = 'new' | 'unpaid' | 'active' | 'history' | 'current' | 'contacts' | 'stored'
type PeriodRange = 'month' | 'quarter' | 'year' | 'all'
type CzechVatOption = '21' | '12' | '0'

type InvoiceItem = {
  id: number
  invoiceId: number
  projectId: number | null
  days: number | null
  amount: number
  createdAt: string
}

type Invoice = {
  id: number
  userId: number
  customerId: number | null
  customer: Customer | null
  status: 'draft' | 'unpaid' | 'paid'
  issueDate: string | null
  dueDate: string | null
  duePreset: '14' | '30' | 'custom' | null
  bankAccount: string | null
  taxDate: string | null
  constantSymbol: string | null
  specificSymbol: string | null
  variableSymbol: string | null
  invoiceText: string | null
  includeVat: boolean
  vatRate: number | null
  createdAt: string
  updatedAt: string
  items: InvoiceItem[]
}

type InvoiceDraftItem = {
  projectId: number | null
  days: string
  amount: string
}

type User = {
  id: number
  email: string
  displayName: string
  isAdmin: boolean
}

type AdminUserOption = {
  id: number
  email: string
  displayName: string
  isAdmin: boolean
}

type BankAccountOption = {
  id: string
  currency: string
  accountNumber: string
  label: string
}

type AccountProfile = {
  bankAccount: string
  bankAccounts: BankAccountOption[]
  companyIc: string
  logoDataUrl: string
  isVatPayer: boolean
  requiresControlStatement: boolean
}

type Customer = {
  id: number
  name: string
  ic: string | null
  dic: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  zip: string | null
  country: string | null
  createdAt: string
}

type CustomerForm = {
  name: string
  ic: string
  dic: string
  email: string
  phone: string
  address: string
  city: string
  zip: string
  country: string
}

type Order = {
  id: number
  userId: number
  customerId: number
  customer: Customer
  title: string
  code: string | null
  amount: number | null
  currency: string
  createdAt: string
  archived: boolean
  projectCount: number
  consumption: {
    mdUsed: number
    mdTotal: number
    budgetUsed: number
    budgetTotal: number
  }
}

type OrderForm = {
  customerId: number | null
  title: string
  code: string
  amount: string
  currency: string
}

const emptyOrderForm: OrderForm = {
  customerId: null,
  title: '',
  code: '',
  amount: '',
  currency: 'CZK',
}

const emptyCustomerForm: CustomerForm = {
  name: '',
  ic: '',
  dic: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zip: '',
  country: '',
}

type Project = {
  id: number
  userId: number
  orderId: number | null
  order: Order | null
  name: string
  pricingMode: 'md' | 'budget'
  days: number | null
  budget: number | null
  mdRate: number | null
  currency: string
  daysUsed: number
  budgetUsed: number
  archived: boolean
  createdAt: string
}

type ProjectForm = {
  orderId: number | null
  name: string
  pricingMode: 'md' | 'budget'
  days: string
  budget: string
  mdRate: string
  currency: string
}

type ReceivedDocument = {
  id: number
  userId: number
  status: 'draft' | 'approved'
  fileName: string
  sourceType: 'pdf' | 'image' | 'manual'
  supplierName: string | null
  supplierIc: string | null
  invoiceNumber: string | null
  bankAccount: string | null
  variableSymbol: string | null
  constantSymbol: string | null
  issueDate: string | null
  dueDate: string | null
  currency: string
  baseAmount: number | null
  vatAmount: number | null
  totalAmount: number | null
  vatRate: number | null
  extractedText: string | null
  createdAt: string
  updatedAt: string
}

type DocumentForm = {
  fileName: string
  sourceType: 'pdf' | 'image' | 'manual'
  supplierName: string
  supplierIc: string
  invoiceNumber: string
  bankAccount: string
  variableSymbol: string
  constantSymbol: string
  issueDate: string
  dueDate: string
  currency: string
  baseAmount: string
  vatAmount: string
  totalAmount: string
  vatRate: string
  extractedText: string
}

const emptyProjectForm: ProjectForm = {
  orderId: null,
  name: '',
  pricingMode: 'md',
  days: '',
  budget: '',
  mdRate: '',
  currency: 'CZK',
}

const emptyDocumentForm: DocumentForm = {
  fileName: '',
  sourceType: 'manual',
  supplierName: '',
  supplierIc: '',
  invoiceNumber: '',
  bankAccount: '',
  variableSymbol: '',
  constantSymbol: '',
  issueDate: '',
  dueDate: '',
  currency: 'CZK',
  baseAmount: '',
  vatAmount: '',
  totalAmount: '',
  vatRate: '',
  extractedText: '',
}

type Translation = {
  appName: string
  title: string
  subtitle: string
  invoices: string
  totalAmount: string
  newInvoice: string
  storedInvoices: string
  customer: string
  amount: string
  status: string
  createInvoice: string
  saving: string
  empty: string
  login: string
  register: string
  email: string
  password: string
  signIn: string
  signUp: string
  logout: string
  authSubtitle: string
  chooseLanguage: string
  chooseTheme: string
  themeLight: string
  themeDark: string
  registerSuccess: string
  authError: string
  userExists: string
  invalidRegisterPayload: string
  purchases: string
  orders: string
  projects: string
  customers: string
  documents: string
  settings: string
  accountSettings: string
  comingSoon: string
  newSubmenu: string
  unpaidSubmenu: string
  historySubmenu: string
  currentSubmenu: string
  contactsSubmenu: string
  storedSubmenu: string
  icLabel: string
  dicLabel: string
  companyName: string
  addressLabel: string
  cityLabel: string
  zipLabel: string
  countryLabel: string
  phoneLabel: string
  lookupByIC: string
  searching: string
  companyNotFound: string
  lookupError: string
  saveCustomer: string
  savingCustomer: string
  storedContacts: string
  contactsEmpty: string
  customerSaved: string
  projectName: string
  projectDays: string
  projectMDRate: string
  projectCurrency: string
  saveProject: string
  savingProject: string
  projectSaved: string
  storedProjects: string
  projectsEmpty: string
  issueDateLabel: string
  taxDateLabel: string
  dueDateLabel: string
  duePresetLabel: string
  dueIn14: string
  dueIn30: string
  dueCustom: string
  bankAccountLabel: string
  constantSymbolLabel: string
  specificSymbolLabel: string
  variableSymbolLabel: string
  invoiceTextLabel: string
  invoiceItemsLabel: string
  addItemLabel: string
  itemProjectLabel: string
  itemDaysLabel: string
  itemValueLabel: string
  includeVatLabel: string
  vatRateLabel: string
  deleteAction: string
  contactDeleted: string
  deleteContactConfirm: string
  contactChip: string
  currentChip: string
  archivedChip: string
  activeChip: string
  historyChip: string
  noActiveOrders: string
  noArchivedOrders: string
  projectsLinked: string
  noProjectsForSelectedCustomer: string
  consumptionDetailLabel: string
  mdConsumptionLabel: string
  budgetConsumptionLabel: string
  reports: string
  reportsOverview: string
  monthRevenueLabel: string
  receivablesLabel: string
  overdueLabel: string
  paidInvoicesLabel: string
  topProjectsByConsumption: string
  topOrdersByConsumption: string
  reportIdeas: string
  reportRangeLabel: string
  reportRangeMonth: string
  reportRangeQuarter: string
  reportRangeYear: string
  reportRangeAll: string
  exportCsv: string
  exportPdf: string
  periodRevenueLabel: string
  cashflowTimeline: string
  paidFlowLabel: string
  overdueFlowLabel: string
  taxes: string
  vatChoiceLabel: string
  vatChoiceStandard: string
  vatChoiceReduced: string
  vatChoiceZero: string
  taxesOverview: string
  taxBaseLabel: string
  vatAmountLabel: string
  taxPeriodLabel: string
  taxCurrentHint: string
  taxHistoryHint: string
  taxReturnSection: string
  controlStatementSection: string
  taxRateStandardSummary: string
  taxRateReducedSummary: string
  taxRateZeroSummary: string
  taxDocumentsLabel: string
  taxOutputLabel: string
  controlStatementHint: string
  controlStatementA4: string
  controlStatementA5: string
  controlStatementUnclassified: string
  taxDisclaimer: string
}

const translations: Record<Language, Translation> = {
  en: {
    appName: 'Invoicer',
    title: 'Invoicer',
    subtitle: '',
    invoices: 'Invoices',
    totalAmount: 'Total Amount',
    newInvoice: 'New Invoice',
    storedInvoices: 'Stored Invoices',
    customer: 'Customer',
    amount: 'Amount',
    status: 'Status',
    createInvoice: 'Create Invoice',
    saving: 'Saving...',
    empty: 'No invoices yet. Add one above.',
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signUp: 'Create Account',
    logout: 'Logout',
    authSubtitle: 'You must log in to use this app.',
    chooseLanguage: 'Language',
    chooseTheme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    registerSuccess: 'Account created. You are now signed in.',
    authError: 'Invalid email or password',
    userExists: 'This email is already registered',
    invalidRegisterPayload: 'Use a valid email and a password with at least 6 characters',
    purchases: 'Purchases',
    orders: 'Orders',
    projects: 'Projects',
    customers: 'Customers',
    documents: 'Documents',
    settings: 'Settings',
    accountSettings: 'Account settings',
    comingSoon: 'This section is ready for your next feature.',
    newSubmenu: 'New',
    unpaidSubmenu: 'Active',
    historySubmenu: 'History',
    currentSubmenu: 'Current',
    contactsSubmenu: 'Contacts',
    storedSubmenu: 'Stored',
    icLabel: 'IC / IČO',
    dicLabel: 'DIC / DIČ',
    companyName: 'Company Name',
    addressLabel: 'Street & Number',
    cityLabel: 'City',
    zipLabel: 'Postal Code',
    countryLabel: 'Country',
    phoneLabel: 'Phone',
    lookupByIC: 'Lookup',
    searching: 'Searchingâ€¦',
    companyNotFound: 'Company not found in ARES',
    lookupError: 'Lookup failed',
    saveCustomer: 'Save Customer',
    savingCustomer: 'Savingâ€¦',
    storedContacts: 'Stored Contacts',
    contactsEmpty: 'No contacts yet.',
    customerSaved: 'Customer saved.',
    projectName: 'Project Name',
    projectDays: 'Number of days (if applicable)',
    projectMDRate: 'MD Rate (man-day rate)',
    projectCurrency: 'Currency',
    saveProject: 'Save Project',
    savingProject: 'Saving...',
    projectSaved: 'Project saved.',
    storedProjects: 'Projects',
    projectsEmpty: 'No projects yet.',
    issueDateLabel: 'Issue Date',
    taxDateLabel: 'Tax Date (DUZP)',
    dueDateLabel: 'Due Date',
    duePresetLabel: 'Due Date Mode',
    dueIn14: '14 days',
    dueIn30: '30 days',
    dueCustom: 'Custom',
    bankAccountLabel: 'Bank Account',
    constantSymbolLabel: 'Constant Symbol',
    specificSymbolLabel: 'Specific Symbol',
    variableSymbolLabel: 'Variable Symbol',
    invoiceTextLabel: 'Invoice Text',
    invoiceItemsLabel: 'Items',
    addItemLabel: '+ Add Item',
    itemProjectLabel: 'Project',
    itemDaysLabel: 'Days',
    itemValueLabel: 'Value',
    includeVatLabel: 'Include VAT',
    vatRateLabel: 'VAT Rate (%)',
    deleteAction: '🗑',
    contactDeleted: 'Contact deleted.',
    deleteContactConfirm: 'Delete this contact? This cannot be undone.',
    contactChip: 'Contact',
    currentChip: 'Current',
    archivedChip: 'Archived',
    activeChip: 'Active',
    historyChip: 'History',
    noActiveOrders: 'No active orders.',
    noArchivedOrders: 'No archived orders yet.',
    projectsLinked: 'Projects linked',
    noProjectsForSelectedCustomer: 'No projects available for selected customer.',
    consumptionDetailLabel: 'Consumption details',
    mdConsumptionLabel: 'MD consumption',
    budgetConsumptionLabel: 'Budget consumption',
    reports: 'Reports',
    reportsOverview: 'Business Overview',
    monthRevenueLabel: 'Revenue this month',
    receivablesLabel: 'Open receivables',
    overdueLabel: 'Overdue invoices',
    paidInvoicesLabel: 'Paid invoices',
    topProjectsByConsumption: 'Top projects by consumption',
    topOrdersByConsumption: 'Top active orders by consumption',
    reportIdeas: 'Try next: monthly profitability, customer aging, team utilization.',
    reportRangeLabel: 'Period',
    reportRangeMonth: 'Last month',
    reportRangeQuarter: 'Last quarter',
    reportRangeYear: 'Last year',
    reportRangeAll: 'All time',
    exportCsv: 'Export CSV',
    exportPdf: 'Export PDF',
    periodRevenueLabel: 'Revenue in period',
    cashflowTimeline: 'Cashflow timeline',
    paidFlowLabel: 'Paid',
    overdueFlowLabel: 'Overdue',
    taxes: 'Taxes',
    vatChoiceLabel: 'VAT regime',
    vatChoiceStandard: 'Standard 21%',
    vatChoiceReduced: 'Reduced 12%',
    vatChoiceZero: 'Zero / exempt 0%',
    taxesOverview: 'Tax Overview',
    taxBaseLabel: 'Tax base',
    vatAmountLabel: 'VAT amount',
    taxPeriodLabel: 'Period',
    taxCurrentHint: 'Current period VAT overview from invoices in selected range.',
    taxHistoryHint: 'Historical VAT totals grouped by month.',
    taxReturnSection: 'VAT return basis',
    controlStatementSection: 'Control statement support',
    taxRateStandardSummary: 'Domestic taxable supply 21%',
    taxRateReducedSummary: 'Domestic taxable supply 12%',
    taxRateZeroSummary: 'Zero-rated / exempt supply',
    taxDocumentsLabel: 'Documents',
    taxOutputLabel: 'Output VAT',
    controlStatementHint: 'Support only. Exact control statement classification also depends on VAT payer status and supply type.',
    controlStatementA4: 'A.4 documents over 10,000 CZK incl. VAT with Czech VAT ID',
    controlStatementA5: 'A.5 documents up to 10,000 CZK incl. VAT with Czech VAT ID',
    controlStatementUnclassified: 'Unclassified or incomplete VAT ID data',
    taxDisclaimer: 'Indicative tax support, not a filing submission.',
  },
  cz: {
    appName: 'Fakturace',
    title: 'Invoicer',
    subtitle: '',
    invoices: 'Faktury',
    totalAmount: 'Celková částka',
    newInvoice: 'Nová faktura',
    storedInvoices: 'Uložené faktury',
    customer: 'Zákazník',
    amount: 'Částka',
    status: 'Stav',
    createInvoice: 'Vytvořit fakturu',
    saving: 'Ukládám...',
    empty: 'Zatím žádné faktury. Přidejte první.',
    login: 'Přihlášení',
    register: 'Registrace',
    email: 'E-mail',
    password: 'Heslo',
    signIn: 'Přihlásit se',
    signUp: 'Vytvořit účet',
    logout: 'Odhlásit',
    authSubtitle: 'Pro použití aplikace je nutné přihlášení.',
    chooseLanguage: 'Jazyk',
    chooseTheme: 'Motiv',
    themeLight: 'Světlý',
    themeDark: 'Tmavý',
    registerSuccess: 'Účet vytvořen. Jste přihlášeni.',
    authError: 'Neplatný e-mail nebo heslo',
    userExists: 'Tento e-mail je již registrován',
    invalidRegisterPayload: 'Použijte platný e-mail a heslo alespoň o 6 znacích',
    purchases: 'Nákupy',
    orders: 'Objednávky',
    projects: 'Projekty',
    customers: 'Zákazníci',
    documents: 'Doklady',
    settings: 'Nastavení',
    accountSettings: 'Nastavení účtu',
    comingSoon: 'Tato sekce je připravena pro další funkce.',
    newSubmenu: 'Nové',
    unpaidSubmenu: 'Aktivní',
    historySubmenu: 'Historie',
    currentSubmenu: 'Aktuální',
    contactsSubmenu: 'Kontakty',
    storedSubmenu: 'Uloženo',
    icLabel: 'IČO',
    dicLabel: 'DIČ',
    companyName: 'Název firmy',
    addressLabel: 'Ulice a číslo',
    cityLabel: 'Město',
    zipLabel: 'PSČ',
    countryLabel: 'Země',
    phoneLabel: 'Telefon',
    lookupByIC: 'Vyhledat',
    searching: 'Vyhledávámâ€¦',
    companyNotFound: 'Firma nenalezena v ARES',
    lookupError: 'Vyhledání selhalo',
    saveCustomer: 'Uložit zákazníka',
    savingCustomer: 'Ukládámâ€¦',
    storedContacts: 'Uložené kontakty',
    contactsEmpty: 'Zatím žádné kontakty.',
    customerSaved: 'Zákazník uložen.',
    projectName: 'Název projektu',
    projectDays: 'Počet dní (pokud je to relevantní)',
    projectMDRate: 'Sazba MD (sazba člověko-dne)',
    projectCurrency: 'Měna',
    saveProject: 'Uložit projekt',
    savingProject: 'Ukládám...',
    projectSaved: 'Projekt uložen.',
    storedProjects: 'Projekty',
    projectsEmpty: 'Zatím žádné projekty.',
    issueDateLabel: 'Datum vystavení',
    taxDateLabel: 'DUZP',
    dueDateLabel: 'Datum splatnosti',
    duePresetLabel: 'Splatnost',
    dueIn14: '14 dní',
    dueIn30: '30 dní',
    dueCustom: 'Vlastní',
    bankAccountLabel: 'Bankovní účet',
    constantSymbolLabel: 'Konstantní symbol',
    specificSymbolLabel: 'Specifický symbol',
    variableSymbolLabel: 'Variabilní symbol',
    invoiceTextLabel: 'Text faktury',
    invoiceItemsLabel: 'Položky',
    addItemLabel: '+ Přidat položku',
    itemProjectLabel: 'Projekt',
    itemDaysLabel: 'Počet MD',
    itemValueLabel: 'Hodnota k fakturaci',
    includeVatLabel: 'Včetně DPH',
    vatRateLabel: 'Sazba DPH (%)',
    deleteAction: '🗑',
    contactDeleted: 'Kontakt byl smazán.',
    deleteContactConfirm: 'Smazat tento kontakt? Tuto akci nelze vrátit.',
    contactChip: 'Kontakt',
    currentChip: 'Aktuální',
    archivedChip: 'Archivováno',
    activeChip: 'Aktivní',
    historyChip: 'Historie',
    noActiveOrders: 'Žádné aktivní objednávky.',
    noArchivedOrders: 'Zatím žádné archivované objednávky.',
    projectsLinked: 'Navázané projekty',
    noProjectsForSelectedCustomer: 'Pro vybraného zákazníka nejsou dostupné žádné projekty.',
    consumptionDetailLabel: 'Detail čerpání',
    mdConsumptionLabel: 'Čerpání MD',
    budgetConsumptionLabel: 'Čerpání rozpočtu',
    reports: 'Reporty',
    reportsOverview: 'Přehled podnikání',
    monthRevenueLabel: 'Výnos tento měsíc',
    receivablesLabel: 'Otevřené pohledávky',
    overdueLabel: 'Faktury po splatnosti',
    paidInvoicesLabel: 'Uhrazené faktury',
    topProjectsByConsumption: 'Top projekty podle čerpání',
    topOrdersByConsumption: 'Top aktivní objednávky podle čerpání',
    reportIdeas: 'Zkuste dál: měsíční ziskovost, stárnutí pohledávek, vytížení týmu.',
    reportRangeLabel: 'Období',
    reportRangeMonth: 'Poslední měsíc',
    reportRangeQuarter: 'Poslední kvartál',
    reportRangeYear: 'Poslední rok',
    reportRangeAll: 'Celá historie',
    exportCsv: 'Export CSV',
    exportPdf: 'Export PDF',
    periodRevenueLabel: 'Výnos v období',
    cashflowTimeline: 'Časová osa cashflow',
    paidFlowLabel: 'Uhrazeno',
    overdueFlowLabel: 'Po splatnosti',
    taxes: 'Daně',
    vatChoiceLabel: 'Režim DPH',
    vatChoiceStandard: 'Základní 21 %',
    vatChoiceReduced: 'Snížená 12 %',
    vatChoiceZero: 'Nulová / osvobozeno 0 %',
    taxesOverview: 'Přehled daní',
    taxBaseLabel: 'Základ daně',
    vatAmountLabel: 'DPH',
    taxPeriodLabel: 'Období',
    taxCurrentHint: 'Přehled DPH za aktuální období z faktur ve zvoleném rozsahu.',
    taxHistoryHint: 'Historické součty DPH seskupené po měsících.',
    taxReturnSection: 'Podklady pro přiznání k DPH',
    controlStatementSection: 'Podklady pro kontrolní hlášení',
    taxRateStandardSummary: 'Tuzemské zdanitelné plnění 21 %',
    taxRateReducedSummary: 'Tuzemské zdanitelné plnění 12 %',
    taxRateZeroSummary: 'Plnění s nulovou sazbou / osvobozené',
    taxDocumentsLabel: 'Doklady',
    taxOutputLabel: 'DPH na výstupu',
    controlStatementHint: 'Pouze podpůrný přehled. Přesné zařazení do kontrolního hlášení závisí i na plátcovství a typu plnění.',
    controlStatementA4: 'A.4 doklady nad 10 000 Kč včetně DPH s českým DIČ odběratele',
    controlStatementA5: 'A.5 doklady do 10 000 Kč včetně DPH s českým DIČ odběratele',
    controlStatementUnclassified: 'Nezařazené nebo neúplné DIČ údaje',
    taxDisclaimer: 'Orientační daňový podklad, ne podání na úřad.',
  },
  ger: {
    appName: 'RechnungApp',
    title: 'Invoicer',
    subtitle: '',
    invoices: 'Rechnungen',
    totalAmount: 'Gesamtbetrag',
    newInvoice: 'Neue Rechnung',
    storedInvoices: 'Gespeicherte Rechnungen',
    customer: 'Kunde',
    amount: 'Betrag',
    status: 'Status',
    createInvoice: 'Rechnung Erstellen',
    saving: 'Speichern...',
    empty: 'Noch keine Rechnungen vorhanden.',
    login: 'Anmeldung',
    register: 'Registrierung',
    email: 'E-Mail',
    password: 'Passwort',
    signIn: 'Einloggen',
    signUp: 'Konto erstellen',
    logout: 'Abmelden',
    authSubtitle: 'Sie müssen sich anmelden, um die App zu nutzen.',
    chooseLanguage: 'Sprache',
    chooseTheme: 'Design',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    registerSuccess: 'Konto erstellt. Sie sind jetzt angemeldet.',
    authError: 'Ungültige E-Mail oder Passwort',
    userExists: 'Diese E-Mail ist bereits registriert',
    invalidRegisterPayload: 'Verwenden Sie eine gültige E-Mail und ein Passwort mit mindestens 6 Zeichen',
    purchases: 'Einkäufe',
    orders: 'Bestellungen',
    projects: 'Projekte',
    customers: 'Kunden',
    documents: 'Belege',
    settings: 'Einstellungen',
    accountSettings: 'Kontoeinstellungen',
    comingSoon: 'Dieser Bereich ist bereit für Ihr nächstes Feature.',
    newSubmenu: 'Neu',
    unpaidSubmenu: 'Aktiv',
    historySubmenu: 'Verlauf',
    currentSubmenu: 'Aktuell',
    contactsSubmenu: 'Kontakte',
    storedSubmenu: 'Gespeichert',
    icLabel: 'Firmennummer (IC)',
    dicLabel: 'Steuer-ID (DIC)',
    companyName: 'Firmenname',
    addressLabel: 'Straße und Hausnummer',
    cityLabel: 'Stadt',
    zipLabel: 'Postleitzahl',
    countryLabel: 'Land',
    phoneLabel: 'Telefon',
    lookupByIC: 'Suchen',
    searching: 'Suche läuftâ€¦',
    companyNotFound: 'Firma nicht gefunden',
    lookupError: 'Suche fehlgeschlagen',
    saveCustomer: 'Kunden speichern',
    savingCustomer: 'Speichernâ€¦',
    storedContacts: 'Gespeicherte Kontakte',
    contactsEmpty: 'Noch keine Kontakte.',
    customerSaved: 'Kunde gespeichert.',
    projectName: 'Projektname',
    projectDays: 'Projektdauer (Tage)',
    projectMDRate: 'MD-Satz (Manntag-Satz)',
    projectCurrency: 'Währung',
    saveProject: 'Projekt speichern',
    savingProject: 'Speichern...',
    projectSaved: 'Projekt gespeichert.',
    storedProjects: 'Projekte',
    projectsEmpty: 'Noch keine Projekte.',
    issueDateLabel: 'Ausstellungsdatum',
    taxDateLabel: 'Steuerdatum (DUZP)',
    dueDateLabel: 'Fälligkeitsdatum',
    duePresetLabel: 'Fälligkeit',
    dueIn14: '14 Tage',
    dueIn30: '30 Tage',
    dueCustom: 'Benutzerdefiniert',
    bankAccountLabel: 'Bankkonto',
    constantSymbolLabel: 'Konstantes Symbol',
    specificSymbolLabel: 'Spezifisches Symbol',
    variableSymbolLabel: 'Variables Symbol',
    invoiceTextLabel: 'Rechnungstext',
    invoiceItemsLabel: 'Positionen',
    addItemLabel: '+ Position hinzufügen',
    itemProjectLabel: 'Projekt',
    itemDaysLabel: 'Tage',
    itemValueLabel: 'Rechnungswert',
    includeVatLabel: 'MwSt. einschließen',
    vatRateLabel: 'MwSt.-Satz (%)',
    deleteAction: '🗑',
    contactDeleted: 'Kontakt gelöscht.',
    deleteContactConfirm: 'Diesen Kontakt löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    contactChip: 'Kontakt',
    currentChip: 'Aktuell',
    archivedChip: 'Archiviert',
    activeChip: 'Aktiv',
    historyChip: 'Verlauf',
    noActiveOrders: 'Keine aktiven Bestellungen.',
    noArchivedOrders: 'Noch keine archivierten Bestellungen.',
    projectsLinked: 'Verknüpfte Projekte',
    noProjectsForSelectedCustomer: 'Für den ausgewählten Kunden sind keine Projekte verfügbar.',
    consumptionDetailLabel: 'Verbrauchsdetails',
    mdConsumptionLabel: 'MD-Verbrauch',
    budgetConsumptionLabel: 'Budgetverbrauch',
    reports: 'Berichte',
    reportsOverview: 'Geschäftsübersicht',
    monthRevenueLabel: 'Umsatz diesen Monat',
    receivablesLabel: 'Offene Forderungen',
    overdueLabel: 'Überfällige Rechnungen',
    paidInvoicesLabel: 'Bezahlte Rechnungen',
    topProjectsByConsumption: 'Top-Projekte nach Verbrauch',
    topOrdersByConsumption: 'Top aktive Aufträge nach Verbrauch',
    reportIdeas: 'Als Nächstes: monatliche Profitabilität, Forderungsalter, Teamauslastung.',
    reportRangeLabel: 'Zeitraum',
    reportRangeMonth: 'Letzter Monat',
    reportRangeQuarter: 'Letztes Quartal',
    reportRangeYear: 'Letztes Jahr',
    reportRangeAll: 'Gesamte Historie',
    exportCsv: 'CSV exportieren',
    exportPdf: 'PDF exportieren',
    periodRevenueLabel: 'Umsatz im Zeitraum',
    cashflowTimeline: 'Cashflow-Zeitachse',
    paidFlowLabel: 'Bezahlt',
    overdueFlowLabel: 'Überfällig',
    taxes: 'Steuern',
    vatChoiceLabel: 'MwSt.-Regime',
    vatChoiceStandard: 'Standard 21 %',
    vatChoiceReduced: 'Ermäßigt 12 %',
    vatChoiceZero: 'Null / befreit 0 %',
    taxesOverview: 'Steuerübersicht',
    taxBaseLabel: 'Steuerbasis',
    vatAmountLabel: 'MwSt.',
    taxPeriodLabel: 'Zeitraum',
    taxCurrentHint: 'Aktuelle MwSt.-Übersicht aus Rechnungen im gewählten Zeitraum.',
    taxHistoryHint: 'Historische MwSt.-Summen nach Monaten gruppiert.',
    taxReturnSection: 'Grundlage für die MwSt.-Erklärung',
    controlStatementSection: 'Unterlagen für Kontrollmeldung',
    taxRateStandardSummary: 'Inländische steuerpflichtige Leistung 21 %',
    taxRateReducedSummary: 'Inländische steuerpflichtige Leistung 12 %',
    taxRateZeroSummary: 'Nullsatz / steuerbefreite Leistung',
    taxDocumentsLabel: 'Belege',
    taxOutputLabel: 'Ausgangs-MwSt.',
    controlStatementHint: 'Nur Hilfsübersicht. Die genaue Einordnung hängt auch von Steuerstatus und Leistungsart ab.',
    controlStatementA4: 'A.4 Belege über 10.000 CZK inkl. MwSt. mit tschechischer USt-IdNr.',
    controlStatementA5: 'A.5 Belege bis 10.000 CZK inkl. MwSt. mit tschechischer USt-IdNr.',
    controlStatementUnclassified: 'Nicht klassifiziert oder unvollständige USt-IdNr.-Daten',
    taxDisclaimer: 'Orientierende Steuerunterlage, keine amtliche Einreichung.',
  },
  ru: {
    appName: 'Инвойсер',
    title: 'Invoicer',
    subtitle: '',
    invoices: 'Счета',
    totalAmount: 'Общая сумма',
    newInvoice: 'Новый счет',
    storedInvoices: 'Сохраненные счета',
    customer: 'Клиент',
    amount: 'Сумма',
    status: 'Статус',
    createInvoice: 'Создать счет',
    saving: 'Сохранение...',
    empty: 'Счетов пока нет. Добавьте первый.',
    login: 'Вход',
    register: 'Регистрация',
    email: 'E-mail',
    password: 'Пароль',
    signIn: 'Войти',
    signUp: 'Создать аккаунт',
    logout: 'Выйти',
    authSubtitle: 'Для работы с приложением нужен вход.',
    chooseLanguage: 'Язык',
    chooseTheme: 'Тема',
    themeLight: 'Светлая',
    themeDark: 'Темная',
    registerSuccess: 'Аккаунт создан. Вы вошли в систему.',
    authError: 'Неверный e-mail или пароль',
    userExists: 'Этот e-mail уже зарегистрирован',
    invalidRegisterPayload: 'Используйте корректный e-mail и пароль не короче 6 символов',
    purchases: 'Покупки',
    orders: 'Заказы',
    projects: 'Проекты',
    customers: 'Клиенты',
    documents: 'Документы',
    settings: 'Настройки',
    accountSettings: 'Настройки аккаунта',
    comingSoon: 'Этот раздел готов для следующей функции.',
    newSubmenu: 'Новые',
    unpaidSubmenu: 'Активные',
    historySubmenu: 'История',
    currentSubmenu: 'Текущие',
    contactsSubmenu: 'Контакты',
    storedSubmenu: 'Сохраненные',
    icLabel: 'IC (рег. номер)',
    dicLabel: 'DIC (НДС номер)',
    companyName: 'Название компании',
    addressLabel: 'Улица и номер',
    cityLabel: 'Город',
    zipLabel: 'Почтовый индекс',
    countryLabel: 'Страна',
    phoneLabel: 'Телефон',
    lookupByIC: 'Найти',
    searching: 'Поискâ€¦',
    companyNotFound: 'Компания не найдена',
    lookupError: 'Ошибка поиска',
    saveCustomer: 'Сохранить клиента',
    savingCustomer: 'Сохранениеâ€¦',
    storedContacts: 'Сохранённые контакты',
    contactsEmpty: 'Контактов пока нет.',
    customerSaved: 'Клиент сохранён.',
    projectName: 'Название проекта',
    projectDays: 'Количество дней',
    projectMDRate: 'Ставка МД (человеко-день)',
    projectCurrency: 'Валюта',
    saveProject: 'Сохранить проект',
    savingProject: 'Сохранение...',
    projectSaved: 'Проект сохранён.',
    storedProjects: 'Проекты',
    projectsEmpty: 'Проектов пока нет.',
    issueDateLabel: 'Дата выставления',
    taxDateLabel: 'Дата налога (DUZP)',
    dueDateLabel: 'Дата оплаты',
    duePresetLabel: 'Срок оплаты',
    dueIn14: '14 дней',
    dueIn30: '30 дней',
    dueCustom: 'Своя дата',
    bankAccountLabel: 'Банковский счет',
    constantSymbolLabel: 'Постоянный символ',
    specificSymbolLabel: 'Специфический символ',
    variableSymbolLabel: 'Переменный символ',
    invoiceTextLabel: 'Текст счета',
    invoiceItemsLabel: 'Позиции',
    addItemLabel: '+ Добавить позицию',
    itemProjectLabel: 'Проект',
    itemDaysLabel: 'Дни',
    itemValueLabel: 'Сумма к выставлению',
    includeVatLabel: 'Включить НДС',
    vatRateLabel: 'Ставка НДС (%)',
    deleteAction: '🗑',
    contactDeleted: 'Контакт удален.',
    deleteContactConfirm: 'Удалить этот контакт? Действие нельзя отменить.',
    contactChip: 'Контакт',
    currentChip: 'Текущий',
    archivedChip: 'Архив',
    activeChip: 'Активный',
    historyChip: 'История',
    noActiveOrders: 'Нет активных заказов.',
    noArchivedOrders: 'Архивных заказов пока нет.',
    projectsLinked: 'Связанные проекты',
    noProjectsForSelectedCustomer: 'Для выбранного клиента нет доступных проектов.',
    consumptionDetailLabel: 'Детали расхода',
    mdConsumptionLabel: 'Расход MD',
    budgetConsumptionLabel: 'Расход бюджета',
    reports: 'Отчеты',
    reportsOverview: 'Обзор бизнеса',
    monthRevenueLabel: 'Выручка за месяц',
    receivablesLabel: 'Открытая дебиторка',
    overdueLabel: 'Просроченные счета',
    paidInvoicesLabel: 'Оплаченные счета',
    topProjectsByConsumption: 'Топ проектов по расходу',
    topOrdersByConsumption: 'Топ активных заказов по расходу',
    reportIdeas: 'Дальше: месячная прибыльность, aging дебиторки, загрузка команды.',
    reportRangeLabel: 'Период',
    reportRangeMonth: 'Последний месяц',
    reportRangeQuarter: 'Последний квартал',
    reportRangeYear: 'Последний год',
    reportRangeAll: 'Вся история',
    exportCsv: 'Экспорт CSV',
    exportPdf: 'Экспорт PDF',
    periodRevenueLabel: 'Выручка за период',
    cashflowTimeline: 'Таймлайн cashflow',
    paidFlowLabel: 'Оплачено',
    overdueFlowLabel: 'Просрочено',
    taxes: 'Налоги',
    vatChoiceLabel: 'Режим НДС',
    vatChoiceStandard: 'Стандартный 21%',
    vatChoiceReduced: 'Пониженный 12%',
    vatChoiceZero: 'Нулевой / без НДС 0%',
    taxesOverview: 'Обзор налогов',
    taxBaseLabel: 'Налоговая база',
    vatAmountLabel: 'НДС',
    taxPeriodLabel: 'Период',
    taxCurrentHint: 'Текущий обзор НДС по счетам в выбранном диапазоне.',
    taxHistoryHint: 'Исторические суммы НДС с группировкой по месяцам.',
    taxReturnSection: 'Основа для декларации по НДС',
    controlStatementSection: 'Данные для контрольного отчета',
    taxRateStandardSummary: 'Внутреннее налогооблагаемое поставление 21%',
    taxRateReducedSummary: 'Внутреннее налогооблагаемое поставление 12%',
    taxRateZeroSummary: 'Нулевая ставка / освобождено',
    taxDocumentsLabel: 'Документы',
    taxOutputLabel: 'Выходной НДС',
    controlStatementHint: 'Только вспомогательный обзор. Точная классификация зависит также от статуса плательщика и типа поставки.',
    controlStatementA4: 'A.4 документы свыше 10 000 CZK с НДС и чешским VAT ID клиента',
    controlStatementA5: 'A.5 документы до 10 000 CZK с НДС и чешским VAT ID клиента',
    controlStatementUnclassified: 'Не классифицировано или неполные VAT ID данные',
    taxDisclaimer: 'Ориентировочная налоговая сводка, не официальная подача.',
  },
}

const statusLabels: Record<Language, Record<Invoice['status'], string>> = {
  en: { draft: 'Draft', unpaid: 'Active', paid: 'Paid' },
  cz: { draft: 'Návrh', unpaid: 'Aktivní', paid: 'Zaplaceno' },
  ger: { draft: 'Entwurf', unpaid: 'Aktiv', paid: 'Bezahlt' },
  ru: { draft: 'Черновик', unpaid: 'Активные', paid: 'Оплачен' },
}

const languageLabels: Record<Language, string> = {
  en: 'EN',
  cz: 'CZ',
  ger: 'GER',
  ru: 'RU',
}

const qrApiBaseUrl = (import.meta.env.VITE_QR_API_BASE_URL as string | undefined) ?? 'https://api.qrserver.com/v1/create-qr-code/'
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''
const inferredApiBaseUrl =
  typeof window !== 'undefined' && window.location.hostname === 'invoicer.primetech.cz'
    ? 'https://invoicer-api-8qkl.onrender.com'
    : ''
const apiBaseUrl = configuredApiBaseUrl || inferredApiBaseUrl
const lightLogoPath = '/logo_light.png'
const darkLogoPath = '/logo_dark.png'
const defaultFaviconPath = '/favicon.png'

function apiUrl(path: string): string {
  return apiBaseUrl ? `${apiBaseUrl}${path}` : path
}

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language')
    return saved === 'en' || saved === 'cz' || saved === 'ger' || saved === 'ru'
      ? saved
      : 'en'
  })
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark' ? 'dark' : 'light'
  })
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [token, setToken] = useState<string>(() => localStorage.getItem('token') ?? '')
  const [user, setUser] = useState<User | null>(null)
  const [adminUsers, setAdminUsers] = useState<AdminUserOption[]>([])
  const [selectedAdminUserId, setSelectedAdminUserId] = useState('')
  const [activeSection, setActiveSection] = useState<MenuSection>('invoices')
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuKey>('new')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false)
  const [resetEmail, setResetEmail] = useState(() => new URLSearchParams(window.location.search).get('email') ?? '')
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [authDevHint, setAuthDevHint] = useState('')

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'unpaid' | 'paid'>('draft')
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: null as number | null,
    issueDate: '',
    taxDate: '',
    duePreset: '14' as '14' | '30' | 'custom',
    dueDateCustom: '',
    bankAccount: '',
    constantSymbol: '',
    specificSymbol: '',
    variableSymbol: '',
    invoiceText: '',
    includeVat: true,
    vatRate: '21' as CzechVatOption,
  })
  const [invoiceItems, setInvoiceItems] = useState<InvoiceDraftItem[]>([])
  const [invoiceSaving, setInvoiceSaving] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [aresLookup, setAresLookup] = useState('')
  const [aresLoading, setAresLoading] = useState(false)
  const [aresMessage, setAresMessage] = useState('')
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [customerSaveMsg, setCustomerSaveMsg] = useState('')

  const [orders, setOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrderForm)
  const [orderSaving, setOrderSaving] = useState(false)
  const [orderSaveMsg, setOrderSaveMsg] = useState('')

  const [projects, setProjects] = useState<Project[]>([])
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm)
  const [projectSaving, setProjectSaving] = useState(false)
  const [projectSaveMsg, setProjectSaveMsg] = useState('')
  const [reportInvoices, setReportInvoices] = useState<Invoice[]>([])
  const [reportOrders, setReportOrders] = useState<Order[]>([])
  const [reportProjects, setReportProjects] = useState<Project[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportRange, setReportRange] = useState<PeriodRange>('month')
  const [overviewRange, setOverviewRange] = useState<PeriodRange>('all')

  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null)
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null)
  const [previewProject, setPreviewProject] = useState<Project | null>(null)
  const [previewDocument, setPreviewDocument] = useState<ReceivedDocument | null>(null)
  const [accountProfile, setAccountProfile] = useState<AccountProfile>({
    bankAccount: '',
    bankAccounts: [],
    companyIc: '',
    logoDataUrl: '',
    isVatPayer: false,
    requiresControlStatement: false,
  })
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountMessage, setAccountMessage] = useState('')
  const [documents, setDocuments] = useState<ReceivedDocument[]>([])
  const [documentForm, setDocumentForm] = useState<DocumentForm>(emptyDocumentForm)
  const [documentSaving, setDocumentSaving] = useState(false)
  const [documentExtracting, setDocumentExtracting] = useState(false)
  const [documentMessage, setDocumentMessage] = useState('')
  const [documentAutofilledFields, setDocumentAutofilledFields] = useState<Array<keyof DocumentForm>>([])
  const [documentMatchedCustomer, setDocumentMatchedCustomer] = useState<Customer | null>(null)
  const [documentUploadPreviewUrl, setDocumentUploadPreviewUrl] = useState('')
  const [documentUploadPreviewType, setDocumentUploadPreviewType] = useState<'pdf' | 'image' | null>(null)

  const t = translations[language]
  const isDarkTheme = theme === 'dark'
  const brandLogoSrc = isDarkTheme ? darkLogoPath : lightLogoPath
  const isResetPasswordMode = (window.location.pathname.includes('reset-password') || Boolean(resetToken)) && !token

  const authUiText = useMemo(() => {
    if (language === 'cz') {
      return {
        registerNeedsVerification: 'Účet byl vytvořen. Zadejte 6místný kód z e-mailu.',
        emailNotVerified: 'E-mail není ověřen. Nejprve zadejte ověřovací kód.',
        verifyTitle: 'Ověření e-mailu',
        verifySubtitle: 'Zadejte kód, který jsme poslali na:',
        verificationCodeLabel: 'Ověřovací kód',
        verifyAction: 'Ověřit a přihlásit',
        resendCode: 'Poslat nový kód',
        changeEmail: 'Změnit e-mail',
        forgotPassword: 'Zapomenuté heslo?',
        forgotSubtitle: 'Pošleme vám odkaz pro nastavení nového hesla.',
        sendResetLink: 'Poslat reset odkaz',
        backToLogin: 'Zpět na přihlášení',
        resetTitle: 'Nastavení nového hesla',
        resetSubtitle: 'Vyplňte e-mail, token a nové heslo.',
        resetTokenLabel: 'Reset token',
        newPasswordLabel: 'Nové heslo',
        resetPasswordAction: 'Uložit nové heslo',
        resetSuccess: 'Heslo bylo změněno. Jste přihlášeni.',
        devCodePrefix: 'Dev kód:',
        continueWithGoogle: 'Pokračovat přes Google',
        googleLoginFailed: 'Google přihlášení selhalo',
      }
    }

    return {
      registerNeedsVerification: 'Account created. Enter the 6-digit code from your email.',
      emailNotVerified: 'Email is not verified yet. Enter your verification code first.',
      verifyTitle: 'Verify your email',
      verifySubtitle: 'Enter the code we sent to:',
      verificationCodeLabel: 'Verification code',
      verifyAction: 'Verify and sign in',
      resendCode: 'Resend code',
      changeEmail: 'Change email',
      forgotPassword: 'Forgot password?',
      forgotSubtitle: 'We will send you a link to reset your password.',
      sendResetLink: 'Send reset link',
      backToLogin: 'Back to sign in',
      resetTitle: 'Set a new password',
      resetSubtitle: 'Fill in your email, token, and new password.',
      resetTokenLabel: 'Reset token',
      newPasswordLabel: 'New password',
      resetPasswordAction: 'Save new password',
      resetSuccess: 'Password changed. You are now signed in.',
      devCodePrefix: 'Dev code:',
      continueWithGoogle:
        language === 'ger'
          ? 'Mit Google fortfahren'
          : language === 'ru'
            ? 'Продолжить через Google'
            : 'Continue with Google',
      googleLoginFailed:
        language === 'ger'
          ? 'Google-Anmeldung fehlgeschlagen'
          : language === 'ru'
            ? 'Не удалось войти через Google'
            : 'Google login failed',
    }
  }, [language])

  const documentsUiText = useMemo(() => {
    if (language === 'cz') {
      return {
        uploadLabel: 'Nahrát PDF / obrázek',
        extracting: 'Probíhá extrakce textu...',
        dropHint: 'Nahrajte soubor a zkontrolujte vytažené hodnoty.',
        matchedSupplier: 'Spárovaný dodavatel v kontaktech:',
        fileName: 'Název souboru',
        supplier: 'Dodavatel',
        supplierIc: 'IČ dodavatele',
        invoiceNo: 'Číslo faktury',
        bankAccount: 'Bankovní účet',
        variableSymbol: 'Variabilní symbol',
        constantSymbol: 'Konstantní symbol',
        issueDate: 'Datum vystavení',
        dueDate: 'Datum splatnosti',
        currency: 'Měna',
        vatRate: 'Sazba DPH (%)',
        baseAmount: 'Základ',
        vatAmount: 'DPH',
        totalAmount: 'Celkem',
        extractedText: 'Extrahovaný text',
        autofillHint: 'Zelené pole = doplněno automaticky z OCR. Ruční úprava pole změní na manuální.',
        saveDraft: 'Uložit rozpracované',
        approveStore: 'Schválit a uložit',
        storedEmpty: 'Zatím žádné uložené doklady.',
        previewTitle: 'Náhled dokladu',
        uploadPreviewHint: 'Nahrajte PDF nebo obrázek, náhled se zobrazí zde.',
        extractedSuccess: 'Text extrahován. Zkontrolujte a uložte doklad.',
        noText: 'Text nebyl detekován. Pole můžete vyplnit ručně.',
        extractionFailedPrefix: 'Extrakce selhala',
        savedDraftMsg: 'Doklad uložen jako rozpracovaný.',
        savedApprovedMsg: 'Doklad uložen do historie.',
        deleteDocConfirm: 'Smazat tento doklad? Tuto akci nelze vrátit.',
        deletedMsg: 'Doklad byl smazán.',
      }
    }
    if (language === 'ger') {
      return {
        uploadLabel: 'PDF / Bild hochladen',
        extracting: 'Text wird extrahiert...',
        dropHint: 'Datei hochladen und erkannte Werte prüfen.',
        matchedSupplier: 'Zugeordneter Lieferant aus Kontakten:',
        fileName: 'Dateiname',
        supplier: 'Lieferant',
        supplierIc: 'Lieferanten-IC',
        invoiceNo: 'Rechnungsnummer',
        bankAccount: 'Bankkonto',
        variableSymbol: 'Variables Symbol',
        constantSymbol: 'Konstantes Symbol',
        issueDate: 'Ausstellungsdatum',
        dueDate: 'Fälligkeitsdatum',
        currency: 'Währung',
        vatRate: 'MwSt. (%)',
        baseAmount: 'Basis',
        vatAmount: 'MwSt.',
        totalAmount: 'Gesamt',
        extractedText: 'Extrahierter Text',
        autofillHint: 'Grün = automatisch aus OCR ausgefüllt. Manuelle Änderung markiert Feld als manuell.',
        saveDraft: 'Als Entwurf speichern',
        approveStore: 'Freigeben und speichern',
        storedEmpty: 'Noch keine gespeicherten Belege.',
        previewTitle: 'Belegvorschau',
        uploadPreviewHint: 'Laden Sie ein PDF oder Bild hoch, die Vorschau erscheint hier.',
        extractedSuccess: 'Text extrahiert. Bitte prüfen und Beleg speichern.',
        noText: 'Kein Text erkannt. Felder können manuell ausgefüllt werden.',
        extractionFailedPrefix: 'Extraktion fehlgeschlagen',
        savedDraftMsg: 'Beleg als Entwurf gespeichert.',
        savedApprovedMsg: 'Beleg in Verlauf gespeichert.',
        deleteDocConfirm: 'Diesen Beleg löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
        deletedMsg: 'Beleg gelöscht.',
      }
    }
    if (language === 'ru') {
      return {
        uploadLabel: 'Загрузить PDF / изображение',
        extracting: 'Извлекаем текст...',
        dropHint: 'Загрузите файл и проверьте извлеченные поля.',
        matchedSupplier: 'Найден поставщик в контактах:',
        fileName: 'Имя файла',
        supplier: 'Поставщик',
        supplierIc: 'IČ поставщика',
        invoiceNo: 'Номер счета',
        bankAccount: 'Банковский счет',
        variableSymbol: 'Переменный символ',
        constantSymbol: 'Постоянный символ',
        issueDate: 'Дата выставления',
        dueDate: 'Срок оплаты',
        currency: 'Валюта',
        vatRate: 'НДС (%)',
        baseAmount: 'База',
        vatAmount: 'НДС',
        totalAmount: 'Итого',
        extractedText: 'Извлеченный текст',
        autofillHint: 'Зеленое поле = заполнено OCR автоматически. После ручного редактирования поле становится ручным.',
        saveDraft: 'Сохранить черновик',
        approveStore: 'Подтвердить и сохранить',
        storedEmpty: 'Сохраненных документов пока нет.',
        previewTitle: 'Предпросмотр документа',
        uploadPreviewHint: 'Загрузите PDF или изображение, предпросмотр появится здесь.',
        extractedSuccess: 'Текст извлечен. Проверьте и сохраните документ.',
        noText: 'Текст не найден. Поля можно заполнить вручную.',
        extractionFailedPrefix: 'Ошибка извлечения',
        savedDraftMsg: 'Документ сохранен как черновик.',
        savedApprovedMsg: 'Документ сохранен в истории.',
        deleteDocConfirm: 'Удалить этот документ? Действие нельзя отменить.',
        deletedMsg: 'Документ удален.',
      }
    }
    return {
      uploadLabel: 'Upload PDF / image',
      extracting: 'Extracting text...',
      dropHint: 'Drop file and review extracted values.',
      matchedSupplier: 'Matched supplier contact:',
      fileName: 'File name',
      supplier: 'Supplier',
      supplierIc: 'Supplier IC',
      invoiceNo: 'Invoice no.',
      bankAccount: 'Bank account',
      variableSymbol: 'Variable symbol',
      constantSymbol: 'Constant symbol',
      issueDate: 'Issue date',
      dueDate: 'Due date',
      currency: 'Currency',
      vatRate: 'VAT rate (%)',
      baseAmount: 'Base amount',
      vatAmount: 'VAT amount',
      totalAmount: 'Total amount',
      extractedText: 'Extracted text',
      autofillHint: 'Green border = auto-filled from OCR. Editing a field marks it as manual.',
      saveDraft: 'Save Draft',
      approveStore: 'Approve & Store',
      storedEmpty: 'No stored documents yet.',
      previewTitle: 'Document preview',
      uploadPreviewHint: 'Upload a PDF or image and the preview will show here.',
      extractedSuccess: 'Text extracted. Check and save document.',
      noText: 'No text detected. Fill fields manually.',
      extractionFailedPrefix: 'Extraction failed',
      savedDraftMsg: 'Document saved as draft.',
      savedApprovedMsg: 'Document saved to history.',
      deleteDocConfirm: 'Delete this document? This cannot be undone.',
      deletedMsg: 'Document deleted.',
    }
  }, [language])

  const accountUiText = useMemo(() => {
    if (language === 'cz') {
      return {
        title: 'Účet',
        bankAccountsTitle: 'Bankovní účty',
        addBankAccount: '+ Přidat účet',
        noBankAccounts: 'Zatím žádný účet. Přidejte první záznam.',
        accountNumber: 'Číslo účtu',
        currency: 'Měna',
        label: 'Popisek (volitelné)',
        remove: '🗑',
        logo: 'Logo',
        removeLogo: 'Odstranit logo',
        companyIc: 'IČ firmy',
        vatPayer: 'Jsme plátci DPH',
        controlStatement: 'Podáváme kontrolní hlášení',
        taxesDisabledHint: 'Nejste plátce DPH. V sekci Daně se skryjí podklady pro přiznání a KH.',
        save: 'Uložit účet',
        saving: 'Ukládám...',
        saved: 'Nastavení účtu uloženo.',
        selectBankAccount: 'Vyberte účet',
      }
    }
    return {
      title: language === 'ru' ? 'Аккаунт' : language === 'ger' ? 'Konto' : 'Account',
      bankAccountsTitle: language === 'ru' ? 'Банковские счета' : language === 'ger' ? 'Bankkonten' : 'Bank accounts',
      addBankAccount: language === 'ru' ? '+ Добавить счет' : language === 'ger' ? '+ Konto hinzufügen' : '+ Add account',
      noBankAccounts: language === 'ru' ? 'Пока нет счетов. Добавьте первый.' : language === 'ger' ? 'Noch kein Konto. Bitte hinzufügen.' : 'No bank account yet. Add the first one.',
      accountNumber: language === 'ru' ? 'Номер счета' : language === 'ger' ? 'Kontonummer' : 'Account number',
      currency: language === 'ru' ? 'Валюта' : language === 'ger' ? 'Währung' : 'Currency',
      label: language === 'ru' ? 'Метка (необязательно)' : language === 'ger' ? 'Label (optional)' : 'Label (optional)',
      remove: '🗑',
      logo: language === 'ru' ? 'Логотип' : language === 'ger' ? 'Logo' : 'Logo',
      removeLogo: language === 'ru' ? 'Удалить логотип' : language === 'ger' ? 'Logo entfernen' : 'Remove logo',
      companyIc: language === 'ru' ? 'IČ компании' : language === 'ger' ? 'Unternehmens-IC' : 'Company IC',
      vatPayer: language === 'ru' ? 'Плательщик НДС' : language === 'ger' ? 'Wir sind MwSt.-pflichtig' : 'We are VAT payer',
      controlStatement: language === 'ru' ? 'Подаем контрольное отчетность (KH)' : language === 'ger' ? 'Kontrollmeldung erforderlich' : 'Control statement required',
      taxesDisabledHint: language === 'ru'
        ? 'Если вы не плательщик НДС, раздел Налоги покажет только базовый обзор.'
        : language === 'ger'
          ? 'Wenn Sie kein MwSt.-Payer sind, zeigt der Bereich Steuern nur die Grundübersicht.'
          : 'If you are not VAT payer, the Taxes section shows only a basic overview.',
      save: language === 'ru' ? 'Сохранить аккаунт' : language === 'ger' ? 'Konto speichern' : 'Save Account',
      saving: language === 'ru' ? 'Сохранение...' : language === 'ger' ? 'Speichern...' : 'Saving...',
      saved: language === 'ru' ? 'Настройки аккаунта сохранены.' : language === 'ger' ? 'Kontoeinstellungen gespeichert.' : 'Account settings saved.',
      selectBankAccount: language === 'ru' ? 'Выберите счет' : language === 'ger' ? 'Konto wählen' : 'Select bank account',
    }
  }, [language])

  const workspaceUiText = useMemo(() => {
    if (language === 'cz') {
      return {
        preview: 'Náhled',
        pay: 'Uhradit',
        save: 'Uložit',
        edit: 'Upravit',
        createDraft: 'Vytvořit rozpracovanou',
        updateDraft: 'Upravit rozpracovanou',
        cancelEdit: 'Zrušit úpravy',
        draftInvoicesTitle: 'Rozpracované faktury',
        editDraftTitle: 'Upravit rozpracovanou',
        newDraftTitle: 'Nová rozpracovaná faktura',
        noDraftInvoices: 'Žádné rozpracované faktury.',
        activeInvoicesTitle: 'Aktivní faktury',
        noActiveInvoices: 'Žádné aktivní faktury.',
        invoiceHistoryTitle: 'Historie faktur',
        noPaidInvoices: 'Žádné uhrazené faktury.',
        paidInvoice: 'Uhrazená faktura',
        due: 'Splatnost',
        taxDate: 'DUZP',
        noCustomer: 'Bez zákazníka',
        items: 'Položky',
        selectCustomer: 'Vyberte zákazníka',
        selectCustomerPreviewHint: 'Vyberte zákazníka pro náhled kontaktu.',
        addAtLeastOneItem: 'Přidejte alespoň jednu položku.',
        selectCustomDueDate: 'Vyberte vlastní datum splatnosti.',
        selectOrderFirst: 'Nejdřív vyberte objednávku.',
        couldNotLoadReports: 'Nepodařilo se načíst reporty',
        loadingReports: 'Načítám reportyâ€¦',
        couldNotOpenPrintWindow: 'Nepodařilo se otevřít okno tisku',
        selectExistingOrder: 'Vyberte existující objednávku',
        orderTitle: 'Název objednávky',
        orderCode: 'Kód objednávky',
        saveOrder: 'Uložit objednávku',
        pricingModel: 'Model účtování',
        mdDeliverable: 'MD výstup',
        budgetMode: 'Rozpočet',
        budgetLabel: 'Rozpočet',
        noArchivedProjects: 'Žádné archivované projekty.',
        archivedAfterFull: 'Archivováno po plném vyčerpání.',
        order: 'Objednávka',
        finalUsage: 'Konečné čerpání',
        created: 'Vytvořeno',
        companyIds: 'Firemní identifikace',
        address: 'Adresa',
        contact: 'Kontakt',
        paymentQr: 'QR platba',
        manualItem: 'Manuální položka',
      }
    }
    return {
      preview: language === 'ger' ? 'Vorschau' : language === 'ru' ? 'Предпросмотр' : 'Preview',
      pay: language === 'ger' ? 'Bezahlen' : language === 'ru' ? 'Оплатить' : 'Pay',
      save: language === 'ger' ? 'Speichern' : language === 'ru' ? 'Сохранить' : 'Save',
      edit: language === 'ger' ? 'Bearbeiten' : language === 'ru' ? 'Редактировать' : 'Edit',
      createDraft: language === 'ger' ? 'Entwurf erstellen' : language === 'ru' ? 'Создать черновик' : 'Create Draft',
      updateDraft: language === 'ger' ? 'Entwurf aktualisieren' : language === 'ru' ? 'Обновить черновик' : 'Update Draft',
      cancelEdit: language === 'ger' ? 'Bearbeitung abbrechen' : language === 'ru' ? 'Отменить редактирование' : 'Cancel Edit',
      draftInvoicesTitle: language === 'ger' ? 'Rechnungsentwürfe' : language === 'ru' ? 'Черновики счетов' : 'Draft Invoices',
      editDraftTitle: language === 'ger' ? 'Entwurf bearbeiten' : language === 'ru' ? 'Редактировать черновик' : 'Edit Draft',
      newDraftTitle: language === 'ger' ? 'Neuer Rechnungsentwurf' : language === 'ru' ? 'Новый черновик счета' : 'New Draft Invoice',
      noDraftInvoices: language === 'ger' ? 'Keine Entwürfe.' : language === 'ru' ? 'Нет черновиков.' : 'No draft invoices.',
      activeInvoicesTitle: language === 'ger' ? 'Aktive Rechnungen' : language === 'ru' ? 'Активные счета' : 'Active Invoices',
      noActiveInvoices: language === 'ger' ? 'Keine aktiven Rechnungen.' : language === 'ru' ? 'Нет активных счетов.' : 'No active invoices.',
      invoiceHistoryTitle: language === 'ger' ? 'Rechnungshistorie' : language === 'ru' ? 'История счетов' : 'Invoice History',
      noPaidInvoices: language === 'ger' ? 'Keine bezahlten Rechnungen.' : language === 'ru' ? 'Нет оплаченных счетов.' : 'No paid invoices.',
      paidInvoice: language === 'ger' ? 'Bezahlte Rechnung' : language === 'ru' ? 'Оплаченный счет' : 'Paid invoice',
      due: language === 'ger' ? 'Fällig' : language === 'ru' ? 'Срок оплаты' : 'Due',
      taxDate: language === 'ger' ? 'Steuerdatum' : language === 'ru' ? 'Дата налога' : 'Tax date',
      noCustomer: language === 'ger' ? 'Kein Kunde' : language === 'ru' ? 'Без клиента' : 'No customer',
      items: language === 'ger' ? 'Positionen' : language === 'ru' ? 'Позиции' : 'Items',
      selectCustomer: language === 'ger' ? 'Kunde wählen' : language === 'ru' ? 'Выберите клиента' : 'Select customer',
      selectCustomerPreviewHint: language === 'ger' ? 'Kunde für Vorschau wählen.' : language === 'ru' ? 'Выберите клиента для предпросмотра.' : 'Select customer to preview contact details.',
      addAtLeastOneItem: language === 'ger' ? 'Mindestens eine Position hinzufügen.' : language === 'ru' ? 'Добавьте хотя бы одну позицию.' : 'Add at least one item to the invoice',
      selectCustomDueDate: language === 'ger' ? 'Benutzerdefiniertes Fälligkeitsdatum wählen.' : language === 'ru' ? 'Выберите пользовательскую дату оплаты.' : 'Select custom due date',
      selectOrderFirst: language === 'ger' ? 'Bitte zuerst Auftrag wählen.' : language === 'ru' ? 'Сначала выберите заказ.' : 'Select an order first.',
      couldNotLoadReports: language === 'ger' ? 'Berichte konnten nicht geladen werden' : language === 'ru' ? 'Не удалось загрузить отчеты' : 'Could not load reports',
      loadingReports: language === 'ger' ? 'Berichte werden geladenâ€¦' : language === 'ru' ? 'Загрузка отчетовâ€¦' : 'Loading reportsâ€¦',
      couldNotOpenPrintWindow: language === 'ger' ? 'Druckfenster konnte nicht geöffnet werden' : language === 'ru' ? 'Не удалось открыть окно печати' : 'Could not open print window',
      selectExistingOrder: language === 'ger' ? 'Bestehenden Auftrag wählen' : language === 'ru' ? 'Выберите существующий заказ' : 'Select existing order',
      orderTitle: language === 'ger' ? 'Auftragstitel' : language === 'ru' ? 'Название заказа' : 'Order title',
      orderCode: language === 'ger' ? 'Auftragscode' : language === 'ru' ? 'Код заказа' : 'Order code',
      saveOrder: language === 'ger' ? 'Auftrag speichern' : language === 'ru' ? 'Сохранить заказ' : 'Save order',
      pricingModel: language === 'ger' ? 'Abrechnungsmodell' : language === 'ru' ? 'Модель тарификации' : 'Pricing model',
      mdDeliverable: language === 'ger' ? 'MD Lieferumfang' : language === 'ru' ? 'MD результат' : 'MD deliverable',
      budgetMode: language === 'ger' ? 'Budget' : language === 'ru' ? 'Бюджет' : 'Budget',
      budgetLabel: language === 'ger' ? 'Budget' : language === 'ru' ? 'Бюджет' : 'Budget',
      noArchivedProjects: language === 'ger' ? 'Keine archivierten Projekte.' : language === 'ru' ? 'Нет архивных проектов.' : 'No archived projects.',
      archivedAfterFull: language === 'ger' ? 'Archiviert nach vollständigem Verbrauch.' : language === 'ru' ? 'Архивировано после полного расхода.' : 'Archived after full consumption.',
      order: language === 'ger' ? 'Auftrag' : language === 'ru' ? 'Заказ' : 'Order',
      finalUsage: language === 'ger' ? 'Endverbrauch' : language === 'ru' ? 'Итоговый расход' : 'Final usage',
      created: language === 'ger' ? 'Erstellt' : language === 'ru' ? 'Создано' : 'Created',
      companyIds: language === 'ger' ? 'Unternehmensdaten' : language === 'ru' ? 'Идентификаторы компании' : 'Company IDs',
      address: language === 'ger' ? 'Adresse' : language === 'ru' ? 'Адрес' : 'Address',
      contact: language === 'ger' ? 'Kontakt' : language === 'ru' ? 'Контакт' : 'Contact',
      paymentQr: language === 'ger' ? 'Zahlungs-QR' : language === 'ru' ? 'QR dla оплаты' : 'Payment QR',
      manualItem: language === 'ger' ? 'Manuelle Position' : language === 'ru' ? 'Ручная позиция' : 'Manual item',
    }
  }, [language])

  const submenuLabels: Record<SubmenuKey, string> = {
    new: t.newSubmenu,
    unpaid: t.unpaidSubmenu,
    active: t.unpaidSubmenu,
    history: t.historySubmenu,
    current: t.currentSubmenu,
    contacts: t.contactsSubmenu,
    stored: t.storedSubmenu,
  }

  const menuItems: Array<{ key: MenuSection; label: string; submenus: SubmenuKey[] }> = [
    { key: 'invoices', label: t.invoices, submenus: ['new', 'unpaid', 'history'] },
    { key: 'orders', label: t.orders, submenus: ['new', 'active', 'history'] },
    { key: 'projects', label: t.projects, submenus: ['new', 'current', 'history'] },
    { key: 'customers', label: t.customers, submenus: ['new', 'contacts'] },
    { key: 'documents', label: t.documents, submenus: ['new', 'stored'] },
    { key: 'taxes', label: t.taxes, submenus: ['current', 'history'] },
    { key: 'reports', label: t.reports, submenus: ['current'] },
  ]

  const activeItem = menuItems.find((item) => item.key === activeSection)

  const totalRevenue = useMemo(
    () => invoices.reduce((sum, invoice) => sum + getInvoiceTotals(invoice).gross, 0),
    [invoices],
  )

  const availableInvoiceProjects = useMemo(() => {
    if (!invoiceForm.customerId) {
      return [] as Project[]
    }

    return projects.filter(
      (project) => !project.archived && project.order?.customerId === invoiceForm.customerId,
    )
  }, [projects, invoiceForm.customerId])

  const invoiceDraftCurrency = useMemo(() => {
    const projectCurrency = invoiceItems
      .map((item) => projects.find((p) => p.id === item.projectId)?.currency)
      .find(Boolean)
    return projectCurrency ?? 'CZK'
  }, [invoiceItems, projects])

  const preferredInvoiceBankAccounts = useMemo(() => {
    const byCurrency = accountProfile.bankAccounts.filter(
      (item) => item.currency.toUpperCase() === invoiceDraftCurrency.toUpperCase(),
    )
    return byCurrency.length > 0 ? byCurrency : accountProfile.bankAccounts
  }, [accountProfile.bankAccounts, invoiceDraftCurrency])

  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function withSelectedUserFilter(path: string): string {
    if (!user?.isAdmin || !selectedAdminUserId) {
      return path
    }
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}userId=${encodeURIComponent(selectedAdminUserId)}`
  }

  useEffect(() => {
    const href = accountProfile.logoDataUrl || defaultFaviconPath
    let icon = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      document.head.appendChild(icon)
    }
    icon.type = href.startsWith('data:image/')
      ? href.slice('data:'.length, href.indexOf(';base64'))
      : 'image/png'
    icon.href = href
  }, [accountProfile.logoDataUrl])

  useEffect(() => {
    return () => {
      if (documentUploadPreviewUrl) {
        URL.revokeObjectURL(documentUploadPreviewUrl)
      }
    }
  }, [documentUploadPreviewUrl])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleToken = params.get('google_token')
    const googleError = params.get('google_error')

    if (googleToken) {
      localStorage.setItem('token', googleToken)
      setToken(googleToken)
      setAuthMessage('')
      setAuthDevHint('')
      window.history.replaceState({}, '', '/')
      return
    }

    if (googleError) {
      setAuthMessage(`${authUiText.googleLoginFailed}: ${googleError}`)
      window.history.replaceState({}, '', '/')
    }
  }, [authUiText.googleLoginFailed])

  async function loadInvoices(currentToken: string, status: string = 'draft') {
    setInvoiceError('')
    const response = await fetch(apiUrl(withSelectedUserFilter(`/api/invoices?status=${encodeURIComponent(status)}`)), {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    })
    if (!response.ok) {
      throw new Error('Could not load invoices')
    }

    const data = (await response.json()) as Invoice[]
    setInvoices(data)
  }

  async function loadAccount(currentToken: string) {
    const response = await fetch(apiUrl('/api/account'), {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Could not load account')
    }

    const data = (await response.json()) as {
      bankAccount: string | null
      bankAccounts?: BankAccountOption[]
      companyIc?: string | null
      logoDataUrl: string | null
      isVatPayer?: boolean
      requiresControlStatement?: boolean
    }
    setAccountProfile({
      bankAccount: data.bankAccount ?? '',
      bankAccounts: Array.isArray(data.bankAccounts) ? data.bankAccounts : [],
      companyIc: data.companyIc ?? '',
      logoDataUrl: data.logoDataUrl ?? '',
      isVatPayer: Boolean(data.isVatPayer),
      requiresControlStatement: Boolean(data.requiresControlStatement),
    })
  }

  async function loadDocuments(currentToken: string, status?: 'draft' | 'approved') {
    const query = status ? `?status=${status}` : ''
    const response = await fetch(apiUrl(withSelectedUserFilter(`/api/documents${query}`)), {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Could not load documents')
    }

    const data = (await response.json()) as ReceivedDocument[]
    setDocuments(data)
  }

  function parseAmount(raw: string | undefined): number | null {
    if (!raw) return null
    const normalized = raw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.\-]/g, '')
    const value = Number(normalized)
    return Number.isFinite(value) ? value : null
  }

  function findFirstMatch(text: string, patterns: RegExp[]): string {
    for (const pattern of patterns) {
      const match = pattern.exec(text)
      if (match?.[1]) {
        return match[1].trim()
      }
    }
    return ''
  }

  function normalizeAmount(raw: string): string {
    return raw
      .replace(/\s+/g, '')
      .replace('Kč', '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '')
  }

  function normalizeDate(raw: string): string {
    const date = raw.trim()
    const cz = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(date)
    if (cz) {
      const day = cz[1].padStart(2, '0')
      const month = cz[2].padStart(2, '0')
      return `${cz[3]}-${month}-${day}`
    }

    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date)
    if (iso) {
      const month = iso[2].padStart(2, '0')
      const day = iso[3].padStart(2, '0')
      return `${iso[1]}-${month}-${day}`
    }

    return ''
  }

  function updateDocumentField<K extends keyof DocumentForm>(field: K, value: DocumentForm[K]) {
    setDocumentForm((prev) => ({ ...prev, [field]: value }))
    setDocumentAutofilledFields((prev) => prev.filter((item) => item !== field))
    if (field === 'supplierName' || field === 'supplierIc') {
      setDocumentMatchedCustomer(null)
    }
  }

  function isAutofilledField(field: keyof DocumentForm) {
    return documentAutofilledFields.includes(field)
  }

  function clearDocumentUploadPreview() {
    if (documentUploadPreviewUrl) {
      URL.revokeObjectURL(documentUploadPreviewUrl)
    }
    setDocumentUploadPreviewUrl('')
    setDocumentUploadPreviewType(null)
  }

  function normalizeCompanyName(raw: string) {
    return raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\bs\.?r\.?o\.?\b/g, '')
      .replace(/\ba\.?s\.?\b/g, '')
      .replace(/\bv\.?o\.?s\.?\b/g, '')
      .replace(/[^a-z0-9\s\u00c0-\u017f]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function prefillDocumentFromExtractedText(text: string, fileName: string, sourceType: 'pdf' | 'image' | 'manual') {
    const normalized = text.replace(/\u00A0/g, ' ')

    const supplierBlock = findFirstMatch(normalized, [
      /dodavatel\s+(.+?)\s+odb[ěe]ratel/i,
      /supplier\s+(.+?)\s+customer/i,
    ])
    const supplierName = findFirstMatch(supplierBlock || normalized, [
      /^(.+?)\s{2,}/,
      /^(.+?)(?:\s+\d{1,5}\/\d{1,5}|\s+\d{3}\s*\d{2}\s+[a-z\u00c0-\u017f]+|\s+i[čc]\s*:|$)/i,
      /^([^\n\r]+?)(?:\s+i[čc]\s*:|\s+nejsme\s+pl[áa]tci|\s+kontaktn[íi]\s+[úu]daje|$)/i,
      /dodavatel[:\s]+(.+?)(?:\s+odb[ěe]ratel|$)/i,
      /supplier[:\s]+(.+?)(?:\s+customer|$)/i,
    ])
    const supplierIcFromBlock = findFirstMatch(supplierBlock || normalized, [
      /i[čc]\s*[:]?\s*([0-9]{6,12})/i,
      /ic\s*[:]?\s*([0-9]{6,12})/i,
    ])
    const supplierIcNearProfile = findFirstMatch(normalized, [
      /i[čc]\s*[:]?\s*([0-9]{6,12})\s+nejsme\s+pl[áa]tci\s+dph/i,
      /i[čc]\s*[:]?\s*([0-9]{6,12})\s+kontaktn[íi]\s+[úu]daje/i,
    ])
    const allIcMatches = Array.from(normalized.matchAll(/i[čc]\s*[:]?\s*([0-9]{6,12})/gi)).map((m) => m[1])
    const supplierIcFallback = allIcMatches.length > 1 ? allIcMatches[allIcMatches.length - 1] : allIcMatches[0] || ''
    const supplierIc = supplierIcNearProfile || supplierIcFromBlock || supplierIcFallback

    const invoiceNumber = findFirstMatch(normalized, [
      /^\s*([0-9]{6,})\s+faktura/i,
      /(?:č[íi]slo\s+faktury|faktura\s*č\.?|invoice\s*(?:no\.?|number))\s*[:]?\s*([a-z0-9\-\/]+)/i,
      /vs[:\s]*([0-9]{4,20})/i,
      /variabiln[íi]\s*[:]?\s*([0-9]{4,20})/i,
    ])

    const bankAccount = findFirstMatch(normalized, [
      /(?:bankovn[íi]\s+[úu]čet|bank\s+account)\s*[:]?\s*([0-9]{1,6}-?[0-9]{1,17}\/[0-9]{4})/i,
      /\b([0-9]{1,6}-?[0-9]{1,17}\/[0-9]{4})\b/,
    ])
    const variableSymbol = findFirstMatch(normalized, [
      /variabiln[íi]\s*[:]?\s*([0-9]{4,20})/i,
      /variable\s+symbol\s*[:]?\s*([0-9]{4,20})/i,
    ])
    const constantSymbol = findFirstMatch(normalized, [
      /konstantn[íi]\s*[:]?\s*([0-9]{1,20})/i,
      /constant\s+symbol\s*[:]?\s*([0-9]{1,20})/i,
    ])

    const issueDateRaw = findFirstMatch(normalized, [
      /datum\s+vystaven[íi]\s*[:]?\s*(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{1,2}-\d{1,2})/i,
      /issue\s+date\s*[:]?\s*(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{1,2}-\d{1,2})/i,
    ])
    const dueDateRaw = findFirstMatch(normalized, [
      /datum\s+splatnosti\s*[:]?\s*(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{1,2}-\d{1,2})/i,
      /due\s+date\s*[:]?\s*(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{1,2}-\d{1,2})/i,
    ])

    const totalRaw = findFirstMatch(normalized, [
      /celkem\s+k\s*[úu]hrad[ěe]\s*[:]?\s*([0-9\s.,]+)\s*(?:kč|czk)?/i,
      /k\s*uhrad[ěe]\s*[:]?\s*([0-9\s.,]+)\s*(?:kč|czk)?/i,
      /(?:celkem|total)\s*[:]?\s*([0-9\s.,]+)\s*(?:kč|czk)?/i,
    ])
    const vatRaw = findFirstMatch(normalized, [
      /(?:dph|vat)[:\s]*([0-9\s.,]+)/i,
    ])
    const baseRaw = findFirstMatch(normalized, [
      /(?:z[aá]klad|base)[:\s]*([0-9\s.,]+)/i,
    ])

    const hasNoVat = /nejsme\s+pl[áa]tci\s+dph|not\s+vat\s+payer/i.test(normalized)
    const currency = /\bkč\b|\bczk\b/i.test(normalized) ? 'CZK' : 'CZK'

    const normalizedSupplierName = normalizeCompanyName(supplierName)
    const matchedByIc = supplierIc ? customers.find((customer) => (customer.ic ?? '').trim() === supplierIc.trim()) : null
    const matchedByName = normalizedSupplierName
      ? customers.find((customer) => {
          const candidate = normalizeCompanyName(customer.name)
          return candidate === normalizedSupplierName || candidate.includes(normalizedSupplierName) || normalizedSupplierName.includes(candidate)
        })
      : null
    const matchedCustomer = matchedByIc ?? matchedByName ?? null

    const normalizedTotal = totalRaw ? normalizeAmount(totalRaw) : ''
    const normalizedVat = hasNoVat ? '0' : vatRaw ? normalizeAmount(vatRaw) : ''
    const normalizedBase = baseRaw ? normalizeAmount(baseRaw) : hasNoVat && normalizedTotal ? normalizedTotal : ''

    const extractedFields: Array<keyof DocumentForm> = ['fileName', 'sourceType', 'extractedText']
    if (supplierName) extractedFields.push('supplierName')
    if (supplierIc) extractedFields.push('supplierIc')
    if (invoiceNumber) extractedFields.push('invoiceNumber')
    if (bankAccount) extractedFields.push('bankAccount')
    if (variableSymbol) extractedFields.push('variableSymbol')
    if (constantSymbol) extractedFields.push('constantSymbol')
    if (normalizeDate(issueDateRaw)) extractedFields.push('issueDate')
    if (normalizeDate(dueDateRaw)) extractedFields.push('dueDate')
    if (currency) extractedFields.push('currency')
    if (normalizedTotal) extractedFields.push('totalAmount')
    if (normalizedVat) extractedFields.push('vatAmount')
    if (normalizedBase) extractedFields.push('baseAmount')
    if (hasNoVat) extractedFields.push('vatRate')

    setDocumentAutofilledFields(Array.from(new Set(extractedFields)))
    setDocumentMatchedCustomer(matchedCustomer)

    setDocumentForm((prev) => ({
      ...prev,
      fileName,
      sourceType,
      supplierName: matchedCustomer?.name || supplierName || prev.supplierName,
      supplierIc: matchedCustomer?.ic || supplierIc || prev.supplierIc,
      invoiceNumber: invoiceNumber || prev.invoiceNumber,
      bankAccount: bankAccount || prev.bankAccount,
      variableSymbol: variableSymbol || prev.variableSymbol,
      constantSymbol: constantSymbol || prev.constantSymbol,
      issueDate: normalizeDate(issueDateRaw) || prev.issueDate,
      dueDate: normalizeDate(dueDateRaw) || prev.dueDate,
      currency,
      totalAmount: normalizedTotal || prev.totalAmount,
      vatAmount: normalizedVat || prev.vatAmount,
      baseAmount: normalizedBase || prev.baseAmount,
      vatRate: hasNoVat ? '0' : prev.vatRate,
      extractedText: text,
    }))
  }

  async function handleDocumentFileUpload(file: File | null) {
    if (!file) return
    setDocumentMessage('')
    setDocumentExtracting(true)

    clearDocumentUploadPreview()

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/')
    if (isPdf || isImage) {
      setDocumentUploadPreviewUrl(URL.createObjectURL(file))
      setDocumentUploadPreviewType(isPdf ? 'pdf' : 'image')
    }

    try {
      let extractedText = ''
      let sourceType: 'pdf' | 'image' | 'manual' = 'manual'

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        sourceType = 'pdf'
        const pdfjs = await import('pdfjs-dist')
        const pdfBuffer = await file.arrayBuffer()
        if (pdfjs.GlobalWorkerOptions?.workerSrc !== pdfWorkerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc
        }

        let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>>['promise'] extends Promise<infer T> ? T : never
        try {
          pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise
        } catch {
          // Fallback path when worker bootstrap fails in some local environments.
          pdf = await (pdfjs.getDocument as any)({ data: new Uint8Array(pdfBuffer), disableWorker: true }).promise
        }
        const pageTexts: string[] = []

        for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
          const page = await pdf.getPage(pageIndex)
          const content = await page.getTextContent()
          const pageText = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
          pageTexts.push(pageText)
        }

        extractedText = pageTexts.join('\n').trim()
      } else if (file.type.startsWith('image/')) {
        sourceType = 'image'
        const Tesseract = await import('tesseract.js')
        try {
          const result = await Tesseract.recognize(file, 'eng+ces')
          extractedText = result.data.text.trim()
        } catch {
          const fallbackResult = await Tesseract.recognize(file, 'eng')
          extractedText = fallbackResult.data.text.trim()
        }
      } else {
        extractedText = (await file.text()).trim()
      }

      prefillDocumentFromExtractedText(extractedText, file.name, sourceType)
      setDocumentMessage(extractedText ? documentsUiText.extractedSuccess : documentsUiText.noText)
    } catch (err) {
      const details = err instanceof Error ? err.message : 'Unknown extraction error'
      setDocumentMessage(`${documentsUiText.extractionFailedPrefix}: ${details}. ${documentsUiText.noText}`)
    } finally {
      setDocumentExtracting(false)
    }
  }

  async function handleDocumentSave(status: 'draft' | 'approved') {
    if (!token) return
    setDocumentMessage('')
    setDocumentSaving(true)

    try {
      const payload = {
        status,
        fileName: documentForm.fileName || 'Manual document',
        sourceType: documentForm.sourceType,
        supplierName: documentForm.supplierName || null,
        supplierIc: documentForm.supplierIc || null,
        invoiceNumber: documentForm.invoiceNumber || null,
        bankAccount: documentForm.bankAccount || null,
        variableSymbol: documentForm.variableSymbol || null,
        constantSymbol: documentForm.constantSymbol || null,
        issueDate: documentForm.issueDate || null,
        dueDate: documentForm.dueDate || null,
        currency: documentForm.currency || 'CZK',
        baseAmount: parseAmount(documentForm.baseAmount),
        vatAmount: parseAmount(documentForm.vatAmount),
        totalAmount: parseAmount(documentForm.totalAmount),
        vatRate: parseAmount(documentForm.vatRate),
        extractedText: documentForm.extractedText || null,
      }

      const response = await fetch(apiUrl('/api/documents'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json().catch(() => null)) as { message?: string } | ReceivedDocument | null
      if (!response.ok) {
        throw new Error((data as { message?: string } | null)?.message ?? 'Document save failed')
      }

      setDocumentForm(emptyDocumentForm)
      setDocumentAutofilledFields([])
      setDocumentMatchedCustomer(null)
      clearDocumentUploadPreview()
      await loadDocuments(token, activeSubmenu === 'stored' ? 'approved' : 'draft')
      setDocumentMessage(status === 'approved' ? documentsUiText.savedApprovedMsg : documentsUiText.savedDraftMsg)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Document save failed'
      setDocumentMessage(message)
    } finally {
      setDocumentSaving(false)
    }
  }

  async function handleDocumentDelete(documentId: number) {
    if (!token) return
    const confirmed = window.confirm(documentsUiText.deleteDocConfirm)
    if (!confirmed) return

    setDocumentMessage('')
    try {
      const response = await fetch(apiUrl(`/api/documents/${documentId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? 'Document delete failed')
      }

      setPreviewDocument((prev) => (prev?.id === documentId ? null : prev))
      await loadDocuments(token, activeSubmenu === 'stored' ? 'approved' : 'draft')
      setDocumentMessage(documentsUiText.deletedMsg)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Document delete failed'
      setDocumentMessage(message)
    }
  }

  useEffect(() => {
    if (!token) {
      setUser(null)
      setAdminUsers([])
      setSelectedAdminUserId('')
      setInvoices([])
      return
    }

    async function bootAuthenticatedApp() {
      const meResponse = await fetch(apiUrl('/api/auth/me'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!meResponse.ok) {
        localStorage.removeItem('token')
        setToken('')
        return
      }

      const me = (await meResponse.json()) as User
      setUser(me)
      if (me.isAdmin) {
        await loadAdminUsers(token)
      } else {
        setAdminUsers([])
        setSelectedAdminUserId('')
      }
      await loadInvoices(token)
      await loadCustomers(token)
      await loadOrders(token)
      await loadProjects(token)
      await loadAccount(token)
      await loadDocuments(token, 'draft')
    }

    void bootAuthenticatedApp().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown API error'
      setInvoiceError(message)
    })
  }, [token])

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage('')
    setAuthDevHint('')
    setAuthLoading(true)

    try {
      const endpoint = mode === 'login' ? apiUrl('/api/auth/login') : apiUrl('/api/auth/register')
      const payload = { email: email.trim(), password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { message?: string }
          | null

        if (errorBody?.message === 'User already exists') {
          throw new Error(t.userExists)
        }

        if (errorBody?.message === 'Invalid registration payload') {
          throw new Error(t.invalidRegisterPayload)
        }

        if (errorBody?.message === 'Invalid credentials') {
          throw new Error(t.authError)
        }

        if (errorBody?.message === 'Email not verified') {
          setPendingVerificationEmail(payload.email)
          throw new Error(authUiText.emailNotVerified)
        }

        throw new Error(errorBody?.message ?? t.authError)
      }

      if (mode === 'register') {
        const data = (await response.json()) as {
          message: string
          verificationCode?: string
        }
        setPendingVerificationEmail(payload.email)
        setVerificationCode('')
        setAuthMessage(authUiText.registerNeedsVerification)
        if (data.verificationCode) {
          setAuthDevHint(`${authUiText.devCodePrefix} ${data.verificationCode}`)
        }
      } else {
        const data = (await response.json()) as { token: string; user: User }
        localStorage.setItem('token', data.token)
        setToken(data.token)
        setUser(data.user)
        setEmail('')
        setPassword('')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t.authError
      setAuthMessage(message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleVerifyCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage('')
    setAuthLoading(true)

    try {
      const response = await fetch(apiUrl('/api/auth/verify-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingVerificationEmail, code: verificationCode.trim() }),
      })

      const data = (await response.json()) as { message?: string; token?: string; user?: User }
      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.message ?? t.authError)
      }

      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      setPendingVerificationEmail('')
      setVerificationCode('')
      setPassword('')
      setAuthDevHint('')
      setAuthMessage(t.registerSuccess)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.authError
      setAuthMessage(message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleResendVerification() {
    if (!pendingVerificationEmail) return
    setAuthMessage('')
    setAuthLoading(true)

    try {
      const response = await fetch(apiUrl('/api/auth/resend-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingVerificationEmail }),
      })
      const data = (await response.json()) as { message?: string; verificationCode?: string }
      if (!response.ok) {
        throw new Error(data.message ?? t.authError)
      }

      setAuthMessage(data.message ?? authUiText.registerNeedsVerification)
      if (data.verificationCode) {
        setAuthDevHint(`${authUiText.devCodePrefix} ${data.verificationCode}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t.authError
      setAuthMessage(message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleForgotPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage('')
    setAuthLoading(true)

    try {
      const response = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = (await response.json()) as { message?: string; resetToken?: string }
      if (!response.ok) {
        throw new Error(data.message ?? t.authError)
      }

      setAuthMessage(data.message ?? authUiText.forgotSubtitle)
      if (data.resetToken) {
        setAuthDevHint(`${authUiText.resetTokenLabel}: ${data.resetToken}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t.authError
      setAuthMessage(message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleResetPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage('')
    setAuthLoading(true)

    try {
      const response = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          token: resetToken.trim(),
          newPassword,
        }),
      })

      const data = (await response.json()) as { message?: string; token?: string; user?: User }
      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.message ?? t.authError)
      }

      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      setResetEmail('')
      setResetToken('')
      setNewPassword('')
      setAuthDevHint('')
      setAuthMessage(authUiText.resetSuccess)
      window.history.replaceState({}, '', '/')
    } catch (err) {
      const message = err instanceof Error ? err.message : t.authError
      setAuthMessage(message)
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
    setAdminUsers([])
    setSelectedAdminUserId('')
    setInvoices([])
    setCustomers([])
    setAllOrders([])
    setProjects([])
    setDocuments([])
    setDocumentAutofilledFields([])
    setDocumentMatchedCustomer(null)
    setSettingsOpen(false)
    setPendingVerificationEmail('')
    setVerificationCode('')
    setForgotPasswordMode(false)
    setAuthDevHint('')
  }

  useEffect(() => {
    if (!token) return
    const TIMEOUT_MS = 60 * 60 * 1000
    let timer: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => handleLogout(), TIMEOUT_MS)
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [token])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  useEffect(() => {
    if (!token || activeSection !== 'invoices') {
      return
    }

    const nextStatus = activeSubmenu === 'unpaid' ? 'unpaid' : activeSubmenu === 'history' ? 'paid' : 'draft'
    setInvoiceStatus(nextStatus)
    void loadInvoices(token, nextStatus).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown API error'
      setInvoiceError(message)
    })
  }, [token, activeSection, activeSubmenu, selectedAdminUserId, user?.isAdmin])

  useEffect(() => {
    if (editingInvoiceId) {
      return
    }

    if (preferredInvoiceBankAccounts.length === 0) {
      return
    }

    const isCurrentStillValid = preferredInvoiceBankAccounts.some(
      (item) => item.accountNumber === invoiceForm.bankAccount,
    )
    if (isCurrentStillValid) {
      return
    }

    setInvoiceForm((prev) => ({
      ...prev,
      bankAccount: preferredInvoiceBankAccounts[0].accountNumber,
    }))
  }, [preferredInvoiceBankAccounts, editingInvoiceId, invoiceForm.bankAccount])

  useEffect(() => {
    if (!token || activeSection !== 'documents') {
      return
    }

    const status = activeSubmenu === 'stored' ? 'approved' : 'draft'
    void loadDocuments(token, status).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown API error'
      setDocumentMessage(message)
    })
  }, [token, activeSection, activeSubmenu, selectedAdminUserId, user?.isAdmin])

  useEffect(() => {
    if (activeSection === 'invoices' && (activeSubmenu === 'unpaid' || activeSubmenu === 'history')) {
      setPreviewInvoice((prev) => {
        if (prev && invoices.some((invoice) => invoice.id === prev.id)) {
          return prev
        }
        return invoices[0] ?? null
      })
      return
    }

    setPreviewInvoice(null)
  }, [activeSection, activeSubmenu, invoices])

  useEffect(() => {
    if (activeSection === 'documents' && activeSubmenu === 'stored') {
      setPreviewDocument((prev) => {
        if (prev && documents.some((doc) => doc.id === prev.id)) {
          return prev
        }
        return documents[0] ?? null
      })
      return
    }

    setPreviewDocument(null)
  }, [activeSection, activeSubmenu, documents])

  function addInvoiceItem() {
    setInvoiceItems((prev) => [...prev, { projectId: null, days: '', amount: '' }])
  }

  function removeInvoiceItem(index: number) {
    setInvoiceItems((prev) => prev.filter((_, i) => i !== index))
  }

  function getItemComputedAmount(item: InvoiceDraftItem): number {
    const project = projects.find((p) => p.id === item.projectId)
    if (!project) {
      return Number(item.amount) || 0
    }

    if (project.pricingMode === 'md') {
      const days = Number(item.days) || 0
      const rate = project.mdRate ?? 0
      return days * rate
    }

    return Number(item.amount) || 0
  }

  function getInvoiceTotalsFromDraft() {
    const net = invoiceItems.reduce((sum, item) => sum + getItemComputedAmount(item), 0)
    const rate = Number(invoiceForm.vatRate) || 0
    const vat = invoiceForm.includeVat ? (net * rate) / 100 : 0
    const gross = net + vat
    return { net, vat, gross }
  }

  function getDraftCurrency() {
    const projectCurrency = invoiceItems
      .map((item) => projects.find((p) => p.id === item.projectId)?.currency)
      .find(Boolean)
    return projectCurrency ?? 'CZK'
  }

  function getInvoiceTotals(invoice: Invoice) {
    const net = invoice.items.reduce((sum, item) => sum + item.amount, 0)
    const vat = invoice.includeVat ? (net * (invoice.vatRate ?? 0)) / 100 : 0
    const gross = net + vat
    return { net, vat, gross }
  }

  function getInvoiceCurrency(invoice: Invoice) {
    const projectCurrency = invoice.items
      .map((item) => projects.find((p) => p.id === item.projectId)?.currency)
      .find(Boolean)
    const orderCurrency = allOrders.find((order) => order.customerId === invoice.customerId)?.currency
    return projectCurrency ?? orderCurrency ?? 'CZK'
  }

  function formatMoney(amount: number, currency: string) {
    return `${amount.toFixed(2)} ${currency}`
  }

  function getConsumptionPercent(used: number, total: number) {
    if (total <= 0) return 0
    const raw = (used / total) * 100
    return Math.max(0, Math.min(100, raw))
  }

  function getProjectConsumptionPercent(project: Project) {
    if (project.pricingMode === 'md') {
      return getConsumptionPercent(project.daysUsed, project.days ?? 0)
    }
    return getConsumptionPercent(project.budgetUsed, project.budget ?? 0)
  }

  function getTaxSourceDate(invoice: Invoice) {
    return invoice.taxDate ? new Date(invoice.taxDate) : invoice.issueDate ? new Date(invoice.issueDate) : new Date(invoice.createdAt)
  }

  function getScopedTaxInvoices(range: PeriodRange) {
    const rangeStart = getRangeStartDate(range)
    return reportInvoices.filter((invoice) => invoice.status !== 'draft' && (rangeStart ? getTaxSourceDate(invoice) >= rangeStart : true))
  }

  function getTaxRateBucket(invoice: Invoice): CzechVatOption {
    const rate = String(invoice.vatRate ?? 0)
    if (rate === '21') return '21'
    if (rate === '12') return '12'
    return '0'
  }

  function getTaxRateLabel(rate: CzechVatOption) {
    if (rate === '21') return t.taxRateStandardSummary
    if (rate === '12') return t.taxRateReducedSummary
    return t.taxRateZeroSummary
  }

  function getTaxRateSummary(invoices: Invoice[]) {
    const buckets: Record<CzechVatOption, { base: number; vat: number; count: number }> = {
      '21': { base: 0, vat: 0, count: 0 },
      '12': { base: 0, vat: 0, count: 0 },
      '0': { base: 0, vat: 0, count: 0 },
    }

    for (const invoice of invoices) {
      const bucket = buckets[getTaxRateBucket(invoice)]
      const totals = getInvoiceTotals(invoice)
      bucket.base += totals.net
      bucket.vat += totals.vat
      bucket.count += 1
    }

    return (['21', '12', '0'] as const).map((rate) => ({ rate, label: getTaxRateLabel(rate), ...buckets[rate] }))
  }

  function getControlStatementBucket(invoice: Invoice) {
    const dic = invoice.customer?.dic?.trim().toUpperCase() ?? ''
    if (!dic.startsWith('CZ') || dic.length < 10) {
      return 'unclassified' as const
    }

    return getInvoiceTotals(invoice).gross > 10000 ? ('a4' as const) : ('a5' as const)
  }

  function getControlStatementSummary(invoices: Invoice[]) {
    const buckets = {
      a4: { label: t.controlStatementA4, base: 0, vat: 0, count: 0 },
      a5: { label: t.controlStatementA5, base: 0, vat: 0, count: 0 },
      unclassified: { label: t.controlStatementUnclassified, base: 0, vat: 0, count: 0 },
    }

    for (const invoice of invoices) {
      const bucket = buckets[getControlStatementBucket(invoice)]
      const totals = getInvoiceTotals(invoice)
      bucket.base += totals.net
      bucket.vat += totals.vat
      bucket.count += 1
    }

    return [buckets.a4, buckets.a5, buckets.unclassified]
  }

  function getTaxHistoryRows(invoices: Invoice[]) {
    return Array.from(
      invoices.reduce((map, invoice) => {
        const sourceDate = getTaxSourceDate(invoice)
        const key = `${sourceDate.getFullYear()}-${String(sourceDate.getMonth() + 1).padStart(2, '0')}`
        const current =
          map.get(key) ?? {
            count: 0,
            totalBase: 0,
            totalVat: 0,
            base21: 0,
            vat21: 0,
            base12: 0,
            vat12: 0,
            base0: 0,
            vat0: 0,
          }
        const totals = getInvoiceTotals(invoice)
        const rate = getTaxRateBucket(invoice)

        current.count += 1
        current.totalBase += totals.net
        current.totalVat += totals.vat
        if (rate === '21') {
          current.base21 += totals.net
          current.vat21 += totals.vat
        } else if (rate === '12') {
          current.base12 += totals.net
          current.vat12 += totals.vat
        } else {
          current.base0 += totals.net
          current.vat0 += totals.vat
        }

        map.set(key, current)
        return map
      }, new Map<string, { count: number; totalBase: number; totalVat: number; base21: number; vat21: number; base12: number; vat12: number; base0: number; vat0: number }>()),
    )
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([period, totals]) => ({ period, ...totals }))
  }

  function getRangeStartDate(range: PeriodRange) {
    const now = new Date()
    if (range === 'month') return new Date(now.getFullYear(), now.getMonth() - 1, 1)
    if (range === 'quarter') return new Date(now.getFullYear(), now.getMonth() - 3, 1)
    if (range === 'year') return new Date(now.getFullYear() - 1, now.getMonth(), 1)
    return null
  }

  function isInRangeByCreatedAt(createdAt: string, range: PeriodRange) {
    const start = getRangeStartDate(range)
    if (!start) return true
    return new Date(createdAt) >= start
  }

  function computeMod97FromNumericString(value: string) {
    let remainder = 0
    for (const ch of value) {
      remainder = (remainder * 10 + Number(ch)) % 97
    }
    return remainder
  }

  function toCzIbanFromDomesticAccount(accountRaw: string) {
    const normalized = accountRaw.replace(/\s+/g, '')

    if (/^CZ\d{22}$/i.test(normalized)) {
      return normalized.toUpperCase()
    }

    const match = normalized.match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/)
    if (!match) {
      return ''
    }

    const prefix = (match[1] ?? '').padStart(6, '0')
    const accountNumber = match[2].padStart(10, '0')
    const bankCode = match[3]
    const bban = `${bankCode}${prefix}${accountNumber}`

    // IBAN checksum: move country code and check digits to end and convert letters to numbers.
    const rearrangedNumeric = `${bban}123500`
    const checkDigits = 98 - computeMod97FromNumericString(rearrangedNumeric)
    const check = String(checkDigits).padStart(2, '0')
    return `CZ${check}${bban}`
  }

  function getInvoiceQrPayload(invoice: Invoice) {
    const totals = getInvoiceTotals(invoice)
    const account = toCzIbanFromDomesticAccount(invoice.bankAccount ?? '')
    if (!account) return ''

    const variableSymbolRaw = invoice.variableSymbol?.trim() || String(invoice.id)
    const variableSymbol = variableSymbolRaw.replace(/\D/g, '').slice(0, 10)
    const currency = getInvoiceCurrency(invoice)
    const vsChunk = variableSymbol ? `*X-VS:${variableSymbol}` : ''
    return `SPD*1.0*ACC:${account}*AM:${totals.gross.toFixed(2)}*CC:${currency}${vsChunk}*MSG:Invoice ${invoice.id}`
  }

  function getInvoiceQrUrl(invoice: Invoice) {
    const payload = getInvoiceQrPayload(invoice)
    if (!payload) return ''
    return `${qrApiBaseUrl}?size=200x200&data=${encodeURIComponent(payload)}`
  }

  function getDueDateIsoFromForm() {
    const issueBase = invoiceForm.issueDate ? new Date(invoiceForm.issueDate) : new Date()
    if (invoiceForm.duePreset === 'custom') {
      return invoiceForm.dueDateCustom ? new Date(invoiceForm.dueDateCustom).toISOString() : undefined
    }

    const daysToAdd = invoiceForm.duePreset === '30' ? 30 : 14
    const due = new Date(issueBase)
    due.setDate(due.getDate() + daysToAdd)
    return due.toISOString()
  }

  function updateInvoiceItem(
    index: number,
    field: 'projectId' | 'days' | 'amount',
    value: string | number | null,
  ) {
    setInvoiceItems((prev) => {
      const next = prev.map((item, i) => {
        if (i !== index) return item

        const updated = {
          ...item,
          [field]: value,
        }

        if (field === 'projectId') {
          const project = projects.find((p) => p.id === (value as number | null))
          if (!project) {
            return { ...updated, days: '', amount: '' }
          }

          if (project.pricingMode === 'md') {
            return { ...updated, amount: project.mdRate ? String(project.mdRate) : '0' }
          }

          return { ...updated, days: '' }
        }

        if (field === 'days') {
          const project = projects.find((p) => p.id === updated.projectId)
          if (project?.pricingMode === 'md') {
            const days = Number(updated.days) || 0
            const rate = project.mdRate ?? 0
            return { ...updated, amount: String(days * rate) }
          }
        }

        return updated
      })

      return next
    })
  }

  function startDraftEdit(invoice: Invoice) {
    setEditingInvoiceId(invoice.id)
    setInvoiceForm({
      customerId: invoice.customerId,
      issueDate: invoice.issueDate ? invoice.issueDate.slice(0, 10) : '',
      taxDate: invoice.taxDate ? invoice.taxDate.slice(0, 10) : '',
      duePreset: (invoice.duePreset as '14' | '30' | 'custom' | null) ?? 'custom',
      dueDateCustom: invoice.dueDate ? invoice.dueDate.slice(0, 10) : '',
      bankAccount: invoice.bankAccount ?? '',
      constantSymbol: invoice.constantSymbol ?? '',
      specificSymbol: invoice.specificSymbol ?? '',
      variableSymbol: invoice.variableSymbol ?? '',
      invoiceText: invoice.invoiceText ?? '',
      includeVat: invoice.includeVat,
      vatRate: (invoice.vatRate !== null ? String(invoice.vatRate) : '21') as CzechVatOption,
    })
    setInvoiceItems(
      invoice.items.map((item) => ({
        projectId: item.projectId,
        days: item.days ? String(item.days) : '',
        amount: String(item.amount),
      })),
    )
  }

  function clearInvoiceForm() {
    const defaultBankAccount = preferredInvoiceBankAccounts[0]?.accountNumber || accountProfile.bankAccount
    setEditingInvoiceId(null)
    setInvoiceForm({
      customerId: null,
      issueDate: '',
      taxDate: '',
      duePreset: '14',
      dueDateCustom: '',
      bankAccount: defaultBankAccount,
      constantSymbol: '',
      specificSymbol: '',
      variableSymbol: '',
      invoiceText: '',
      includeVat: true,
      vatRate: '21',
    })
    setInvoiceItems([])
  }

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    setAccountSaving(true)
    setAccountMessage('')
    try {
      const response = await fetch(apiUrl('/api/account'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bankAccount: accountProfile.bankAccount,
          bankAccounts: accountProfile.bankAccounts,
          companyIc: accountProfile.companyIc,
          logoDataUrl: accountProfile.logoDataUrl,
          isVatPayer: accountProfile.isVatPayer,
          requiresControlStatement: accountProfile.requiresControlStatement,
        }),
      })

      if (!response.ok) {
        throw new Error('Could not save account settings')
      }

      setAccountMessage(accountUiText.saved)
      const defaultBankAccount = preferredInvoiceBankAccounts[0]?.accountNumber || accountProfile.bankAccount
      setInvoiceForm((prev) => ({
        ...prev,
        bankAccount: prev.bankAccount || defaultBankAccount,
      }))
    } catch (err) {
      setAccountMessage(err instanceof Error ? err.message : 'Error')
    } finally {
      setAccountSaving(false)
    }
  }

  function handleGoogleLogin() {
    window.location.href = apiUrl('/api/auth/google/start')
  }

  function addBankAccountEntry() {
    setAccountProfile((prev) => ({
      ...prev,
      bankAccounts: [
        ...prev.bankAccounts,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          currency: 'CZK',
          accountNumber: '',
          label: '',
        },
      ],
    }))
  }

  function updateBankAccountEntry(id: string, field: keyof BankAccountOption, value: string) {
    setAccountProfile((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map((item) =>
        item.id === id ? { ...item, [field]: field === 'currency' ? value.toUpperCase() : value } : item,
      ),
    }))
  }

  function removeBankAccountEntry(id: string) {
    setAccountProfile((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((item) => item.id !== id),
    }))
  }

  function handleAccountLogoUpload(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setAccountProfile((prev) => ({ ...prev, logoDataUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (activeSection === 'invoices' && activeSubmenu === 'new' && !invoiceForm.bankAccount && accountProfile.bankAccount) {
      setInvoiceForm((prev) => ({ ...prev, bankAccount: accountProfile.bankAccount }))
    }
  }, [activeSection, activeSubmenu, invoiceForm.bankAccount, accountProfile.bankAccount])

  useEffect(() => {
    const allowedProjectIds = new Set(availableInvoiceProjects.map((project) => project.id))
    setInvoiceItems((prev) => {
      let changed = false
      const next = prev.map((item) => {
        if (item.projectId !== null && !allowedProjectIds.has(item.projectId)) {
          changed = true
          return { ...item, projectId: null, days: '', amount: '' }
        }
        return item
      })
      return changed ? next : prev
    })
  }, [availableInvoiceProjects])

  async function exportInvoicePdf(invoice: Invoice) {
    const totals = getInvoiceTotals(invoice)
    const currency = getInvoiceCurrency(invoice)
    const qrUrl = getInvoiceQrUrl(invoice)
    const logo = accountProfile.logoDataUrl
    const issueDate = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '-'
    const taxDate = invoice.taxDate ? new Date(invoice.taxDate).toLocaleDateString() : '-'
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'
    const html = `
      <html>
        <head>
          <title>Invoice #${invoice.id}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: 'Segoe UI', 'Inter', Arial, sans-serif;
              color: #1f2937;
              background: #f5f7fb;
              padding: 24px;
            }
            .sheet {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 14px;
              padding: 24px;
              box-shadow: 0 8px 28px rgba(0, 0, 0, 0.08);
            }
            .top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 14px;
            }
            .id { font-size: 28px; margin: 0; }
            .logo {
              max-width: 180px;
              max-height: 64px;
              object-fit: contain;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 14px;
            }
            .panel {
              border: 1px solid #dbe3f0;
              border-radius: 10px;
              padding: 10px 12px;
              background: #fbfdff;
            }
            .label { color: #6b7280; font-size: 12px; margin: 0 0 4px; }
            .value { color: #111827; font-size: 14px; margin: 0 0 8px; font-weight: 500; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              border: 1px solid #dbe3f0;
              border-radius: 10px;
              overflow: hidden;
            }
            th, td {
              padding: 9px 10px;
              text-align: left;
              border-bottom: 1px solid #e7edf7;
              font-size: 13px;
            }
            th { background: #f3f7ff; color: #1e3a8a; font-weight: 700; }
            td:last-child, th:last-child { text-align: right; }
            .totals {
              width: 280px;
              border: 1px solid #dbe3f0;
              border-radius: 10px;
              padding: 10px 12px;
              background: #fafcff;
            }
            .row { display: flex; justify-content: space-between; margin: 6px 0; }
            .grand { font-size: 18px; font-weight: 800; color: #0f3c7a; }
            .payment-row {
              margin-top: 14px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 12px;
            }
            .qr-wrap {
              display: flex;
              justify-content: flex-start;
              align-items: center;
              gap: 10px;
            }
            .qr-wrap img {
              width: 120px;
              height: 120px;
              border: 1px solid #dbe3f0;
              border-radius: 10px;
              padding: 4px;
              background: #fff;
            }
            @media print {
              body { background: #fff; padding: 0; }
              .sheet { box-shadow: none; border-radius: 0; width: auto; min-height: auto; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="top">
              <h1 class="id">Invoice #${invoice.id}</h1>
              ${logo ? `<img class="logo" src="${logo}" alt="Company logo" />` : ''}
            </div>
            <div class="grid">
              <div class="panel">
                <p class="label">${t.customer}</p>
                <p class="value">${invoice.customer?.name ?? '-'}</p>
                <p class="label">${t.icLabel}</p>
                <p class="value">${accountProfile.companyIc || '-'}</p>
                <p class="label">${t.invoiceTextLabel}</p>
                <p class="value">${invoice.invoiceText ?? '-'}</p>
              </div>
              <div class="panel">
                <p class="label">${t.issueDateLabel}</p><p class="value">${issueDate}</p>
                <p class="label">${t.taxDateLabel}</p><p class="value">${taxDate}</p>
                <p class="label">${t.dueDateLabel}</p><p class="value">${dueDate}</p>
                <p class="label">${t.bankAccountLabel}</p><p class="value">${invoice.bankAccount ?? '-'}</p>
                <p class="label">${t.constantSymbolLabel} / ${t.specificSymbolLabel} / ${t.variableSymbolLabel}</p>
                <p class="value">${invoice.constantSymbol ?? '-'} / ${invoice.specificSymbol ?? '-'} / ${invoice.variableSymbol ?? '-'}</p>
              </div>
            </div>
            <table>
            <thead><tr><th>${t.itemProjectLabel}</th><th>${t.itemDaysLabel}</th><th>${t.itemValueLabel}</th></tr></thead>
            <tbody>
              ${invoice.items
                .map(
                  (item) =>
                    `<tr><td>${projects.find((p) => p.id === item.projectId)?.name ?? '-'}</td><td>${item.days ?? '-'}</td><td>${formatMoney(item.amount, currency)}</td></tr>`,
                )
                .join('')}
            </tbody>
            </table>
            <div class="payment-row">
              ${qrUrl ? `<div class="qr-wrap"><img src="${qrUrl}" alt="Payment QR" /><div>Payment QR</div></div>` : '<div></div>'}
              <div class="totals">
                <div class="row"><span>Net</span><strong>${formatMoney(totals.net, currency)}</strong></div>
                <div class="row"><span>VAT ${invoice.includeVat ? `(${invoice.vatRate ?? 0}%)` : ''}</span><strong>${formatMoney(totals.vat, currency)}</strong></div>
                <div class="row grand"><span>Total</span><span>${formatMoney(totals.gross, currency)}</span></div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setInvoiceError('Could not open print window')
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()

    const triggerPrint = () => {
      printWindow.focus()
      printWindow.print()
    }

    const images = Array.from(printWindow.document.images)
    if (images.length === 0) {
      setTimeout(triggerPrint, 60)
      return
    }

    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve()
              return
            }

            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    )

    setTimeout(triggerPrint, 80)
  }

  function renderInvoicePreviewCard(invoice: Invoice) {
    const totals = getInvoiceTotals(invoice)
    const currency = getInvoiceCurrency(invoice)
    const qrUrl = getInvoiceQrUrl(invoice)
    return (
      <div className="invoice-preview-sheet">
        <div className="preview-top">
          <h3>Invoice #{invoice.id}</h3>
          <span className={`chip ${invoice.status}`}>{statusLabels[language][invoice.status]}</span>
        </div>
        <div className="preview-grid">
          <div className="preview-panel">
            <p className="meta-label">{t.customer}</p>
            <p className="meta-value">{invoice.customer?.name ?? '-'}</p>
            <p className="meta-label">{t.icLabel}</p>
            <p className="meta-value">{accountProfile.companyIc || '-'}</p>
            <p className="meta-label">{t.invoiceTextLabel}</p>
            <p className="meta-value">{invoice.invoiceText ?? '-'}</p>
          </div>
          <div className="preview-panel">
            <p className="meta-label">{t.issueDateLabel}</p>
            <p className="meta-value">{invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '-'}</p>
            <p className="meta-label">{t.taxDateLabel}</p>
            <p className="meta-value">{invoice.taxDate ? new Date(invoice.taxDate).toLocaleDateString() : '-'}</p>
            <p className="meta-label">{t.dueDateLabel}</p>
            <p className="meta-value">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</p>
            <p className="meta-label">{t.bankAccountLabel}</p>
            <p className="meta-value">{invoice.bankAccount ?? '-'}</p>
          </div>
        </div>
        <div className="preview-items">
          {invoice.items.map((item) => (
            <div key={item.id} className="preview-item-row">
              <span>{projects.find((p) => p.id === item.projectId)?.name ?? workspaceUiText.manualItem}</span>
              <span>{item.days ?? '-'}</span>
              <span>{formatMoney(item.amount, currency)}</span>
            </div>
          ))}
        </div>
        <div className="preview-payment-row">
          {qrUrl && invoice.status !== 'draft' ? (
            <div className="payment-qr-box">
              <p className="meta-label">{workspaceUiText.paymentQr}</p>
              <img src={qrUrl} alt={`Payment QR for invoice ${invoice.id}`} loading="lazy" />
            </div>
          ) : (
            <div />
          )}
          <div className="preview-totals">
            <p>{t.taxBaseLabel}: {formatMoney(totals.net, currency)}</p>
            <p>
              {t.vatAmountLabel}: {formatMoney(totals.vat, currency)} {invoice.includeVat ? `(${invoice.vatRate ?? 0}%)` : ''}
            </p>
            <p className="total-strong">{t.totalAmount}: {formatMoney(totals.gross, currency)}</p>
          </div>
        </div>
      </div>
    )
  }

  function renderDocumentPreviewCard(document: ReceivedDocument) {
    const net = document.baseAmount ?? (document.vatRate === 0 ? document.totalAmount ?? 0 : null)
    const vat = document.vatAmount ?? 0
    const total = document.totalAmount ?? ((net ?? 0) + vat)
    return (
      <div className="invoice-preview-sheet">
        <div className="preview-top">
          <h3>{documentsUiText.previewTitle}</h3>
          <span className={`chip ${document.status}`}>{document.status}</span>
        </div>

        <div className="preview-grid">
          <div className="preview-panel">
            <p className="meta-label">{documentsUiText.supplier}</p>
            <p className="meta-value">{document.supplierName ?? '-'}</p>
            <p className="meta-label">{documentsUiText.supplierIc}</p>
            <p className="meta-value">{document.supplierIc ?? '-'}</p>
            <p className="meta-label">{documentsUiText.invoiceNo}</p>
            <p className="meta-value">{document.invoiceNumber ?? '-'}</p>
          </div>
          <div className="preview-panel">
            <p className="meta-label">{t.issueDateLabel}</p>
            <p className="meta-value">{document.issueDate ? new Date(document.issueDate).toLocaleDateString() : '-'}</p>
            <p className="meta-label">{documentsUiText.bankAccount}</p>
            <p className="meta-value">{document.bankAccount ?? '-'}</p>
            <p className="meta-label">{documentsUiText.variableSymbol}</p>
            <p className="meta-value">{document.variableSymbol ?? '-'}</p>
            <p className="meta-label">{documentsUiText.constantSymbol}</p>
            <p className="meta-value">{document.constantSymbol ?? '-'}</p>
          </div>
        </div>

        <div className="preview-payment-row">
          <div />
          <div className="preview-totals">
            <p>{documentsUiText.baseAmount}: {net !== null ? formatMoney(net, document.currency) : '-'}</p>
            <p>{documentsUiText.vatAmount}: {formatMoney(vat, document.currency)}</p>
            <p className="total-strong">{documentsUiText.totalAmount}: {formatMoney(total, document.currency)}</p>
          </div>
        </div>
      </div>
    )
  }

  async function handleInvoiceCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !invoiceForm.customerId) {
      return
    }

    if (invoiceItems.length === 0) {
      setInvoiceError(workspaceUiText.addAtLeastOneItem)
      return
    }

    if (invoiceForm.duePreset === 'custom' && !invoiceForm.dueDateCustom) {
      setInvoiceError(workspaceUiText.selectCustomDueDate)
      return
    }

    setInvoiceSaving(true)
    setInvoiceError('')

    try {
      const endpoint = editingInvoiceId ? apiUrl(`/api/invoices/${editingInvoiceId}`) : apiUrl('/api/invoices')
      const method = editingInvoiceId ? 'PUT' : 'POST'
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: invoiceForm.customerId,
          issueDate: invoiceForm.issueDate ? new Date(invoiceForm.issueDate).toISOString() : undefined,
          dueDate: getDueDateIsoFromForm(),
          duePreset: invoiceForm.duePreset,
          bankAccount: invoiceForm.bankAccount || undefined,
          taxDate: invoiceForm.taxDate ? new Date(invoiceForm.taxDate).toISOString() : undefined,
          constantSymbol: invoiceForm.constantSymbol || undefined,
          specificSymbol: invoiceForm.specificSymbol || undefined,
          variableSymbol: invoiceForm.variableSymbol || undefined,
          invoiceText: invoiceForm.invoiceText || undefined,
          includeVat: invoiceForm.includeVat,
          vatRate: invoiceForm.vatRate ? Number(invoiceForm.vatRate) : undefined,
          items: invoiceItems.map((item) => ({
            projectId: item.projectId,
            days: item.days ? Number(item.days) : undefined,
            amount: getItemComputedAmount(item),
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Could not create invoice')
      }

      clearInvoiceForm()
      await loadInvoices(token, 'draft')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown API error'
      setInvoiceError(message)
    } finally {
      setInvoiceSaving(false)
    }
  }

  async function handleInvoiceStatusChange(invoiceId: number, newStatus: 'draft' | 'unpaid' | 'paid') {
    if (!token) return
    try {
      const response = await fetch(apiUrl(`/api/invoices/${invoiceId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error('Could not update invoice')
      await loadInvoices(token, invoiceStatus)
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : 'Error')
    }
  }

  async function handleInvoiceDelete(invoiceId: number) {
    if (!token) return
    try {
      const response = await fetch(apiUrl(`/api/invoices/${invoiceId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Could not delete invoice')
      await loadInvoices(token, invoiceStatus)
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : 'Error')
    }
  }

  async function submitDraftToUnpaid(invoiceId: number) {
    await handleInvoiceStatusChange(invoiceId, 'unpaid')
    if (editingInvoiceId === invoiceId) {
      clearInvoiceForm()
    }
  }

  async function loadCustomers(currentToken: string) {
    const res = await fetch(apiUrl('/api/customers'), {
      headers: { Authorization: `Bearer ${currentToken}` },
    })
    if (res.ok) {
      const data = (await res.json()) as Customer[]
      setCustomers(data)
    }
  }

  async function handleAresLookup() {
    const query = aresLookup.trim()
    if (!query) return
    setAresLoading(true)
    setAresMessage('')
    try {
      const res = await fetch(apiUrl(`/api/ares/${encodeURIComponent(query)}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) {
        setAresMessage(t.companyNotFound)
        return
      }
      if (!res.ok) {
        setAresMessage(t.lookupError)
        return
      }
      const data = (await res.json()) as {
        ico: string
        dic: string | null
        name: string | null
        address: string | null
        city: string | null
        zip: string | null
        country: string
      }
      setCustomerForm({
        name: data.name ?? '',
        ic: data.ico ?? '',
        dic: data.dic ?? '',
        email: '',
        phone: '',
        address: data.address ?? '',
        city: data.city ?? '',
        zip: data.zip ?? '',
        country: data.country ?? '',
      })
    } catch {
      setAresMessage(t.lookupError)
    } finally {
      setAresLoading(false)
    }
  }

  async function handleSaveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setCustomerSaving(true)
    setCustomerSaveMsg('')
    try {
      const res = await fetch(apiUrl('/api/customers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(customerForm),
      })
      if (!res.ok) {
        throw new Error('Could not save customer')
      }
      setCustomerForm(emptyCustomerForm)
      setAresLookup('')
      setCustomerSaveMsg(t.customerSaved)
      await loadCustomers(token)
    } catch (err) {
      setCustomerSaveMsg(err instanceof Error ? err.message : 'Error')
    } finally {
      setCustomerSaving(false)
    }
  }

  async function loadProjects(currentToken: string, archived = false) {
    const res = await fetch(apiUrl(withSelectedUserFilter(`/api/projects?archived=${archived ? 'true' : 'false'}`)), {
      headers: { Authorization: `Bearer ${currentToken}` },
    })
    if (res.ok) {
      const data = (await res.json()) as Project[]
      setProjects(data)
    }
  }

  async function loadAdminUsers(currentToken: string) {
    const res = await fetch(apiUrl('/api/users'), {
      headers: { Authorization: `Bearer ${currentToken}` },
    })
    if (!res.ok) {
      setAdminUsers([])
      return
    }
    const data = (await res.json()) as AdminUserOption[]
    setAdminUsers(data)
  }

  async function loadReportData(currentToken: string) {
    setReportLoading(true)
    setReportError('')
    try {
      const [draftRes, unpaidRes, paidRes, ordersRes, projectsRes] = await Promise.all([
        fetch(apiUrl(withSelectedUserFilter('/api/invoices?status=draft')), { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch(apiUrl(withSelectedUserFilter('/api/invoices?status=unpaid')), { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch(apiUrl(withSelectedUserFilter('/api/invoices?status=paid')), { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch(apiUrl(withSelectedUserFilter('/api/orders')), { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch(apiUrl(withSelectedUserFilter('/api/projects?archived=false')), { headers: { Authorization: `Bearer ${currentToken}` } }),
      ])

      if (!draftRes.ok || !unpaidRes.ok || !paidRes.ok || !ordersRes.ok || !projectsRes.ok) {
        throw new Error(workspaceUiText.couldNotLoadReports)
      }

      const [draft, unpaid, paid, reportOrdersData, reportProjectsData] = await Promise.all([
        draftRes.json() as Promise<Invoice[]>,
        unpaidRes.json() as Promise<Invoice[]>,
        paidRes.json() as Promise<Invoice[]>,
        ordersRes.json() as Promise<Order[]>,
        projectsRes.json() as Promise<Project[]>,
      ])

      setReportInvoices([...draft, ...unpaid, ...paid])
      setReportOrders(reportOrdersData)
      setReportProjects(reportProjectsData)
    } catch (err) {
      setReportError(err instanceof Error ? err.message : workspaceUiText.couldNotLoadReports)
    } finally {
      setReportLoading(false)
    }
  }

  function exportReportCsv(rows: Array<Record<string, string | number>>, filePrefix = 'invoicer-report') {
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = String(row[header] ?? '')
            return `"${value.replace(/"/g, '""')}"`
          })
          .join(','),
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportTaxesCsv(view: 'current' | 'history', invoices: Invoice[]) {
    if (view === 'current') {
      const rateRows = getTaxRateSummary(invoices).map((row) => ({
        section: t.taxReturnSection,
        label: row.label,
        documents: row.count,
        taxBase: row.base.toFixed(2),
        vatAmount: row.vat.toFixed(2),
      }))
      const controlRows = getControlStatementSummary(invoices).map((row) => ({
        section: t.controlStatementSection,
        label: row.label,
        documents: row.count,
        taxBase: row.base.toFixed(2),
        vatAmount: row.vat.toFixed(2),
      }))
      exportReportCsv([...rateRows, ...controlRows], 'invoicer-taxes-current')
      return
    }

    exportReportCsv(
      getTaxHistoryRows(invoices).map((row) => ({
        period: row.period,
        documents: row.count,
        taxBase: row.totalBase.toFixed(2),
        vatAmount: row.totalVat.toFixed(2),
        base21: row.base21.toFixed(2),
        vat21: row.vat21.toFixed(2),
        base12: row.base12.toFixed(2),
        vat12: row.vat12.toFixed(2),
        base0: row.base0.toFixed(2),
        vat0: row.vat0.toFixed(2),
      })),
      'invoicer-taxes-history',
    )
  }

  async function exportTaxesPdf(view: 'current' | 'history', invoices: Invoice[]) {
    const currency = invoices.map((invoice) => getInvoiceCurrency(invoice)).find(Boolean) ?? 'CZK'
    const rateSummary = getTaxRateSummary(invoices)
    const controlSummary = getControlStatementSummary(invoices)
    const historyRows = getTaxHistoryRows(invoices)
    const html = `
      <html>
        <head>
          <title>${t.taxesOverview}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 24px; font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #f5f7fb; }
            .sheet { max-width: 960px; margin: 0 auto; background: #fff; border-radius: 14px; padding: 24px; box-shadow: 0 8px 28px rgba(0,0,0,0.08); }
            h1 { margin: 0 0 8px; }
            .meta { color: #6b7280; margin: 0 0 16px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #dbe3f0; border-radius: 10px; padding: 12px; background: #fbfdff; }
            .label { color: #6b7280; font-size: 12px; margin: 0 0 6px; }
            .value { font-size: 18px; font-weight: 700; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e7edf7; font-size: 13px; }
            th { background: #f3f7ff; color: #1e3a8a; }
            td:last-child, th:last-child { text-align: right; }
            .section { margin-top: 18px; }
            .note { color: #8a4b00; background: #fff7e6; border: 1px solid #f1d08a; padding: 10px 12px; border-radius: 10px; margin-top: 12px; }
            @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; border-radius: 0; max-width: none; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>${t.taxesOverview} / ${view === 'current' ? t.currentSubmenu : t.historySubmenu}</h1>
            <p class="meta">${t.taxPeriodLabel}: ${reportRange} · ${t.taxDisclaimer}</p>
            ${
              view === 'current'
                ? `<div class="grid">${rateSummary
                    .map(
                      (row) => `<div class="card"><p class="label">${row.label}</p><p class="value">${row.base.toFixed(2)} ${currency}</p><p class="label">${t.vatAmountLabel}: ${row.vat.toFixed(2)} ${currency} · ${t.taxDocumentsLabel}: ${row.count}</p></div>`,
                    )
                    .join('')}</div>
                   <div class="section">
                     <h2>${t.controlStatementSection}</h2>
                     <table>
                       <thead><tr><th>${t.status}</th><th>${t.taxDocumentsLabel}</th><th>${t.taxBaseLabel}</th><th>${t.vatAmountLabel}</th></tr></thead>
                       <tbody>
                         ${controlSummary
                           .map(
                             (row) => `<tr><td>${row.label}</td><td>${row.count}</td><td>${row.base.toFixed(2)} ${currency}</td><td>${row.vat.toFixed(2)} ${currency}</td></tr>`,
                           )
                           .join('')}
                       </tbody>
                     </table>
                     <p class="note">${t.controlStatementHint}</p>
                   </div>`
                : `<div class="section">
                     <h2>${t.taxHistoryHint}</h2>
                     <table>
                       <thead><tr><th>${t.taxPeriodLabel}</th><th>${t.taxDocumentsLabel}</th><th>${t.taxBaseLabel}</th><th>${t.vatAmountLabel}</th></tr></thead>
                       <tbody>
                         ${historyRows
                           .map(
                             (row) => `<tr><td>${row.period}</td><td>${row.count}</td><td>${row.totalBase.toFixed(2)} ${currency}</td><td>${row.totalVat.toFixed(2)} ${currency}</td></tr>`,
                           )
                           .join('')}
                       </tbody>
                     </table>
                   </div>`
            }
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setReportError(workspaceUiText.couldNotOpenPrintWindow)
      return
    }

    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 80)
  }

  async function loadOrders(currentToken: string, archived?: boolean) {
    const query = typeof archived === 'boolean' ? `?archived=${archived ? 'true' : 'false'}` : ''
    const res = await fetch(apiUrl(withSelectedUserFilter(`/api/orders${query}`)), {
      headers: { Authorization: `Bearer ${currentToken}` },
    })
    if (res.ok) {
      const data = (await res.json()) as Order[]
      setOrders(data)
      if (typeof archived === 'undefined') {
        setAllOrders(data)
      }
    }
  }

  async function handleSaveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !orderForm.customerId) return
    setOrderSaving(true)
    setOrderSaveMsg('')
    try {
      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: orderForm.customerId,
          title: orderForm.title,
          code: orderForm.code || undefined,
          amount: orderForm.amount ? Number(orderForm.amount) : undefined,
          currency: orderForm.currency,
        }),
      })
      if (!res.ok) {
        throw new Error('Could not save order')
      }
      setOrderForm(emptyOrderForm)
      setOrderSaveMsg('Order saved.')
      // Reload active orders where new orders are created
      await loadOrders(token, false)
    } catch (err) {
      setOrderSaveMsg(err instanceof Error ? err.message : 'Error')
    } finally {
      setOrderSaving(false)
    }
  }

  async function handleDeleteOrder(orderId: number) {
    if (!token) return
    const confirmed = window.confirm('Delete this order? This cannot be undone.')
    if (!confirmed) return

    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Could not delete order')
      }
      setPreviewOrder((prev) => (prev?.id === orderId ? null : prev))
      const archived = activeSubmenu === 'history' ? true : activeSubmenu === 'active' ? false : undefined
      await loadOrders(token, archived)
      setOrderSaveMsg('Order deleted.')
    } catch (err) {
      setOrderSaveMsg(err instanceof Error ? err.message : 'Error')
    }
  }

  async function handleDeleteCustomer(customerId: number) {
    if (!token) return
    const confirmed = window.confirm(t.deleteContactConfirm)
    if (!confirmed) return

    try {
      const res = await fetch(apiUrl(`/api/customers/${customerId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Could not delete customer')
      }
      setCustomerSaveMsg(t.contactDeleted)
      setPreviewCustomer((prev) => (prev?.id === customerId ? null : prev))
      await loadCustomers(token)
      await loadOrders(token)
    } catch (err) {
      setCustomerSaveMsg(err instanceof Error ? err.message : 'Error')
    }
  }

  async function handleSaveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !projectForm.orderId) {
      setProjectSaveMsg('Select an order first.')
      return
    }
    setProjectSaving(true)
    setProjectSaveMsg('')
    try {
      const res = await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: projectForm.orderId,
          name: projectForm.name,
          pricingMode: projectForm.pricingMode,
          days: projectForm.days ? Number(projectForm.days) : undefined,
          budget: projectForm.budget ? Number(projectForm.budget) : undefined,
          mdRate: projectForm.mdRate ? Number(projectForm.mdRate) : undefined,
          currency: projectForm.currency,
        }),
      })
      if (!res.ok) {
        throw new Error('Could not save project')
      }
      setProjectForm(emptyProjectForm)
      setProjectSaveMsg(t.projectSaved)
      // Reload active projects where new projects are created
      await loadProjects(token, false)
    } catch (err) {
      setProjectSaveMsg(err instanceof Error ? err.message : 'Error')
    } finally {
      setProjectSaving(false)
    }
  }

  async function handleDeleteProject(projectId: number) {
    if (!token) return
    const confirmed = window.confirm('Delete this project? This cannot be undone.')
    if (!confirmed) return

    try {
      const res = await fetch(apiUrl(`/api/projects/${projectId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Could not delete project')
      }
      setPreviewProject((prev) => (prev?.id === projectId ? null : prev))
      const archived = activeSubmenu === 'history'
      await loadProjects(token, archived)
      setProjectSaveMsg('Project deleted.')
    } catch (err) {
      setProjectSaveMsg(err instanceof Error ? err.message : 'Error')
    }
  }

  useEffect(() => {
    if (!token || activeSection !== 'projects') {
      return
    }

    const archived = activeSubmenu === 'history'
    void loadProjects(token, archived).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown API error'
      setProjectSaveMsg(message)
    })
    void loadOrders(token).catch(() => undefined)
  }, [token, activeSection, activeSubmenu, selectedAdminUserId, user?.isAdmin])

  useEffect(() => {
    if (!token || activeSection !== 'orders') {
      return
    }

    const archived = activeSubmenu === 'history' ? true : activeSubmenu === 'active' ? false : undefined

    void loadOrders(token, archived).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown API error'
      setOrderSaveMsg(message)
    })
  }, [token, activeSection, activeSubmenu])

  useEffect(() => {
    if (!token || (activeSection !== 'reports' && activeSection !== 'taxes')) {
      return
    }

    void loadReportData(token)
  }, [token, activeSection, selectedAdminUserId, user?.isAdmin])

  useEffect(() => {
    if (activeSection === 'orders' && (activeSubmenu === 'active' || activeSubmenu === 'history')) {
      setPreviewOrder((prev) => {
        if (prev && orders.some((order) => order.id === prev.id)) {
          return prev
        }
        return orders[0] ?? null
      })
      return
    }
    setPreviewOrder(null)
  }, [activeSection, activeSubmenu, orders])

  useEffect(() => {
    if (activeSection === 'projects' && (activeSubmenu === 'current' || activeSubmenu === 'history')) {
      setPreviewProject((prev) => {
        if (prev && projects.some((project) => project.id === prev.id)) {
          return prev
        }
        return projects[0] ?? null
      })
      return
    }
    setPreviewProject(null)
  }, [activeSection, activeSubmenu, projects])

  useEffect(() => {
    if (activeSection === 'customers' && activeSubmenu === 'contacts') {
      setPreviewCustomer((prev) => {
        if (prev && customers.some((customer) => customer.id === prev.id)) {
          return prev
        }
        return customers[0] ?? null
      })
      return
    }
    setPreviewCustomer(null)
  }, [activeSection, activeSubmenu, customers])

  useEffect(() => {
    setDocumentMessage('')
    setCustomerSaveMsg('')
    setAresMessage('')
  }, [activeSection, activeSubmenu])

  function handleMenuSelect(section: MenuSection) {
    const nextItem = menuItems.find((item) => item.key === section)
    if (!nextItem) {
      return
    }

    setActiveSection(section)
    setActiveSubmenu(nextItem.submenus[0])
  }

  function handleSubmenuSelect(section: MenuSection, submenu: SubmenuKey) {
    setActiveSection(section)
    setActiveSubmenu(submenu)
  }

  function renderSectionContent() {
    if (activeSection === 'taxes') {
      const scopedInvoices = getScopedTaxInvoices(reportRange)
      const rateSummary = getTaxRateSummary(scopedInvoices)
      const controlSummary = getControlStatementSummary(scopedInvoices)
      const isVatPayer = accountProfile.isVatPayer
      const requiresControlStatement = accountProfile.isVatPayer && accountProfile.requiresControlStatement

      if (activeSubmenu === 'current') {
        const currentBase = scopedInvoices.reduce((sum, invoice) => sum + getInvoiceTotals(invoice).net, 0)
        const currentVat = isVatPayer
          ? scopedInvoices.reduce((sum, invoice) => sum + getInvoiceTotals(invoice).vat, 0)
          : 0

        return (
          <section className="card">
            <div className="report-head-row">
              <h2>{t.taxesOverview} / {t.currentSubmenu}</h2>
              <div className="report-actions">
                <label>
                  {t.taxPeriodLabel}
                  <select value={reportRange} onChange={(event) => setReportRange(event.target.value as PeriodRange)}>
                    <option value="month">{t.reportRangeMonth}</option>
                    <option value="quarter">{t.reportRangeQuarter}</option>
                    <option value="year">{t.reportRangeYear}</option>
                    <option value="all">{t.reportRangeAll}</option>
                  </select>
                </label>
                <button type="button" onClick={() => exportTaxesCsv('current', scopedInvoices)}>
                  {t.exportCsv}
                </button>
                <button type="button" onClick={() => void exportTaxesPdf('current', scopedInvoices)}>
                  {t.exportPdf}
                </button>
              </div>
            </div>
            <p className="meta report-ideas">{t.taxCurrentHint}</p>
            {!isVatPayer && <p className="meta tax-note-inline">{accountUiText.taxesDisabledHint}</p>}
            <div className="report-kpi-grid">
              <div className="report-kpi-card">
                <p className="meta-label">{t.taxBaseLabel}</p>
                <p className="stat-value">{currentBase.toFixed(2)}</p>
              </div>
              <div className="report-kpi-card">
                <p className="meta-label">{t.vatAmountLabel}</p>
                <p className="stat-value">{currentVat.toFixed(2)}</p>
              </div>
              <div className="report-kpi-card">
                <p className="meta-label">{t.paidInvoicesLabel}</p>
                <p className="stat-value">{scopedInvoices.filter((invoice) => invoice.status === 'paid').length}</p>
              </div>
              <div className="report-kpi-card">
                <p className="meta-label">{t.overdueLabel}</p>
                <p className="stat-value">{scopedInvoices.filter((invoice) => invoice.status === 'unpaid').length}</p>
              </div>
            </div>
            <div className="report-two-col tax-panels">
              <div className="report-panel">
                <h3>{t.taxReturnSection}</h3>
                <div className="tax-summary-list">
                  {rateSummary.map((row) => (
                    <div key={row.rate} className="tax-summary-row">
                      <div>
                        <p className="customer">{row.label}</p>
                        <p className="meta">{t.taxDocumentsLabel}: {row.count}</p>
                      </div>
                      <div className="right tax-values">
                        <p>{t.taxBaseLabel}: {row.base.toFixed(2)}</p>
                        <p>{t.taxOutputLabel}: {(isVatPayer ? row.vat : 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {requiresControlStatement && (
                <div className="report-panel">
                  <h3>{t.controlStatementSection}</h3>
                  <div className="tax-summary-list">
                    {controlSummary.map((row) => (
                      <div key={row.label} className="tax-summary-row">
                        <div>
                          <p className="customer">{row.label}</p>
                          <p className="meta">{t.taxDocumentsLabel}: {row.count}</p>
                        </div>
                        <div className="right tax-values">
                          <p>{t.taxBaseLabel}: {row.base.toFixed(2)}</p>
                          <p>{t.vatAmountLabel}: {row.vat.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="tax-note">{t.controlStatementHint}</p>
                </div>
              )}
            </div>
            <p className="meta tax-note-inline">{t.taxDisclaimer}</p>
          </section>
        )
      }

      const groupedHistory = getTaxHistoryRows(scopedInvoices)

      return (
        <section className="card">
          <div className="report-head-row">
            <h2>{t.taxesOverview} / {t.historySubmenu}</h2>
            <div className="report-actions">
              <label>
                {t.taxPeriodLabel}
                <select value={reportRange} onChange={(event) => setReportRange(event.target.value as PeriodRange)}>
                  <option value="month">{t.reportRangeMonth}</option>
                  <option value="quarter">{t.reportRangeQuarter}</option>
                  <option value="year">{t.reportRangeYear}</option>
                  <option value="all">{t.reportRangeAll}</option>
                </select>
              </label>
              <button type="button" onClick={() => exportTaxesCsv('history', scopedInvoices)}>
                {t.exportCsv}
              </button>
              <button type="button" onClick={() => void exportTaxesPdf('history', scopedInvoices)}>
                {t.exportPdf}
              </button>
            </div>
          </div>
          <p className="meta report-ideas">{t.taxHistoryHint}</p>
          <div className="report-panel">
            {groupedHistory.length === 0 && <p className="empty">-</p>}
            {groupedHistory.map((row) => (
              <div key={row.period} className="tax-history-row">
                <div>
                  <p className="customer">{row.period}</p>
                  <p className="meta">{t.taxDocumentsLabel}: {row.count}</p>
                </div>
                <div className="right">
                  <p>{t.taxBaseLabel}: {row.totalBase.toFixed(2)}</p>
                  <p>{t.vatAmountLabel}: {(isVatPayer ? row.totalVat : 0).toFixed(2)}</p>
                  {isVatPayer && <p className="meta">21%: {row.base21.toFixed(2)} / {row.vat21.toFixed(2)} · 12%: {row.base12.toFixed(2)} / {row.vat12.toFixed(2)} · 0%: {row.base0.toFixed(2)} / {row.vat0.toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
          <p className="meta tax-note-inline">{t.taxDisclaimer}</p>
        </section>
      )
    }

    if (activeSection === 'reports') {
      const now = new Date()
      const rangeStart =
        reportRange === 'month'
          ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
          : reportRange === 'quarter'
            ? new Date(now.getFullYear(), now.getMonth() - 3, 1)
            : reportRange === 'year'
              ? new Date(now.getFullYear() - 1, now.getMonth(), 1)
              : null

      const scopedInvoices = reportInvoices.filter((invoice) => {
        const sourceDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date(invoice.createdAt)
        return rangeStart ? sourceDate >= rangeStart : true
      })

      const periodPaidInvoices = scopedInvoices.filter((invoice) => invoice.status === 'paid')

      const monthRevenue = periodPaidInvoices.reduce((sum, invoice) => sum + getInvoiceTotals(invoice).gross, 0)
      const receivables = scopedInvoices
        .filter((invoice) => invoice.status === 'unpaid')
        .reduce((sum, invoice) => sum + getInvoiceTotals(invoice).gross, 0)
      const overdueInvoices = scopedInvoices.filter(
        (invoice) => invoice.status === 'unpaid' && Boolean(invoice.dueDate) && new Date(invoice.dueDate as string) < now,
      )

      const topProjects = [...reportProjects]
        .map((project) => {
          const total = project.pricingMode === 'md' ? (project.days ?? 0) : (project.budget ?? 0)
          const used = project.pricingMode === 'md' ? project.daysUsed : project.budgetUsed
          return {
            ...project,
            percent: getConsumptionPercent(used, total),
          }
        })
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 5)

      const activeOrderConsumption = reportOrders
        .filter((order) => !order.archived)
        .map((order) => {
          const mdPercent = getConsumptionPercent(order.consumption.mdUsed, order.consumption.mdTotal)
          const budgetPercent = getConsumptionPercent(order.consumption.budgetUsed, order.consumption.budgetTotal)
          const combinedPercent = Math.max(mdPercent, budgetPercent)
          return { order, mdPercent, budgetPercent, combinedPercent }
        })
        .sort((a, b) => b.combinedPercent - a.combinedPercent)
        .slice(0, 5)

      const timelineMonths = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return { date, key }
      })

      const timelineRows = timelineMonths.map(({ date, key }) => {
        const paid = scopedInvoices
          .filter((invoice) => invoice.status === 'paid')
          .filter((invoice) => {
            const sourceDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date(invoice.createdAt)
            return sourceDate.getFullYear() === date.getFullYear() && sourceDate.getMonth() === date.getMonth()
          })
          .reduce((sum, invoice) => sum + getInvoiceTotals(invoice).gross, 0)

        const overdue = scopedInvoices
          .filter((invoice) => invoice.status === 'unpaid' && Boolean(invoice.dueDate) && new Date(invoice.dueDate as string) < now)
          .filter((invoice) => {
            const dueDate = new Date(invoice.dueDate as string)
            return dueDate.getFullYear() === date.getFullYear() && dueDate.getMonth() === date.getMonth()
          })
          .reduce((sum, invoice) => sum + getInvoiceTotals(invoice).gross, 0)

        return {
          key,
          label: date.toLocaleDateString(language === 'cz' ? 'cs-CZ' : undefined, {
            month: 'short',
            year: '2-digit',
          }),
          paid,
          overdue,
        }
      })

      const timelineMax = Math.max(
        1,
        ...timelineRows.map((row) => row.paid),
        ...timelineRows.map((row) => row.overdue),
      )

      return (
        <section className="card">
          <div className="report-head-row">
            <h2>{t.reportsOverview}</h2>
            <div className="report-actions">
              <label>
                {t.reportRangeLabel}
                <select value={reportRange} onChange={(event) => setReportRange(event.target.value as 'month' | 'quarter' | 'year' | 'all')}>
                  <option value="month">{t.reportRangeMonth}</option>
                  <option value="quarter">{t.reportRangeQuarter}</option>
                  <option value="year">{t.reportRangeYear}</option>
                  <option value="all">{t.reportRangeAll}</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  exportReportCsv(
                    scopedInvoices.map((invoice) => ({
                      id: invoice.id,
                      customer: invoice.customer?.name ?? '-',
                      status: invoice.status,
                      issueDate: invoice.issueDate ?? invoice.createdAt,
                      dueDate: invoice.dueDate ?? '-',
                      total: getInvoiceTotals(invoice).gross.toFixed(2),
                    })),
                  )
                }
              >
                {t.exportCsv}
              </button>
            </div>
          </div>
          {reportLoading && <p className="meta">{workspaceUiText.loadingReports}</p>}
          {reportError && <p className="error">{reportError}</p>}

          <div className="report-kpi-grid">
            <div className="report-kpi-card">
              <p className="meta-label">{t.periodRevenueLabel}</p>
              <p className="stat-value">{monthRevenue.toFixed(2)}</p>
            </div>
            <div className="report-kpi-card">
              <p className="meta-label">{t.receivablesLabel}</p>
              <p className="stat-value">{receivables.toFixed(2)}</p>
            </div>
            <div className="report-kpi-card">
              <p className="meta-label">{t.overdueLabel}</p>
              <p className="stat-value">{overdueInvoices.length}</p>
            </div>
            <div className="report-kpi-card">
              <p className="meta-label">{t.paidInvoicesLabel}</p>
              <p className="stat-value">{scopedInvoices.filter((i) => i.status === 'paid').length}</p>
            </div>
          </div>

          <div className="report-two-col">
            <div className="report-panel">
              <h3>{t.topProjectsByConsumption}</h3>
              {topProjects.length === 0 && <p className="empty">-</p>}
              {topProjects.map((project) => (
                <div key={project.id} className="consumption-row">
                  <div className="consumption-head">
                    <span>{project.name}</span>
                    <strong>{project.percent.toFixed(0)}%</strong>
                  </div>
                  <div className="consumption-track">
                    <span className="consumption-fill md" style={{ width: `${project.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="report-panel">
              <h3>{t.topOrdersByConsumption}</h3>
              {activeOrderConsumption.length === 0 && <p className="empty">-</p>}
              {activeOrderConsumption.map(({ order, combinedPercent }) => (
                <div key={order.id} className="consumption-row">
                  <div className="consumption-head">
                    <span>{order.title}</span>
                    <strong>{combinedPercent.toFixed(0)}%</strong>
                  </div>
                  <div className="consumption-track">
                    <span className="consumption-fill budget" style={{ width: `${combinedPercent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="meta report-ideas">{t.reportIdeas}</p>

          <div className="report-panel timeline-panel">
            <h3>{t.cashflowTimeline}</h3>
            <div className="timeline-grid">
              {timelineRows.map((row) => (
                <div key={row.key} className="timeline-col">
                  <div className="timeline-bars">
                    <div
                      className="timeline-bar paid"
                      style={{ height: `${(row.paid / timelineMax) * 100}%` }}
                      title={`${t.paidFlowLabel}: ${row.paid.toFixed(2)}`}
                    />
                    <div
                      className="timeline-bar overdue"
                      style={{ height: `${(row.overdue / timelineMax) * 100}%` }}
                      title={`${t.overdueFlowLabel}: ${row.overdue.toFixed(2)}`}
                    />
                  </div>
                  <p className="meta timeline-label">{row.label}</p>
                </div>
              ))}
            </div>
            <div className="timeline-legend">
              <span className="legend-dot paid" />
              <span>{t.paidFlowLabel}</span>
              <span className="legend-dot overdue" />
              <span>{t.overdueFlowLabel}</span>
            </div>
          </div>
        </section>
      )
    }

    if (activeSection === 'documents') {
      const documentCurrency = documentForm.currency || 'CZK'
      return (
        <section className="card">
          <h2>{t.documents}</h2>
          {activeSubmenu === 'new' ? (
            <div className="report-two-col tax-panels document-upload-layout">
              <div className="report-panel documents-panel">
                <label>
                  {documentsUiText.uploadLabel}
                  <input
                    type="file"
                    accept="application/pdf,image/*,text/plain"
                    onChange={(event) => void handleDocumentFileUpload(event.target.files?.[0] ?? null)}
                  />
                </label>
                <p className="meta">{documentExtracting ? documentsUiText.extracting : documentsUiText.dropHint}</p>
                {documentMatchedCustomer && (
                  <p className="meta">
                    {documentsUiText.matchedSupplier} <strong>{documentMatchedCustomer.name}</strong>
                    {documentMatchedCustomer.ic ? ` (IC: ${documentMatchedCustomer.ic})` : ''}
                  </p>
                )}

                <div className="invoice-form-grid">
                <label>
                  {documentsUiText.fileName}
                  <input
                    className={isAutofilledField('fileName') ? 'autofilled-field' : ''}
                    value={documentForm.fileName}
                    onChange={(event) => updateDocumentField('fileName', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.supplier}
                  <input
                    className={isAutofilledField('supplierName') ? 'autofilled-field' : ''}
                    value={documentForm.supplierName}
                    onChange={(event) => updateDocumentField('supplierName', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.supplierIc}
                  <input
                    className={isAutofilledField('supplierIc') ? 'autofilled-field' : ''}
                    value={documentForm.supplierIc}
                    onChange={(event) => updateDocumentField('supplierIc', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.invoiceNo}
                  <input
                    className={isAutofilledField('invoiceNumber') ? 'autofilled-field' : ''}
                    value={documentForm.invoiceNumber}
                    onChange={(event) => updateDocumentField('invoiceNumber', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.bankAccount}
                  <input
                    className={isAutofilledField('bankAccount') ? 'autofilled-field' : ''}
                    value={documentForm.bankAccount}
                    onChange={(event) => updateDocumentField('bankAccount', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.variableSymbol}
                  <input
                    className={isAutofilledField('variableSymbol') ? 'autofilled-field' : ''}
                    value={documentForm.variableSymbol}
                    onChange={(event) => updateDocumentField('variableSymbol', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.constantSymbol}
                  <input
                    className={isAutofilledField('constantSymbol') ? 'autofilled-field' : ''}
                    value={documentForm.constantSymbol}
                    onChange={(event) => updateDocumentField('constantSymbol', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.issueDate}
                  <input
                    type="date"
                    className={isAutofilledField('issueDate') ? 'autofilled-field' : ''}
                    value={documentForm.issueDate}
                    onChange={(event) => updateDocumentField('issueDate', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.dueDate}
                  <input
                    type="date"
                    className={isAutofilledField('dueDate') ? 'autofilled-field' : ''}
                    value={documentForm.dueDate}
                    onChange={(event) => updateDocumentField('dueDate', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.currency}
                  <input
                    className={isAutofilledField('currency') ? 'autofilled-field' : ''}
                    value={documentCurrency}
                    onChange={(event) => updateDocumentField('currency', event.target.value.toUpperCase())}
                  />
                </label>
                <label>
                  {documentsUiText.vatRate}
                  <input
                    className={isAutofilledField('vatRate') ? 'autofilled-field' : ''}
                    value={documentForm.vatRate}
                    onChange={(event) => updateDocumentField('vatRate', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.baseAmount}
                  <input
                    className={isAutofilledField('baseAmount') ? 'autofilled-field' : ''}
                    value={documentForm.baseAmount}
                    onChange={(event) => updateDocumentField('baseAmount', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.vatAmount}
                  <input
                    className={isAutofilledField('vatAmount') ? 'autofilled-field' : ''}
                    value={documentForm.vatAmount}
                    onChange={(event) => updateDocumentField('vatAmount', event.target.value)}
                  />
                </label>
                <label>
                  {documentsUiText.totalAmount}
                  <input
                    className={isAutofilledField('totalAmount') ? 'autofilled-field' : ''}
                    value={documentForm.totalAmount}
                    onChange={(event) => updateDocumentField('totalAmount', event.target.value)}
                  />
                </label>
                </div>

                <label>
                  {documentsUiText.extractedText}
                  <textarea
                    className={isAutofilledField('extractedText') ? 'autofilled-field' : ''}
                    value={documentForm.extractedText}
                    onChange={(event) => updateDocumentField('extractedText', event.target.value)}
                    rows={8}
                  />
                </label>

                <p className="meta">{documentsUiText.autofillHint}</p>

                <div className="invoice-form-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={documentSaving || documentExtracting}
                    onClick={() => void handleDocumentSave('draft')}
                  >
                    {documentSaving ? accountUiText.saving : documentsUiText.saveDraft}
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={documentSaving || documentExtracting}
                    onClick={() => void handleDocumentSave('approved')}
                  >
                    {documentSaving ? accountUiText.saving : documentsUiText.approveStore}
                  </button>
                </div>
              </div>
              <div className="report-panel documents-panel document-upload-preview-panel">
                <h3>{documentsUiText.previewTitle}</h3>
                {documentUploadPreviewType === 'pdf' && documentUploadPreviewUrl ? (
                  <iframe
                    className="uploaded-document-frame"
                    src={documentUploadPreviewUrl}
                    title={documentsUiText.previewTitle}
                  />
                ) : documentUploadPreviewType === 'image' && documentUploadPreviewUrl ? (
                  <img className="uploaded-document-image" src={documentUploadPreviewUrl} alt={documentsUiText.previewTitle} />
                ) : (
                  <p className="empty">{documentsUiText.uploadPreviewHint}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="report-two-col tax-panels">
              <div className="report-panel documents-panel">
              {documents.length === 0 ? (
                <p className="empty">{documentsUiText.storedEmpty}</p>
              ) : (
                <ul className="invoice-list">
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      className={previewDocument?.id === doc.id ? 'selected-list-item' : ''}
                      onClick={() => setPreviewDocument(doc)}
                    >
                      <div>
                        <p className="customer">{doc.supplierName || doc.fileName}</p>
                        <p className="meta">
                          #{doc.invoiceNumber || '-'} • {doc.totalAmount?.toFixed(2) ?? '-'} {doc.currency} •{' '}
                          {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : '-'}
                        </p>
                        <span className={`chip ${doc.status}`}>{doc.status}</span>
                      </div>
                      <div className="right action-stack" onClick={(event) => event.stopPropagation()}>
                        <button className="icon-delete" type="button" onClick={() => void handleDocumentDelete(doc.id)}>{t.deleteAction}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              </div>
              <div className="report-panel documents-panel">
                {previewDocument ? renderDocumentPreviewCard(previewDocument) : <p className="empty">-</p>}
              </div>
            </div>
          )}

          {documentMessage && <p className="error">{documentMessage}</p>}
        </section>
      )
    }

    if (activeSection === 'account') {
      return (
        <section className="card">
          <h2>{accountUiText.title}</h2>
          <form className="account-form" onSubmit={handleSaveAccount}>
            <div className="report-panel documents-panel">
              <div className="line-items-head">
                <h3>{accountUiText.bankAccountsTitle}</h3>
                <button type="button" onClick={addBankAccountEntry}>{accountUiText.addBankAccount}</button>
              </div>
              {accountProfile.bankAccounts.length === 0 && <p className="meta">{accountUiText.noBankAccounts}</p>}
              {accountProfile.bankAccounts.map((entry) => (
                <div key={entry.id} className="line-item-row bank-account-row">
                  <input
                    value={entry.accountNumber}
                    placeholder="123456789/0100"
                    onChange={(event) => updateBankAccountEntry(entry.id, 'accountNumber', event.target.value)}
                  />
                  <input
                    value={entry.currency}
                    placeholder="CZK"
                    onChange={(event) => updateBankAccountEntry(entry.id, 'currency', event.target.value)}
                  />
                  <input
                    value={entry.label}
                    placeholder={accountUiText.label}
                    onChange={(event) => updateBankAccountEntry(entry.id, 'label', event.target.value)}
                  />
                  <button className="icon-delete" type="button" onClick={() => removeBankAccountEntry(entry.id)}>
                    {accountUiText.remove}
                  </button>
                </div>
              ))}
            </div>

            <label>
              {accountUiText.companyIc}
              <input
                value={accountProfile.companyIc}
                onChange={(event) => setAccountProfile((prev) => ({ ...prev, companyIc: event.target.value }))}
                placeholder="12345678"
              />
            </label>

            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={accountProfile.isVatPayer}
                onChange={(event) =>
                  setAccountProfile((prev) => ({
                    ...prev,
                    isVatPayer: event.target.checked,
                    requiresControlStatement: event.target.checked ? prev.requiresControlStatement : false,
                  }))
                }
              />
              <span>{accountUiText.vatPayer}</span>
            </label>

            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={accountProfile.requiresControlStatement}
                disabled={!accountProfile.isVatPayer}
                onChange={(event) =>
                  setAccountProfile((prev) => ({
                    ...prev,
                    requiresControlStatement: event.target.checked,
                  }))
                }
              />
              <span>{accountUiText.controlStatement}</span>
            </label>

            <label>
              {accountUiText.logo}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => handleAccountLogoUpload(event.target.files?.[0] ?? null)}
              />
            </label>

            {accountProfile.logoDataUrl && (
              <div className="account-logo-preview">
                <img src={accountProfile.logoDataUrl} alt="Account logo" />
                <button
                  type="button"
                  onClick={() => setAccountProfile((prev) => ({ ...prev, logoDataUrl: '' }))}
                >
                  {accountUiText.removeLogo}
                </button>
              </div>
            )}

            <button type="submit" disabled={accountSaving}>
              {accountSaving ? accountUiText.saving : accountUiText.save}
            </button>
          </form>

          {accountMessage && <p className="error">{accountMessage}</p>}
        </section>
      )
    }

    if (activeSection === 'invoices' && activeSubmenu === 'new') {
      return (
        <>
          <section className="stats card">
            <div>
              <p className="stat-label">{workspaceUiText.draftInvoicesTitle}</p>
              <p className="stat-value">{invoices.length}</p>
            </div>
            <div>
              <p className="stat-label">{t.totalAmount}</p>
              <p className="stat-value">{totalRevenue.toFixed(2)}</p>
            </div>
          </section>

          <section className="card">
            <h2>{editingInvoiceId ? `${workspaceUiText.editDraftTitle} #${editingInvoiceId}` : workspaceUiText.newDraftTitle}</h2>
            <form onSubmit={handleInvoiceCreate} className="invoice-form-advanced">
              <div className="invoice-form-left">
                <div className="invoice-form-grid">
                  <label>
                    {t.issueDateLabel}
                    <input
                      type="date"
                      value={invoiceForm.issueDate}
                      onChange={(event) => setInvoiceForm((prev) => ({ ...prev, issueDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    {t.taxDateLabel}
                    <input
                      type="date"
                      value={invoiceForm.taxDate}
                      onChange={(event) => setInvoiceForm((prev) => ({ ...prev, taxDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    {t.duePresetLabel}
                    <select
                      value={invoiceForm.duePreset}
                      onChange={(event) =>
                        setInvoiceForm((prev) => ({
                          ...prev,
                          duePreset: event.target.value as '14' | '30' | 'custom',
                        }))
                      }
                    >
                      <option value="14">{t.dueIn14}</option>
                      <option value="30">{t.dueIn30}</option>
                      <option value="custom">{t.dueCustom}</option>
                    </select>
                  </label>
                  {invoiceForm.duePreset === 'custom' && (
                    <label>
                      {t.dueDateLabel}
                      <input
                        type="date"
                        value={invoiceForm.dueDateCustom}
                        onChange={(event) =>
                          setInvoiceForm((prev) => ({ ...prev, dueDateCustom: event.target.value }))
                        }
                      />
                    </label>
                  )}
                  <label>
                    {t.bankAccountLabel}
                    <select
                      value={invoiceForm.bankAccount}
                      onChange={(event) =>
                        setInvoiceForm((prev) => ({ ...prev, bankAccount: event.target.value }))
                      }
                    >
                      <option value="">{accountUiText.selectBankAccount}</option>
                      {preferredInvoiceBankAccounts.map((account) => (
                        <option key={account.id} value={account.accountNumber}>
                          {account.accountNumber} ({account.currency}){account.label ? ` - ${account.label}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.constantSymbolLabel}
                    <input
                      value={invoiceForm.constantSymbol}
                      onChange={(event) =>
                        setInvoiceForm((prev) => ({ ...prev, constantSymbol: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    {t.specificSymbolLabel}
                    <input
                      value={invoiceForm.specificSymbol}
                      onChange={(event) =>
                        setInvoiceForm((prev) => ({ ...prev, specificSymbol: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    {t.variableSymbolLabel}
                    <input
                      value={invoiceForm.variableSymbol}
                      onChange={(event) =>
                        setInvoiceForm((prev) => ({ ...prev, variableSymbol: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <label className="span-all">
                  {t.invoiceTextLabel}
                  <textarea
                    value={invoiceForm.invoiceText}
                    onChange={(event) =>
                      setInvoiceForm((prev) => ({ ...prev, invoiceText: event.target.value }))
                    }
                    rows={3}
                    placeholder={language === 'cz' ? 'Děkujeme za spolupráci.' : 'Thank you for your cooperation.'}
                  />
                </label>
                <div className="vat-row span-all">
                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={invoiceForm.includeVat}
                      onChange={(event) =>
                        setInvoiceForm((prev) => ({ ...prev, includeVat: event.target.checked }))
                      }
                    />
                    <span>{t.includeVatLabel}</span>
                  </label>
                  {invoiceForm.includeVat && (
                    <label>
                      {t.vatChoiceLabel}
                      <select
                        value={invoiceForm.vatRate}
                        onChange={(event) =>
                          setInvoiceForm((prev) => ({ ...prev, vatRate: event.target.value as CzechVatOption }))
                        }
                      >
                        <option value="21">{t.vatChoiceStandard}</option>
                        <option value="12">{t.vatChoiceReduced}</option>
                        <option value="0">{t.vatChoiceZero}</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>

              <aside className="invoice-form-right">
                <label>
                  {t.customer}
                  <select
                    required
                    value={invoiceForm.customerId ?? ''}
                    onChange={(event) =>
                      setInvoiceForm((prev) => ({
                        ...prev,
                        customerId: event.target.value ? Number(event.target.value) : null,
                      }))
                    }
                  >
                    <option value="">{workspaceUiText.selectCustomer}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="linked-customer-card">
                  {(() => {
                    const selectedCustomer = customers.find((c) => c.id === invoiceForm.customerId)
                    if (!selectedCustomer) {
                      return <p className="empty">{workspaceUiText.selectCustomerPreviewHint}</p>
                    }

                    return (
                      <>
                        <p className="customer">{selectedCustomer.name}</p>
                        <p className="meta">{[selectedCustomer.ic && `IC: ${selectedCustomer.ic}`, selectedCustomer.dic && `DIC: ${selectedCustomer.dic}`].filter(Boolean).join(' · ')}</p>
                        <p className="meta">{[selectedCustomer.address, selectedCustomer.city, selectedCustomer.zip, selectedCustomer.country].filter(Boolean).join(', ')}</p>
                        <p className="meta">{[selectedCustomer.email, selectedCustomer.phone].filter(Boolean).join(' · ')}</p>
                      </>
                    )
                  })()}
                </div>
              </aside>

              <div className="line-items span-all">
                <div className="line-items-head">
                  <h3>{t.invoiceItemsLabel}</h3>
                  <button type="button" onClick={addInvoiceItem}>
                    {t.addItemLabel}
                  </button>
                </div>
                {invoiceItems.length === 0 && <p className="empty">{workspaceUiText.addAtLeastOneItem}</p>}
                {invoiceItems.map((item, index) => (
                  <div key={`item-${index}`} className="line-item-row">
                    <select
                      disabled={!invoiceForm.customerId}
                      value={item.projectId ?? ''}
                      onChange={(event) =>
                        updateInvoiceItem(
                          index,
                          'projectId',
                          event.target.value ? Number(event.target.value) : null,
                        )
                      }
                    >
                      <option value="">{t.itemProjectLabel}</option>
                      {availableInvoiceProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name} ({project.pricingMode.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    {invoiceForm.customerId && availableInvoiceProjects.length === 0 && (
                      <p className="meta line-item-hint">{t.noProjectsForSelectedCustomer}</p>
                    )}
                    {(() => {
                      const selectedProject = projects.find((p) => p.id === item.projectId)
                      const isMdProject = selectedProject?.pricingMode === 'md'
                      return (
                        <>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder={t.itemDaysLabel}
                            value={item.days}
                            disabled={!isMdProject}
                            onChange={(event) => updateInvoiceItem(index, 'days', event.target.value)}
                          />
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder={t.itemValueLabel}
                            value={item.amount}
                            onChange={(event) => updateInvoiceItem(index, 'amount', event.target.value)}
                            readOnly={Boolean(isMdProject)}
                            required
                          />
                        </>
                      )
                    })()}
                    <button className="icon-delete" type="button" onClick={() => removeInvoiceItem(index)}>
                      {t.deleteAction}
                    </button>
                  </div>
                ))}

                {invoiceItems.length > 0 && (
                  <div className="invoice-totals-box">
                    {(() => {
                      const totals = getInvoiceTotalsFromDraft()
                      return (
                        <>
                          <p>
                            {t.taxBaseLabel}: <strong>{formatMoney(totals.net, getDraftCurrency())}</strong>
                          </p>
                          <p>
                            {t.vatAmountLabel}: <strong>{formatMoney(totals.vat, getDraftCurrency())}</strong>
                          </p>
                          <p>
                            {t.totalAmount}: <strong>{formatMoney(totals.gross, getDraftCurrency())}</strong>
                          </p>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="invoice-form-actions span-all">
                <button className="primary" disabled={invoiceSaving} type="submit">
                  {invoiceSaving ? t.saving : editingInvoiceId ? workspaceUiText.updateDraft : workspaceUiText.createDraft}
                </button>
                {editingInvoiceId && (
                  <button className="secondary" type="button" onClick={clearInvoiceForm}>
                    {workspaceUiText.cancelEdit}
                  </button>
                )}
              </div>
            </form>
            {invoiceError && <p className="error">{invoiceError}</p>}
          </section>

          <section className="card">
            <h2>{workspaceUiText.draftInvoicesTitle}</h2>
            {invoices.length === 0 && <p className="empty">{workspaceUiText.noDraftInvoices}</p>}
            <ul className="invoice-list">
              {invoices.map((invoice) => {
                const total = getInvoiceTotals(invoice).gross
                const currency = getInvoiceCurrency(invoice)
                return (
                  <li key={invoice.id}>
                    <div>
                      <p className="customer">#{invoice.id} - {invoice.customer?.name ?? workspaceUiText.noCustomer}</p>
                      <p className="meta">{new Date(invoice.createdAt).toLocaleString()}</p>
                      <p className="meta">{workspaceUiText.items}: {invoice.items.length}</p>
                    </div>
                    <div className="right action-stack">
                      <p>{formatMoney(total, currency)}</p>
                      <button type="button" onClick={() => startDraftEdit(invoice)}>{workspaceUiText.edit}</button>
                      <button type="button" onClick={() => void submitDraftToUnpaid(invoice.id)}>{workspaceUiText.save}</button>
                      <button className="icon-delete" type="button" onClick={() => void handleInvoiceDelete(invoice.id)}>{t.deleteAction}</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )
    }

    if (activeSection === 'invoices' && activeSubmenu === 'unpaid') {
      return (
        <section className="card">
          <h2>{workspaceUiText.activeInvoicesTitle}</h2>
          {invoices.length === 0 && <p className="empty">{workspaceUiText.noActiveInvoices}</p>}
          <div className="report-two-col tax-panels">
          <ul className="invoice-list report-panel documents-panel">
            {invoices.map((invoice) => {
              const total = getInvoiceTotals(invoice).gross
              const currency = getInvoiceCurrency(invoice)
              const isOverdue =
                Boolean(invoice.dueDate) && new Date(invoice.dueDate as string).getTime() < Date.now()
              return (
                <li
                  key={invoice.id}
                  className={`${isOverdue ? 'overdue ' : ''}${previewInvoice?.id === invoice.id ? 'selected-list-item' : ''}`.trim()}
                  onClick={() => setPreviewInvoice(invoice)}
                >
                  <div>
                    <p className="customer">#{invoice.id} - {invoice.customer?.name ?? workspaceUiText.noCustomer}</p>
                    <p className={isOverdue ? 'meta overdue-date' : 'meta'}>
                      {workspaceUiText.due}: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                    </p>
                    <p className="meta">{workspaceUiText.taxDate}: {invoice.taxDate ? new Date(invoice.taxDate).toLocaleDateString() : '-'}</p>
                    <p className="meta">{documentsUiText.bankAccount}: {invoice.bankAccount ?? '-'}</p>
                  </div>
                  <div className="right action-stack" onClick={(event) => event.stopPropagation()}>
                    <p>{formatMoney(total, currency)}</p>
                    <button type="button" onClick={() => void exportInvoicePdf(invoice)}>{t.exportPdf}</button>
                    <button type="button" onClick={() => void handleInvoiceStatusChange(invoice.id, 'paid')}>{workspaceUiText.pay}</button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="report-panel documents-panel">
            {previewInvoice ? renderInvoicePreviewCard(previewInvoice) : <p className="empty">-</p>}
          </div>
          </div>
        </section>
      )
    }

    if (activeSection === 'invoices' && activeSubmenu === 'history') {
      return (
        <section className="card">
          <h2>{workspaceUiText.invoiceHistoryTitle}</h2>
          {invoices.length === 0 && <p className="empty">{workspaceUiText.noPaidInvoices}</p>}
          <div className="report-two-col tax-panels">
          <ul className="invoice-list report-panel documents-panel">
            {invoices.map((invoice) => {
              const total = getInvoiceTotals(invoice).gross
              const currency = getInvoiceCurrency(invoice)
              return (
                <li
                  key={invoice.id}
                  className={previewInvoice?.id === invoice.id ? 'selected-list-item' : ''}
                  onClick={() => setPreviewInvoice(invoice)}
                >
                  <div>
                    <p className="customer">#{invoice.id} - {invoice.customer?.name ?? workspaceUiText.noCustomer}</p>
                    <p className="meta">{workspaceUiText.paidInvoice}</p>
                  </div>
                  <div className="right action-stack" onClick={(event) => event.stopPropagation()}>
                    <p>{formatMoney(total, currency)}</p>
                    <span className="chip paid">{statusLabels[language].paid}</span>
                    <button type="button" onClick={() => void exportInvoicePdf(invoice)}>{t.exportPdf}</button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="report-panel documents-panel">
            {previewInvoice ? renderInvoicePreviewCard(previewInvoice) : <p className="empty">-</p>}
          </div>
          </div>
        </section>
      )
    }

    if (activeSection === 'customers' && activeSubmenu === 'new') {
      return (
        <section className="card">
          <h2>{t.customers} / {t.newSubmenu}</h2>

          <div className="ares-row">
            <label className="ares-label">
              {t.icLabel} / {t.dicLabel}
              <div className="ares-input-wrap">
                <input
                  value={aresLookup}
                  onChange={(e) => setAresLookup(e.target.value)}
                  placeholder="12345678 or CZ12345678"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAresLookup() } }}
                />
                <button type="button" onClick={() => void handleAresLookup()} disabled={aresLoading}>
                  {aresLoading ? t.searching : t.lookupByIC}
                </button>
              </div>
            </label>
            {aresMessage && <p className="error">{aresMessage}</p>}
          </div>

          <form onSubmit={(e) => void handleSaveCustomer(e)} className="customer-form">
            <label>
              {t.companyName} *
              <input value={customerForm.name} onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label>
              {t.icLabel}
              <input value={customerForm.ic} onChange={(e) => setCustomerForm((f) => ({ ...f, ic: e.target.value }))} />
            </label>
            <label>
              {t.dicLabel}
              <input value={customerForm.dic} onChange={(e) => setCustomerForm((f) => ({ ...f, dic: e.target.value }))} />
            </label>
            <label>
              {t.addressLabel}
              <input value={customerForm.address} onChange={(e) => setCustomerForm((f) => ({ ...f, address: e.target.value }))} />
            </label>
            <label>
              {t.cityLabel}
              <input value={customerForm.city} onChange={(e) => setCustomerForm((f) => ({ ...f, city: e.target.value }))} />
            </label>
            <label>
              {t.zipLabel}
              <input value={customerForm.zip} onChange={(e) => setCustomerForm((f) => ({ ...f, zip: e.target.value }))} />
            </label>
            <label>
              {t.countryLabel}
              <input value={customerForm.country} onChange={(e) => setCustomerForm((f) => ({ ...f, country: e.target.value }))} />
            </label>
            <label>
              {t.email}
              <input type="email" value={customerForm.email} onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label>
              {t.phoneLabel}
              <input value={customerForm.phone} onChange={(e) => setCustomerForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
            <button type="submit" disabled={customerSaving} className="span-all">
              {customerSaving ? t.savingCustomer : t.saveCustomer}
            </button>
          </form>
          {customerSaveMsg && <p className="error">{customerSaveMsg}</p>}
        </section>
      )
    }

    if (activeSection === 'customers' && activeSubmenu === 'contacts') {
      return (
        <section className="card">
          <h2>{t.storedContacts}</h2>
          <div className="report-two-col tax-panels">
            <div className="report-panel">
              {customers.length === 0 ? (
                <p className="empty">{t.contactsEmpty}</p>
              ) : (
                <ul className="invoice-list">
                  {customers.map((c) => (
                    <li
                      key={c.id}
                      className={previewCustomer?.id === c.id ? 'selected-list-item' : ''}
                      onClick={() => setPreviewCustomer(c)}
                    >
                      <div>
                        <p className="customer">{c.name}</p>
                        <p className="meta">
                          {[c.ic && `IČO: ${c.ic}`, c.dic && `DIČ: ${c.dic}`].filter(Boolean).join('  ·  ')}
                        </p>
                        <p className="meta">
                          {[c.address, c.city, c.zip, c.country].filter(Boolean).join(', ')}
                        </p>
                        <p className="meta">
                          {[c.email, c.phone].filter(Boolean).join('  ·  ')}
                        </p>
                      </div>
                      <div className="right action-stack" onClick={(event) => event.stopPropagation()}>
                        <button className="icon-delete" type="button" onClick={() => void handleDeleteCustomer(c.id)}>{t.deleteAction}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="report-panel">
              {previewCustomer ? (
                <div className="invoice-preview-sheet">
                  <div className="preview-top">
                    <h3>{previewCustomer.name}</h3>
                    <span className="chip unpaid">{t.contactChip}</span>
                  </div>
                  <div className="preview-grid">
                    <div className="preview-panel">
                      <p className="meta-label">{workspaceUiText.companyIds}</p>
                      <p className="meta-value">{[previewCustomer.ic && `IC: ${previewCustomer.ic}`, previewCustomer.dic && `DIC: ${previewCustomer.dic}`].filter(Boolean).join(' · ') || '-'}</p>
                      <p className="meta-label">{workspaceUiText.address}</p>
                      <p className="meta-value">{[previewCustomer.address, previewCustomer.city, previewCustomer.zip, previewCustomer.country].filter(Boolean).join(', ') || '-'}</p>
                    </div>
                    <div className="preview-panel">
                      <p className="meta-label">{workspaceUiText.contact}</p>
                      <p className="meta-value">{[previewCustomer.email, previewCustomer.phone].filter(Boolean).join(' · ') || '-'}</p>
                      <p className="meta-label">{workspaceUiText.created}</p>
                      <p className="meta-value">{new Date(previewCustomer.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty">-</p>
              )}
            </div>
          </div>
        </section>
      )
    }

    if (activeSection === 'projects' && activeSubmenu === 'new') {
      return (
        <section className="card">
          <h2>{t.projects} / {t.newSubmenu}</h2>

          <form onSubmit={(e) => void handleSaveProject(e)} className="project-form">
            <label>
              {workspaceUiText.order} *
              <select
                value={projectForm.orderId ?? ''}
                onChange={(e) =>
                  setProjectForm((f) => ({
                    ...f,
                    orderId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                required
              >
                <option value="">{workspaceUiText.selectExistingOrder}</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.title} ({order.customer.name})
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.projectName} *
              <input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label>
              {workspaceUiText.pricingModel}
              <select
                value={projectForm.pricingMode}
                onChange={(e) =>
                  setProjectForm((f) => ({ ...f, pricingMode: e.target.value as 'md' | 'budget' }))
                }
              >
                <option value="md">{workspaceUiText.mdDeliverable}</option>
                <option value="budget">{workspaceUiText.budgetMode}</option>
              </select>
            </label>
            <label>
              {t.projectDays}
              <input type="number" value={projectForm.days} onChange={(e) => setProjectForm((f) => ({ ...f, days: e.target.value }))} min="1" />
            </label>
            <label>
              {workspaceUiText.budgetLabel}
              <input type="number" value={projectForm.budget} onChange={(e) => setProjectForm((f) => ({ ...f, budget: e.target.value }))} step="0.01" min="0" />
            </label>
            <label>
              {t.projectMDRate}
              <input type="number" value={projectForm.mdRate} onChange={(e) => setProjectForm((f) => ({ ...f, mdRate: e.target.value }))} step="0.01" min="0" />
            </label>
            <label>
              {t.projectCurrency}
              <select value={projectForm.currency} onChange={(e) => setProjectForm((f) => ({ ...f, currency: e.target.value }))}>
                <option value="CZK">CZK (Czech Koruna)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
              </select>
            </label>
            <button type="submit" disabled={projectSaving} className="span-all">
              {projectSaving ? t.savingProject : t.saveProject}
            </button>
          </form>
          {projectSaveMsg && <p className="error">{projectSaveMsg}</p>}
        </section>
      )
    }

    if (activeSection === 'projects' && activeSubmenu === 'current') {
      const filteredProjects = projects.filter((project) => !project.archived && isInRangeByCreatedAt(project.createdAt, overviewRange))
      const visiblePreviewProject =
        previewProject && filteredProjects.some((project) => project.id === previewProject.id)
          ? previewProject
          : (filteredProjects[0] ?? null)

      return (
        <section className="card">
          <h2>{t.projects} / {t.currentSubmenu}</h2>
          <div className="overview-filter-row">
            <label>
              {t.reportRangeLabel}
              <select value={overviewRange} onChange={(event) => setOverviewRange(event.target.value as PeriodRange)}>
                <option value="month">{t.reportRangeMonth}</option>
                <option value="quarter">{t.reportRangeQuarter}</option>
                <option value="year">{t.reportRangeYear}</option>
                <option value="all">{t.reportRangeAll}</option>
              </select>
            </label>
          </div>
          {filteredProjects.length === 0 && <p className="empty">{t.projectsEmpty}</p>}
          <div className="report-two-col tax-panels">
          <ul className="invoice-list report-panel documents-panel">
            {filteredProjects.map((p) => (
              <li
                key={p.id}
                className={visiblePreviewProject?.id === p.id ? 'selected-list-item' : ''}
                onClick={() => setPreviewProject(p)}
              >
                <div>
                  <p className="customer">{p.name}</p>
                  <p className="meta">
                    {[p.order?.title && `Order: ${p.order.title}`, p.order?.customer?.name && `Customer: ${p.order.customer.name}`].filter(Boolean).join('  ·  ')}
                  </p>
                  <p className="meta">
                    {[
                      p.pricingMode === 'md' && p.days !== null && `Remaining days: ${(p.days - p.daysUsed).toFixed(1)} / ${p.days}`,
                      p.pricingMode === 'budget' && p.budget !== null && `Remaining budget: ${(p.budget - p.budgetUsed).toFixed(2)} ${p.currency}`,
                      p.mdRate && `MD Rate: ${p.mdRate} ${p.currency}`,
                    ]
                      .filter(Boolean)
                      .join('  ·  ')}
                  </p>
                  <div className="consumption-row compact">
                    <div className="consumption-head">
                      <span>{t.consumptionDetailLabel}</span>
                      <strong>{getProjectConsumptionPercent(p).toFixed(0)}%</strong>
                    </div>
                    <div className="consumption-track">
                      <span
                        className={`consumption-fill ${p.pricingMode === 'md' ? 'md' : 'budget'}`}
                        style={{ width: `${getProjectConsumptionPercent(p)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="right action-stack" onClick={(event) => event.stopPropagation()}>
                  <button className="icon-delete" type="button" onClick={() => void handleDeleteProject(p.id)}>{t.deleteAction}</button>
                </div>
              </li>
            ))}
          </ul>

          <div className="report-panel documents-panel">
          {visiblePreviewProject ? (
              <div className="invoice-preview-sheet">
                <div className="preview-top">
                  <h3>{visiblePreviewProject.name}</h3>
                  <span className="chip unpaid">{t.currentChip}</span>
                </div>
                <div className="preview-grid">
                  <div className="preview-panel">
                    <p className="meta-label">{workspaceUiText.order}</p>
                    <p className="meta-value">{visiblePreviewProject.order?.title ?? '-'}</p>
                    <p className="meta-label">{t.customer}</p>
                    <p className="meta-value">{visiblePreviewProject.order?.customer?.name ?? '-'}</p>
                  </div>
                  <div className="preview-panel">
                    <p className="meta-label">{workspaceUiText.pricingModel}</p>
                    <p className="meta-value">{visiblePreviewProject.pricingMode.toUpperCase()}</p>
                    <p className="meta-label">{t.consumptionDetailLabel}</p>
                    <p className="meta-value">
                      {visiblePreviewProject.pricingMode === 'md' && visiblePreviewProject.days !== null
                        ? `${visiblePreviewProject.daysUsed.toFixed(1)} / ${visiblePreviewProject.days} MD`
                        : `${visiblePreviewProject.budgetUsed.toFixed(2)} / ${(visiblePreviewProject.budget ?? 0).toFixed(2)} ${visiblePreviewProject.currency}`}
                    </p>
                    <div className="consumption-row compact">
                      <div className="consumption-track">
                        <span
                          className={`consumption-fill ${visiblePreviewProject.pricingMode === 'md' ? 'md' : 'budget'}`}
                          style={{ width: `${getProjectConsumptionPercent(visiblePreviewProject)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : <p className="empty">-</p>}
            </div>
            </div>
        </section>
      )
    }

    if (activeSection === 'projects' && activeSubmenu === 'history') {
      const filteredProjects = projects.filter((project) => project.archived && isInRangeByCreatedAt(project.createdAt, overviewRange))
      const visiblePreviewProject =
        previewProject && filteredProjects.some((project) => project.id === previewProject.id)
          ? previewProject
          : (filteredProjects[0] ?? null)

      return (
        <section className="card">
          <h2>{t.projects} / {t.historySubmenu}</h2>
          <div className="overview-filter-row">
            <label>
              {t.reportRangeLabel}
              <select value={overviewRange} onChange={(event) => setOverviewRange(event.target.value as PeriodRange)}>
                <option value="month">{t.reportRangeMonth}</option>
                <option value="quarter">{t.reportRangeQuarter}</option>
                <option value="year">{t.reportRangeYear}</option>
                <option value="all">{t.reportRangeAll}</option>
              </select>
            </label>
          </div>
          {filteredProjects.length === 0 && <p className="empty">{workspaceUiText.noArchivedProjects}</p>}
          <div className="report-two-col tax-panels">
          <ul className="invoice-list report-panel documents-panel">
            {filteredProjects.map((p) => (
              <li
                key={p.id}
                className={visiblePreviewProject?.id === p.id ? 'selected-list-item' : ''}
                onClick={() => setPreviewProject(p)}
              >
                <div>
                  <p className="customer">{p.name}</p>
                  <p className="meta">{workspaceUiText.archivedAfterFull}</p>
                  <div className="consumption-row compact">
                    <div className="consumption-head">
                      <span>{t.consumptionDetailLabel}</span>
                      <strong>{getProjectConsumptionPercent(p).toFixed(0)}%</strong>
                    </div>
                    <div className="consumption-track">
                      <span
                        className={`consumption-fill ${p.pricingMode === 'md' ? 'md' : 'budget'}`}
                        style={{ width: `${getProjectConsumptionPercent(p)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="right action-stack" onClick={(event) => event.stopPropagation()}>
                  <button className="icon-delete" type="button" onClick={() => void handleDeleteProject(p.id)}>{t.deleteAction}</button>
                </div>
              </li>
            ))}
          </ul>

          <div className="report-panel documents-panel">
          {visiblePreviewProject ? (
              <div className="invoice-preview-sheet">
                <div className="preview-top">
                  <h3>{visiblePreviewProject.name}</h3>
                  <span className="chip paid">{t.archivedChip}</span>
                </div>
                <div className="preview-grid">
                  <div className="preview-panel">
                    <p className="meta-label">{workspaceUiText.order}</p>
                    <p className="meta-value">{visiblePreviewProject.order?.title ?? '-'}</p>
                    <p className="meta-label">{t.customer}</p>
                    <p className="meta-value">{visiblePreviewProject.order?.customer?.name ?? '-'}</p>
                  </div>
                  <div className="preview-panel">
                    <p className="meta-label">{workspaceUiText.finalUsage}</p>
                    <p className="meta-value">
                      {visiblePreviewProject.pricingMode === 'md' && visiblePreviewProject.days !== null
                        ? `${visiblePreviewProject.daysUsed.toFixed(1)} / ${visiblePreviewProject.days} MD`
                        : `${visiblePreviewProject.budgetUsed.toFixed(2)} / ${(visiblePreviewProject.budget ?? 0).toFixed(2)} ${visiblePreviewProject.currency}`}
                    </p>
                    <div className="consumption-row compact">
                      <div className="consumption-track">
                        <span
                          className={`consumption-fill ${visiblePreviewProject.pricingMode === 'md' ? 'md' : 'budget'}`}
                          style={{ width: `${getProjectConsumptionPercent(visiblePreviewProject)}%` }}
                        />
                      </div>
                    </div>
                    <p className="meta-label">{workspaceUiText.created}</p>
                    <p className="meta-value">{new Date(visiblePreviewProject.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ) : <p className="empty">-</p>}
            </div>
            </div>
        </section>
      )
    }

    if (activeSection === 'orders' && activeSubmenu === 'new') {
      return (
        <section className="card">
          <h2>{t.orders} / {t.newSubmenu}</h2>
          <form onSubmit={(e) => void handleSaveOrder(e)} className="project-form">
            <label>
              {t.customer} *
              <select
                value={orderForm.customerId ?? ''}
                onChange={(e) =>
                  setOrderForm((f) => ({
                    ...f,
                    customerId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                required
              >
                <option value="">{workspaceUiText.selectCustomer}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {workspaceUiText.orderTitle} *
              <input
                value={orderForm.title}
                onChange={(e) => setOrderForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label>
              {workspaceUiText.orderCode}
              <input
                value={orderForm.code}
                onChange={(e) => setOrderForm((f) => ({ ...f, code: e.target.value }))}
              />
            </label>
            <label>
              {t.amount}
              <input
                type="number"
                step="0.01"
                min="0"
                value={orderForm.amount}
                onChange={(e) => setOrderForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </label>
            <label>
              {t.projectCurrency}
              <select
                value={orderForm.currency}
                onChange={(e) => setOrderForm((f) => ({ ...f, currency: e.target.value }))}
              >
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
            <button type="submit" disabled={orderSaving} className="span-all">
              {orderSaving ? t.saving : workspaceUiText.saveOrder}
            </button>
          </form>
          {orderSaveMsg && <p className="error">{orderSaveMsg}</p>}
        </section>
      )
    }

    if (activeSection === 'orders' && activeSubmenu === 'active') {
      const filteredOrders = orders.filter((order) => !order.archived && isInRangeByCreatedAt(order.createdAt, overviewRange))
      const visiblePreviewOrder =
        previewOrder && filteredOrders.some((order) => order.id === previewOrder.id)
          ? previewOrder
          : (filteredOrders[0] ?? null)

      return (
        <section className="card">
          <h2>{t.orders} / {t.unpaidSubmenu}</h2>
          <div className="overview-filter-row">
            <label>
              {t.reportRangeLabel}
              <select value={overviewRange} onChange={(event) => setOverviewRange(event.target.value as PeriodRange)}>
                <option value="month">{t.reportRangeMonth}</option>
                <option value="quarter">{t.reportRangeQuarter}</option>
                <option value="year">{t.reportRangeYear}</option>
                <option value="all">{t.reportRangeAll}</option>
              </select>
            </label>
          </div>
          {filteredOrders.length === 0 && <p className="empty">{t.noActiveOrders}</p>}
          <div className="report-two-col tax-panels">
          <ul className="invoice-list report-panel documents-panel">
            {filteredOrders.map((o) => (
              <li
                key={o.id}
                className={visiblePreviewOrder?.id === o.id ? 'selected-list-item' : ''}
                onClick={() => setPreviewOrder(o)}
              >
                <div>
                  <p className="customer">{o.title}</p>
                  <p className="meta">{o.customer.name}</p>
                  <p className="meta">{o.code ?? '-'}</p>
                  <p className="meta">{t.projectsLinked}: {o.projectCount}</p>
                  <p className="meta">
                    {t.mdConsumptionLabel}: {o.consumption.mdUsed.toFixed(1)} / {o.consumption.mdTotal.toFixed(1)}
                  </p>
                  {o.consumption.mdTotal > 0 && (
                    <div className="consumption-row compact">
                      <div className="consumption-head">
                        <span>{t.mdConsumptionLabel}</span>
                        <strong>{getConsumptionPercent(o.consumption.mdUsed, o.consumption.mdTotal).toFixed(0)}%</strong>
                      </div>
                      <div className="consumption-track">
                        <span
                          className="consumption-fill md"
                          style={{ width: `${getConsumptionPercent(o.consumption.mdUsed, o.consumption.mdTotal)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="meta">
                    {t.budgetConsumptionLabel}: {formatMoney(o.consumption.budgetUsed, o.currency)} / {formatMoney(o.consumption.budgetTotal, o.currency)}
                  </p>
                  {o.consumption.budgetTotal > 0 && (
                    <div className="consumption-row compact">
                      <div className="consumption-head">
                        <span>{t.budgetConsumptionLabel}</span>
                        <strong>{getConsumptionPercent(o.consumption.budgetUsed, o.consumption.budgetTotal).toFixed(0)}%</strong>
                      </div>
                      <div className="consumption-track">
                        <span
                          className="consumption-fill budget"
                          style={{ width: `${getConsumptionPercent(o.consumption.budgetUsed, o.consumption.budgetTotal)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="right action-stack" onClick={(event) => event.stopPropagation()}>
                  <p>{o.amount ? `${o.amount.toFixed(2)} ${o.currency}` : '-'}</p>
                  <button className="icon-delete" type="button" onClick={() => void handleDeleteOrder(o.id)}>{t.deleteAction}</button>
                </div>
              </li>
            ))}
          </ul>

          <div className="report-panel documents-panel">
          {visiblePreviewOrder ? (
              <div className="invoice-preview-sheet">
                <div className="preview-top">
                  <h3>{visiblePreviewOrder.title}</h3>
                  <span className="chip unpaid">{t.activeChip}</span>
                </div>
                <div className="preview-grid">
                  <div className="preview-panel">
                    <p className="meta-label">{t.customer}</p>
                    <p className="meta-value">{visiblePreviewOrder.customer.name}</p>
                    <p className="meta-label">{workspaceUiText.orderCode}</p>
                    <p className="meta-value">{visiblePreviewOrder.code ?? '-'}</p>
                  </div>
                  <div className="preview-panel">
                    <p className="meta-label">{t.amount}</p>
                    <p className="meta-value">{visiblePreviewOrder.amount ? `${visiblePreviewOrder.amount.toFixed(2)} ${visiblePreviewOrder.currency}` : '-'}</p>
                    <p className="meta-label">{t.projectsLinked}</p>
                    <p className="meta-value">{visiblePreviewOrder.projectCount}</p>
                    <p className="meta-label">{t.consumptionDetailLabel}</p>
                    <p className="meta-value">{t.mdConsumptionLabel}: {visiblePreviewOrder.consumption.mdUsed.toFixed(1)} / {visiblePreviewOrder.consumption.mdTotal.toFixed(1)}</p>
                    {visiblePreviewOrder.consumption.mdTotal > 0 && (
                      <div className="consumption-row compact">
                        <div className="consumption-track">
                          <span
                            className="consumption-fill md"
                            style={{ width: `${getConsumptionPercent(visiblePreviewOrder.consumption.mdUsed, visiblePreviewOrder.consumption.mdTotal)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <p className="meta-value">{t.budgetConsumptionLabel}: {formatMoney(visiblePreviewOrder.consumption.budgetUsed, visiblePreviewOrder.currency)} / {formatMoney(visiblePreviewOrder.consumption.budgetTotal, visiblePreviewOrder.currency)}</p>
                    {visiblePreviewOrder.consumption.budgetTotal > 0 && (
                      <div className="consumption-row compact">
                        <div className="consumption-track">
                          <span
                            className="consumption-fill budget"
                            style={{ width: `${getConsumptionPercent(visiblePreviewOrder.consumption.budgetUsed, visiblePreviewOrder.consumption.budgetTotal)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : <p className="empty">-</p>}
            </div>
            </div>
        </section>
      )
    }

    if (activeSection === 'orders' && activeSubmenu === 'history') {
      const filteredOrders = orders.filter((order) => order.archived && isInRangeByCreatedAt(order.createdAt, overviewRange))
      const visiblePreviewOrder =
        previewOrder && filteredOrders.some((order) => order.id === previewOrder.id)
          ? previewOrder
          : (filteredOrders[0] ?? null)

      return (
        <section className="card">
          <h2>{t.orders} / {t.historySubmenu}</h2>
          <div className="overview-filter-row">
            <label>
              {t.reportRangeLabel}
              <select value={overviewRange} onChange={(event) => setOverviewRange(event.target.value as PeriodRange)}>
                <option value="month">{t.reportRangeMonth}</option>
                <option value="quarter">{t.reportRangeQuarter}</option>
                <option value="year">{t.reportRangeYear}</option>
                <option value="all">{t.reportRangeAll}</option>
              </select>
            </label>
          </div>
          {filteredOrders.length === 0 && <p className="empty">{t.noArchivedOrders}</p>}
          <div className="report-two-col tax-panels">
          <ul className="invoice-list report-panel documents-panel">
            {filteredOrders.map((o) => (
              <li
                key={o.id}
                className={visiblePreviewOrder?.id === o.id ? 'selected-list-item' : ''}
                onClick={() => setPreviewOrder(o)}
              >
                <div>
                  <p className="customer">{o.title}</p>
                  <p className="meta">{o.customer.name}</p>
                  <p className="meta">{o.code ?? '-'}</p>
                </div>
                <div className="right action-stack" onClick={(event) => event.stopPropagation()}>
                  <p>{o.amount ? `${o.amount.toFixed(2)} ${o.currency}` : '-'}</p>
                  <button className="icon-delete" type="button" onClick={() => void handleDeleteOrder(o.id)}>{t.deleteAction}</button>
                </div>
              </li>
            ))}
          </ul>

          <div className="report-panel documents-panel">
          {visiblePreviewOrder ? (
              <div className="invoice-preview-sheet">
                <div className="preview-top">
                  <h3>{visiblePreviewOrder.title}</h3>
                  <span className="chip paid">{t.historyChip}</span>
                </div>
                <div className="preview-grid">
                  <div className="preview-panel">
                    <p className="meta-label">{t.customer}</p>
                    <p className="meta-value">{visiblePreviewOrder.customer.name}</p>
                    <p className="meta-label">{workspaceUiText.orderCode}</p>
                    <p className="meta-value">{visiblePreviewOrder.code ?? '-'}</p>
                  </div>
                  <div className="preview-panel">
                    <p className="meta-label">{t.amount}</p>
                    <p className="meta-value">{visiblePreviewOrder.amount ? `${visiblePreviewOrder.amount.toFixed(2)} ${visiblePreviewOrder.currency}` : '-'}</p>
                    <p className="meta-label">{t.projectsLinked}</p>
                    <p className="meta-value">{visiblePreviewOrder.projectCount}</p>
                  </div>
                </div>
              </div>
            ) : <p className="empty">-</p>}
            </div>
            </div>
        </section>
      )
    }

    return (
      <section className="card placeholder">
        <h2>
          {activeItem?.label} / {submenuLabels[activeSubmenu]}
        </h2>
        <p className="empty">{t.comingSoon}</p>
      </section>
    )
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="toolbar">
          <img src={brandLogoSrc} alt="Invoicer" className="brand-logo-hero" onError={(event) => { event.currentTarget.src = logoSrc }} />
          {token && (
            <div className="settings-wrap">
              <button
                type="button"
                className="settings-button"
                onClick={() => setSettingsOpen((prev) => !prev)}
              >
                {t.settings}
              </button>
              {settingsOpen && (
                <div className="settings-menu card">
                  <p className="menu-title">{t.accountSettings}</p>
                  <p className="menu-email">{user?.email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('account')
                      setSettingsOpen(false)
                    }}
                  >
                    {accountUiText.title}
                  </button>
                  <label>
                    {t.chooseLanguage}
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value as Language)}
                    >
                      {Object.entries(languageLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {user?.isAdmin && (
                    <label>
                      User filter
                      <select
                        value={selectedAdminUserId}
                        onChange={(event) => setSelectedAdminUserId(event.target.value)}
                      >
                        <option value="">All users</option>
                        {adminUsers.map((adminUser) => (
                          <option key={adminUser.id} value={String(adminUser.id)}>
                            {adminUser.email}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="theme-switch-row">
                    <span>{t.chooseTheme}</span>
                    <button
                      type="button"
                      className={`theme-switch ${isDarkTheme ? 'on' : ''}`}
                      role="switch"
                      aria-checked={isDarkTheme}
                      onClick={toggleTheme}
                      aria-label={t.chooseTheme}
                    >
                      <span className="switch-thumb" aria-hidden="true" />
                    </button>
                  </div>
                  <button type="button" onClick={handleLogout}>
                    {t.logout}
                  </button>
                </div>
              )}
            </div>
          )}
          {!token && (
            <div className="toolbar-controls">
              <label>
                {t.chooseLanguage}
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                >
                  {Object.entries(languageLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.chooseTheme}
                <select
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as Theme)}
                >
                  <option value="light">{t.themeLight}</option>
                  <option value="dark">{t.themeDark}</option>
                </select>
              </label>
            </div>
          )}
        </div>
        <h1 className="hero-title">{t.title}</h1>
      </header>

      {!token && (
        <section className="card auth-card">
          <div className="auth-logo-wrap">
            <img src={brandLogoSrc} alt="Invoicer" className="brand-logo-auth" onError={(event) => { event.currentTarget.src = logoSrc }} />
          </div>
          {isResetPasswordMode ? (
            <>
              <p className="auth-subtitle">{authUiText.resetTitle}</p>
              <p className="auth-subtitle">{authUiText.resetSubtitle}</p>
              <form className="invoice-form auth-form" onSubmit={handleResetPasswordSubmit}>
                <label>
                  {t.email}
                  <input
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    type="email"
                    required
                  />
                </label>
                <label>
                  {authUiText.resetTokenLabel}
                  <input
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    type="text"
                    required
                  />
                </label>
                <label>
                  {authUiText.newPasswordLabel}
                  <input
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    type="password"
                    minLength={6}
                    required
                  />
                </label>
                <button disabled={authLoading} type="submit">
                  {authUiText.resetPasswordAction}
                </button>
              </form>
              <div className="auth-helper-row">
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => {
                    window.history.replaceState({}, '', '/')
                    setResetEmail('')
                    setResetToken('')
                    setNewPassword('')
                  }}
                >
                  {authUiText.backToLogin}
                </button>
              </div>
            </>
          ) : pendingVerificationEmail ? (
            <>
              <p className="auth-subtitle">{authUiText.verifyTitle}</p>
              <p className="auth-subtitle">
                {authUiText.verifySubtitle} <strong>{pendingVerificationEmail}</strong>
              </p>
              <form className="invoice-form auth-form" onSubmit={handleVerifyCodeSubmit}>
                <label>
                  {authUiText.verificationCodeLabel}
                  <input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    type="text"
                    required
                  />
                </label>
                <button disabled={authLoading} type="submit">
                  {authUiText.verifyAction}
                </button>
              </form>
              <div className="auth-helper-row">
                <button type="button" className="auth-link-button" onClick={() => void handleResendVerification()}>
                  {authUiText.resendCode}
                </button>
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => {
                    setPendingVerificationEmail('')
                    setVerificationCode('')
                    setAuthDevHint('')
                  }}
                >
                  {authUiText.changeEmail}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-tabs">
                <button
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => {
                    setMode('login')
                    setForgotPasswordMode(false)
                    setAuthMessage('')
                  }}
                  type="button"
                >
                  {t.login}
                </button>
                <button
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => {
                    setMode('register')
                    setForgotPasswordMode(false)
                    setAuthMessage('')
                  }}
                  type="button"
                >
                  {t.register}
                </button>
              </div>
              <p className="auth-subtitle">{t.authSubtitle}</p>
              {mode === 'login' && forgotPasswordMode ? (
                <>
                  <p className="auth-subtitle">{authUiText.forgotSubtitle}</p>
                  <form className="invoice-form auth-form" onSubmit={handleForgotPasswordSubmit}>
                    <label>
                      {t.email}
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        required
                      />
                    </label>
                    <button disabled={authLoading} type="submit">
                      {authUiText.sendResetLink}
                    </button>
                  </form>
                  <div className="auth-helper-row">
                    <button
                      type="button"
                      className="auth-link-button"
                      onClick={() => setForgotPasswordMode(false)}
                    >
                      {authUiText.backToLogin}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <form className="invoice-form auth-form" onSubmit={handleAuthSubmit}>
                    <label>
                      {t.email}
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        required
                      />
                    </label>
                    <label>
                      {t.password}
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type="password"
                        required
                      />
                    </label>
                    <button disabled={authLoading} type="submit">
                      {mode === 'login' ? t.signIn : t.signUp}
                    </button>
                  </form>
                  {mode === 'login' && (
                    <button type="button" className="google-login-button" onClick={handleGoogleLogin} disabled={authLoading}>
                      {authUiText.continueWithGoogle}
                    </button>
                  )}
                  {mode === 'login' && (
                    <div className="auth-helper-row">
                      <button
                        type="button"
                        className="auth-link-button"
                        onClick={() => {
                          setForgotPasswordMode(true)
                          setAuthMessage('')
                        }}
                      >
                        {authUiText.forgotPassword}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {authMessage && <p className="error">{authMessage}</p>}
          {authDevHint && <p className="auth-note">{authDevHint}</p>}
        </section>
      )}

      {token && (
        <section className="workspace-shell">
          <aside className="card side-menu">
            <img src={brandLogoSrc} alt="Invoicer" className="brand-logo-sidebar" onError={(event) => { event.currentTarget.src = logoSrc }} />
            {menuItems.map((item) => (
              <div key={item.key} className="menu-group">
                <button
                  type="button"
                  className={item.key === activeSection ? 'active' : ''}
                  onClick={() => handleMenuSelect(item.key)}
                >
                  {item.label}
                </button>
                {item.key === activeSection && (
                  <div className="submenu-list">
                    {item.submenus.map((submenu) => (
                      <button
                        key={`${item.key}-${submenu}`}
                        type="button"
                        className={submenu === activeSubmenu ? 'submenu active' : 'submenu'}
                        onClick={() => handleSubmenuSelect(item.key, submenu)}
                      >
                        {submenuLabels[submenu]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </aside>

          <section className="workspace-main">{renderSectionContent()}</section>
        </section>
      )}
      <footer className="app-version">Verze 0.12</footer>
    </main>
  )
}

export default App


