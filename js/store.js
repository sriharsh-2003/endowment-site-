import {createClient} from '@supabase/supabase-js';

(function () {
  const DB_NAME = 'abdullah-alajlan-endowment';
  const DB_VERSION = 1;
  const BANK_KEY = 'bank-details';
  const memoryKey = 'endowment_local_data';
  const DEFAULT_BANK = {
    bank_name: 'مصرف الراجحي',
    beneficiary_name: 'وقف عبدالله محمد العجلان الخيري',
    iban: 'SAXXXXXXXXXXXXXXXXXXXX',
    account_number: 'XXXXXXXXXXXXXXXX'
  };
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is unavailable'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('bank_details')) {
          database.createObjectStore('bank_details', {keyPath: 'id'});
        }
        if (!database.objectStoreNames.contains('donations')) {
          const donations = database.createObjectStore('donations', {keyPath: 'id', autoIncrement: true});
          donations.createIndex('created_at', 'created_at');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local database'));
    });
  }

  function transaction(storeName, mode, operation) {
    return openDatabase().then((database) => new Promise((resolve, reject) => {
      const request = operation(database.transaction(storeName, mode).objectStore(storeName));
      request.onsuccess = () => {
        database.close();
        resolve(request.result);
      };
      request.onerror = () => {
        database.close();
        reject(request.error || new Error('Local database request failed'));
      };
    }));
  }

  function readFallback() {
    try {
      return JSON.parse(localStorage.getItem(memoryKey) || '{}');
    } catch {
      return {};
    }
  }

  function writeFallback(data) {
    localStorage.setItem(memoryKey, JSON.stringify(data));
  }

  async function getBankDetails() {
    if (supabase) {
      const {data, error} = await supabase
        .from('bank_details')
        .select('bank_name, beneficiary_name, iban, account_number, updated_at')
        .eq('id', BANK_KEY)
        .maybeSingle();
      if (!error && data) return data;
      if (error) console.warn('Supabase bank details unavailable; using local fallback.', error.message);
    }
    try {
      const saved = await transaction('bank_details', 'readonly', (store) => store.get(BANK_KEY));
      return saved || {...DEFAULT_BANK};
    } catch {
      return {...DEFAULT_BANK, ...(readFallback().bank || {})};
    }
  }

  async function saveBankDetails(details) {
    const bank = {
      id: BANK_KEY,
      bank_name: String(details.bank_name || '').trim(),
      beneficiary_name: String(details.beneficiary_name || '').trim(),
      iban: String(details.iban || '').trim(),
      account_number: String(details.account_number || '').trim(),
      updated_at: new Date().toISOString()
    };
    if (Object.values(bank).some((value) => value === '')) throw new Error('All bank details are required');

    if (supabase) {
      const {data, error} = await supabase.from('bank_details').upsert(bank).select().single();
      if (!error && data) return data;
      if (error) console.warn('Supabase bank details could not be saved; using local fallback.', error.message);
    }
    try {
      await transaction('bank_details', 'readwrite', (store) => store.put(bank));
    } catch {
      const fallback = readFallback();
      fallback.bank = bank;
      writeFallback(fallback);
    }
    return bank;
  }

  function validateDonation(details) {
    const amount = Number(details.amount);
    if (!String(details.name || '').trim() || !String(details.email || '').trim()
      || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('Name, email, and a positive amount are required');
    }
    return amount;
  }

  async function addDonation(details) {
    const amount = validateDonation(details);
    const timestamp = new Date().toISOString();
    const donation = {
      donor_name: String(details.name).trim(),
      donor_email: String(details.email).trim(),
      amount,
      currency: 'SAR',
      status: 'pending',
      created_at: timestamp,
      updated_at: timestamp
    };

    if (supabase) {
      const {data, error} = await supabase.from('donations').insert(donation).select().single();
      if (!error && data) return data;
      if (error) console.warn('Supabase donation could not be saved; using local fallback.', error.message);
    }
    try {
      donation.id = await transaction('donations', 'readwrite', (store) => store.add(donation));
    } catch {
      const fallback = readFallback();
      fallback.donations = fallback.donations || [];
      donation.id = Date.now();
      fallback.donations.push(donation);
      writeFallback(fallback);
    }
    return donation;
  }

  async function getDonations() {
    if (supabase) {
      const {data, error} = await supabase
        .from('donations')
        .select('id, donor_name, donor_email, amount, currency, status, created_at, updated_at')
        .order('created_at', {ascending: false});
      if (!error && data) return data;
      if (error) console.warn('Supabase donations unavailable; using local fallback.', error.message);
    }
    try {
      const donations = await transaction('donations', 'readonly', (store) => store.getAll());
      return donations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch {
      return (readFallback().donations || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  window.endowmentStore = {
    getBankDetails,
    saveBankDetails,
    addDonation,
    getDonations,
    isShared: Boolean(supabase)
  };
})();
