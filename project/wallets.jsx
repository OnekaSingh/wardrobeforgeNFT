const MAGIC_PUBLISHABLE_KEY_STORAGE_KEY = 'wardrobeforge-magic-publishable-key';
const DEFAULT_POLYGON_RPC_URL = 'https://polygon-rpc.com/';
const LOCAL_DEMO_WALLET_STORAGE_KEY = 'wardrobeforge-local-demo-wallets-v1';

const trimWalletValue = (value) => String(value || '').trim();
const normalizeWalletEmail = (value) => trimWalletValue(value).toLowerCase();
const isLocalWalletHost = () => ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

const getWalletConfig = () => {
  const globalConfig = window.WardrobeForgeConfig || {};
  const storedMagicKey = trimWalletValue(window.localStorage.getItem(MAGIC_PUBLISHABLE_KEY_STORAGE_KEY));
  const queryParams = new URLSearchParams(window.location.search);

  return {
    magicPublishableKey: trimWalletValue(globalConfig.magicPublishableKey) || trimWalletValue(queryParams.get('magic_pk')) || storedMagicKey,
    polygonRpcUrl: trimWalletValue(globalConfig.polygonRpcUrl) || DEFAULT_POLYGON_RPC_URL,
  };
};

const getMagicConstructor = () => {
  if (window.Magic?.Magic) return window.Magic.Magic;
  if (typeof window.Magic === 'function') return window.Magic;
  return null;
};

const readLocalDemoWallets = () => {
  try {
    const raw = window.localStorage.getItem(LOCAL_DEMO_WALLET_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeLocalDemoWallets = (wallets) => {
  window.localStorage.setItem(LOCAL_DEMO_WALLET_STORAGE_KEY, JSON.stringify(wallets || {}));
};

const createLocalDemoWalletAddress = (seed) => {
  const normalizedSeed = normalizeWalletEmail(seed) || `guest-${Date.now()}`;
  let hex = '';

  for (let index = 0; hex.length < 40; index += 1) {
    const code = normalizedSeed.charCodeAt(index % normalizedSeed.length) + (index * 17);
    hex += (code % 16).toString(16);
  }

  return `0x${hex.slice(0, 40)}`;
};

const ensureLocalDemoWallet = (email) => {
  const cleanEmail = normalizeWalletEmail(email);
  if (!cleanEmail) {
    throw new Error('Sign in with a valid email before creating a demo wallet.');
  }

  const wallets = readLocalDemoWallets();
  const existingWallet = trimWalletValue(wallets[cleanEmail]);
  if (existingWallet) return existingWallet;

  const nextWallet = createLocalDemoWalletAddress(cleanEmail);
  wallets[cleanEmail] = nextWallet;
  writeLocalDemoWallets(wallets);
  return nextWallet;
};

const setMagicPublishableKey = (nextKey) => {
  const cleanKey = trimWalletValue(nextKey);
  if (!cleanKey) {
    window.localStorage.removeItem(MAGIC_PUBLISHABLE_KEY_STORAGE_KEY);
    return '';
  }

  window.localStorage.setItem(MAGIC_PUBLISHABLE_KEY_STORAGE_KEY, cleanKey);
  return cleanKey;
};

let magicInstance = null;
let magicConfigFingerprint = '';

const getMagicInstance = () => {
  const { magicPublishableKey, polygonRpcUrl } = getWalletConfig();
  if (!magicPublishableKey) {
    throw new Error('Embedded wallet setup is not configured yet. Add a Magic publishable key before using auto wallet creation.');
  }

  const MagicCtor = getMagicConstructor();
  if (!MagicCtor) {
    throw new Error('Magic wallet SDK could not load in this browser.');
  }

  const fingerprint = `${magicPublishableKey}:${polygonRpcUrl}`;
  if (magicInstance && magicConfigFingerprint === fingerprint) {
    return magicInstance;
  }

  magicInstance = new MagicCtor(magicPublishableKey, {
    network: {
      rpcUrl: polygonRpcUrl,
      chainId: 137,
    },
  });
  magicConfigFingerprint = fingerprint;
  return magicInstance;
};

const extractEthereumAddress = (metadata) => (
  trimWalletValue(metadata?.wallets?.ethereum?.publicAddress || metadata?.publicAddress)
);

const getMagicWalletInfo = async () => {
  const magic = getMagicInstance();
  const isLoggedIn = await magic.user.isLoggedIn();
  if (!isLoggedIn) return null;

  const metadata = await magic.user.getInfo();
  const address = extractEthereumAddress(metadata);

  return {
    address,
    email: normalizeWalletEmail(metadata?.email),
    metadata,
  };
};

const ensureEmbeddedWallet = async ({ user }) => {
  const cleanEmail = normalizeWalletEmail(user?.email);
  if (!cleanEmail) {
    throw new Error('Sign in with a valid email before creating an embedded wallet.');
  }

  if (isLocalWalletHost()) {
    try {
      const magic = getMagicInstance();
      const existingWallet = await getMagicWalletInfo();
      if (existingWallet?.address && existingWallet.email === cleanEmail) {
        return existingWallet.address;
      }

      if (existingWallet?.email && existingWallet.email !== cleanEmail) {
        await magic.user.logout();
      }

      await magic.auth.loginWithMagicLink({ email: cleanEmail });

      const metadata = await magic.user.getInfo();
      const publicAddress = extractEthereumAddress(metadata);
      if (publicAddress) return publicAddress;
    } catch (error) {
      return ensureLocalDemoWallet(cleanEmail);
    }
  }

  const magic = getMagicInstance();
  const existingWallet = await getMagicWalletInfo();
  if (existingWallet?.address && existingWallet.email === cleanEmail) {
    return existingWallet.address;
  }

  if (existingWallet?.email && existingWallet.email !== cleanEmail) {
    await magic.user.logout();
  }

  // Magic automatically provisions a wallet as part of the login flow.
  await magic.auth.loginWithMagicLink({ email: cleanEmail });

  const metadata = await magic.user.getInfo();
  const publicAddress = extractEthereumAddress(metadata);
  if (!publicAddress) {
    throw new Error('Magic did not return a Polygon wallet address after login.');
  }

  return publicAddress;
};

window.WardrobeForgeWallet = {
  ensureEmbeddedWallet,
  getMagicWalletInfo,
  getWalletConfig,
  setMagicPublishableKey,
};
