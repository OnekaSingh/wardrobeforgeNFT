/* ============= Backend auth + local wardrobe progression ============= */

const AUTH_ACCOUNTS_STORAGE_KEY = 'wardrobeforge-auth-accounts-v1';
const AUTH_SESSION_STORAGE_KEY = 'wardrobeforge-auth-session-v2';
const AUTH_CHANGE_EVENT = 'wardrobeforge-auth-change';
const AUTH_VTO_GRANT_KEY = 'wardrobeforge-vto-grant-300-v1';
const AUTH_TEST_VTO_BONUS_KEY = 'wardrobeforge-test-vto-bonus-500-v1';
const AUTH_BACKEND_URL_STORAGE_KEY = 'wardrobeforge-backend-url';
const STARTER_OWNED_ART_IDS = ['base-outfit', 'base-shoes'];
const STARTER_VTO_BALANCE = 300;
const STARTER_ACCOUNT_XP = 0;
const TEST_VTO_BONUS = 500;
const DEFAULT_BACKEND_BASE_URL = 'http://localhost:8001';
const AUTHENTICITY_CODE_PART_LENGTH = 10;
const AUTHENTICITY_CODE_PARTS = 4;
const AUTHENTICITY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const trimValue = (value) => String(value || '').trim();

const getBackendBaseUrl = () => {
  const queryParamValue = new URLSearchParams(window.location.search).get('backend');
  const configuredBaseUrl =
    trimValue(window.WardrobeForgeConfig?.backendUrl) ||
    trimValue(queryParamValue) ||
    trimValue(window.localStorage.getItem(AUTH_BACKEND_URL_STORAGE_KEY)) ||
    DEFAULT_BACKEND_BASE_URL;

  return configuredBaseUrl.replace(/\/+$/, '');
};

const setBackendBaseUrl = (nextBaseUrl) => {
  const cleanBaseUrl = trimValue(nextBaseUrl).replace(/\/+$/, '');

  if (!cleanBaseUrl) {
    window.localStorage.removeItem(AUTH_BACKEND_URL_STORAGE_KEY);
    return getBackendBaseUrl();
  }

  window.localStorage.setItem(AUTH_BACKEND_URL_STORAGE_KEY, cleanBaseUrl);
  return cleanBaseUrl;
};

const normalizeUser = (user) => {
  if (!user || typeof user !== 'object') return null;

  const id = trimValue(user.id || user._id);
  const username = trimValue(user.username || user.displayName);
  const email = normalizeEmail(user.email);

  if (!id || !username || !email) return null;

  return {
    id,
    username,
    displayName: trimValue(user.displayName || username),
    email,
    createdAt: user.createdAt || user.created_at || new Date().toISOString(),
  };
};

const sanitizeUser = (user) => {
  const normalizedUser = normalizeUser(user);
  return normalizedUser
    ? {
        id: normalizedUser.id,
        username: normalizedUser.username,
        displayName: normalizedUser.displayName,
        email: normalizedUser.email,
        createdAt: normalizedUser.createdAt,
      }
    : null;
};

const readStoredAccounts = () => {
  try {
    const raw = window.localStorage.getItem(AUTH_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') : [];
  } catch (error) {
    return [];
  }
};

const writeStoredAccounts = (accounts) => {
  window.localStorage.setItem(AUTH_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

const getUserBalanceValue = (account) => {
  const balance = Number(account?.vtoBalance);
  return Number.isFinite(balance) ? balance : STARTER_VTO_BALANCE;
};

const getUserOwnedArtIdsValue = (account) => {
  const ownedArtIds = Array.isArray(account?.ownedArtIds) ? account.ownedArtIds.filter(Boolean) : [];
  return ownedArtIds.length ? [...new Set(ownedArtIds)] : [...STARTER_OWNED_ART_IDS];
};

const getUserItemStarsValue = (account) => {
  const ownedArtIds = getUserOwnedArtIdsValue(account);
  const rawStars = account?.itemStars && typeof account.itemStars === 'object' ? account.itemStars : {};
  return ownedArtIds.reduce((stars, artId) => {
    const value = Number(rawStars[artId]);
    stars[artId] = Number.isFinite(value) ? Math.max(1, Math.min(3, value)) : 1;
    return stars;
  }, {});
};

const createRandomAuthenticityChunk = (length = AUTHENTICITY_CODE_PART_LENGTH) => {
  const cryptoApi = window.crypto || window.msCrypto;

  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(length);
    cryptoApi.getRandomValues(values);
    return Array.from(values, (value) => AUTHENTICITY_CODE_ALPHABET[value % AUTHENTICITY_CODE_ALPHABET.length]).join('');
  }

  return Array.from({ length }, () => (
    AUTHENTICITY_CODE_ALPHABET[Math.floor(Math.random() * AUTHENTICITY_CODE_ALPHABET.length)]
  )).join('');
};

const createAuthenticityCode = (usedCodes = new Set()) => {
  let nextCode = '';

  do {
    nextCode = `wf_live_${Array.from({ length: AUTHENTICITY_CODE_PARTS }, () => createRandomAuthenticityChunk()).join('_')}`;
  } while (usedCodes.has(nextCode));

  return nextCode;
};

const getUserAuthenticityCodesValue = (account) => {
  const ownedArtIds = getUserOwnedArtIdsValue(account);
  const rawCodes = account?.authenticityCodes && typeof account.authenticityCodes === 'object' ? account.authenticityCodes : {};
  const usedCodes = new Set(
    Object.values(rawCodes)
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  return ownedArtIds.reduce((codes, artId) => {
    const existingCode = typeof rawCodes[artId] === 'string' ? rawCodes[artId].trim() : '';
    const nextCode = existingCode || createAuthenticityCode(usedCodes);
    usedCodes.add(nextCode);
    codes[artId] = nextCode;
    return codes;
  }, {});
};

const getUserXpValue = (account) => {
  const xp = Number(account?.xp);
  return Number.isFinite(xp) ? xp : STARTER_ACCOUNT_XP;
};

const readStoredSession = () => {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const user = sanitizeUser(parsed?.user);
    const token = trimValue(parsed?.token);

    if (!user || !token) return null;

    return {
      token,
      user,
      loggedInAt: parsed?.loggedInAt || null,
    };
  } catch (error) {
    return null;
  }
};

const getCurrentUser = () => sanitizeUser(readStoredSession()?.user);

const dispatchAuthChange = (user) => {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: { user } }));
};

const upsertLocalAccountState = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return null;

  const accounts = readStoredAccounts();
  const matchingIndex = accounts.findIndex((entry) => entry && entry.id === normalizedUser.id);
  const legacyEmailIndex = matchingIndex < 0
    ? accounts.findIndex((entry) => normalizeEmail(entry?.email) === normalizedUser.email)
    : -1;
  const sourceIndex = matchingIndex >= 0 ? matchingIndex : legacyEmailIndex;
  const sourceAccount = sourceIndex >= 0 ? accounts[sourceIndex] : null;

  const nextAccount = {
    id: normalizedUser.id,
    username: normalizedUser.username,
    displayName: normalizedUser.displayName,
    email: normalizedUser.email,
    createdAt: sourceAccount?.createdAt || normalizedUser.createdAt,
    ownedArtIds: getUserOwnedArtIdsValue(sourceAccount),
    itemStars: getUserItemStarsValue(sourceAccount),
    authenticityCodes: getUserAuthenticityCodesValue(sourceAccount),
    vtoBalance: getUserBalanceValue(sourceAccount),
    xp: getUserXpValue(sourceAccount),
  };

  const nextAccounts = [
    nextAccount,
    ...accounts.filter((entry, index) => index !== matchingIndex && index !== legacyEmailIndex),
  ];

  writeStoredAccounts(nextAccounts);
  return nextAccount;
};

const getAccountById = (userId) => {
  const cleanUserId = trimValue(userId);
  if (!cleanUserId) return null;

  return readStoredAccounts().find((entry) => entry && entry.id === cleanUserId) || null;
};

const updateStoredAccount = (userId, mutator) => {
  const cleanUserId = trimValue(userId);
  const currentUser = getCurrentUser();
  const baseUser = cleanUserId === currentUser?.id ? currentUser : sanitizeUser(getAccountById(cleanUserId));

  if (!baseUser) {
    throw new Error('Account not found.');
  }

  const currentAccount = upsertLocalAccountState(baseUser);
  const nextAccount = mutator({
    ...currentAccount,
    ownedArtIds: getUserOwnedArtIdsValue(currentAccount),
    itemStars: getUserItemStarsValue(currentAccount),
    authenticityCodes: getUserAuthenticityCodesValue(currentAccount),
    vtoBalance: getUserBalanceValue(currentAccount),
    xp: getUserXpValue(currentAccount),
  });

  const accounts = readStoredAccounts();
  const accountIndex = accounts.findIndex((entry) => entry && entry.id === cleanUserId);

  if (accountIndex < 0) {
    throw new Error('Account not found.');
  }

  accounts[accountIndex] = {
    id: cleanUserId,
    username: trimValue(nextAccount.username || baseUser.username),
    displayName: trimValue(nextAccount.displayName || baseUser.displayName),
    email: normalizeEmail(nextAccount.email || baseUser.email),
    createdAt: nextAccount.createdAt || baseUser.createdAt,
    ownedArtIds: getUserOwnedArtIdsValue(nextAccount),
    itemStars: getUserItemStarsValue(nextAccount),
    authenticityCodes: getUserAuthenticityCodesValue(nextAccount),
    vtoBalance: getUserBalanceValue(nextAccount),
    xp: getUserXpValue(nextAccount),
  };
  writeStoredAccounts(accounts);

  if (currentUser?.id === cleanUserId) {
    dispatchAuthChange(sanitizeUser(currentUser));
  }

  return accounts[accountIndex];
};

const getAccountSnapshot = (userId = null) => {
  const resolvedUserId = userId || getCurrentUser()?.id;
  if (!resolvedUserId) {
    return {
      balance: STARTER_VTO_BALANCE,
      xp: STARTER_ACCOUNT_XP,
      ownedArtIds: [...STARTER_OWNED_ART_IDS],
      itemStars: Object.fromEntries(STARTER_OWNED_ART_IDS.map((artId) => [artId, 1])),
      authenticityCodes: getUserAuthenticityCodesValue({ ownedArtIds: STARTER_OWNED_ART_IDS }),
    };
  }

  const account = getAccountById(resolvedUserId);
  return {
    balance: getUserBalanceValue(account),
    xp: getUserXpValue(account),
    ownedArtIds: getUserOwnedArtIdsValue(account),
    itemStars: getUserItemStarsValue(account),
    authenticityCodes: getUserAuthenticityCodesValue(account),
  };
};

const getScopedStorageKey = (baseKey, userId = null) => {
  const scopedUserId = userId || getCurrentUser()?.id;
  return scopedUserId ? `${baseKey}:${scopedUserId}` : `${baseKey}:guest`;
};

const createApiError = (message, status = null) => {
  const error = new Error(message);
  if (status) error.status = status;
  return error;
};

const apiRequest = async (path, { method = 'GET', body = null, token = null } = {}) => {
  const requestInit = {
    method,
    headers: {},
  };

  if (body !== null) {
    requestInit.headers['Content-Type'] = 'application/json';
    requestInit.body = JSON.stringify(body);
  }

  if (token) {
    requestInit.headers.Authorization = `Bearer ${token}`;
  }

  let response = null;
  try {
    response = await fetch(`${getBackendBaseUrl()}/api${path}`, requestInit);
  } catch (error) {
    throw createApiError(
      `Could not reach the backend at ${getBackendBaseUrl()}. Make sure the w-react API is running.`,
      0,
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw createApiError(
      payload?.detail || payload?.message || `Request failed with status ${response.status}.`,
      response.status,
    );
  }

  return payload;
};

const getCurrentToken = () => trimValue(readStoredSession()?.token);

const getPerUserFlagKey = (baseKey, userId) => `${baseKey}:${userId}`;

const applyOneTimeVtoGrant = () => {
  try {
    const sessionUser = getCurrentUser();
    if (!sessionUser?.id) return;

    const grantKey = getPerUserFlagKey(AUTH_VTO_GRANT_KEY, sessionUser.id);
    if (window.localStorage.getItem(grantKey)) return;

    updateStoredAccount(sessionUser.id, (account) => ({
      ...account,
      vtoBalance: Math.max(STARTER_VTO_BALANCE, getUserBalanceValue(account)),
    }));

    window.localStorage.setItem(grantKey, '1');
  } catch (error) {
    // Keep auth usable even if the local grant cannot be applied.
  }
};

const applyOneTimeTestVtoBonus = () => {
  try {
    const sessionUser = getCurrentUser();
    if (!sessionUser?.id) return;

    const bonusKey = getPerUserFlagKey(AUTH_TEST_VTO_BONUS_KEY, sessionUser.id);
    if (window.localStorage.getItem(bonusKey)) return;

    updateStoredAccount(sessionUser.id, (account) => ({
      ...account,
      vtoBalance: getUserBalanceValue(account) + TEST_VTO_BONUS,
    }));

    window.localStorage.setItem(bonusKey, '1');
  } catch (error) {
    // Keep auth usable even if the local test bonus cannot be applied.
  }
};

const setCurrentUser = (sessionData) => {
  if (!sessionData) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    dispatchAuthChange(null);
    return null;
  }

  const user = sanitizeUser(sessionData.user || sessionData);
  const token = trimValue(sessionData.token || sessionData.access_token);

  if (!user || !token) {
    throw new Error('Missing session data from backend.');
  }

  upsertLocalAccountState(user);
  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({
      token,
      user,
      loggedInAt: sessionData.loggedInAt || new Date().toISOString(),
    }),
  );

  applyOneTimeVtoGrant();
  applyOneTimeTestVtoBonus();
  dispatchAuthChange(user);
  return user;
};

const sendVerificationCode = async (email) => {
  const cleanEmail = normalizeEmail(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Enter a valid email address.');
  }

  return apiRequest('/auth/send-verification-code', {
    method: 'POST',
    body: { email: cleanEmail },
  });
};

const signUp = async ({ displayName, email, password, verificationCode, agreeToTerms, subscribeToNews }) => {
  const cleanName = trimValue(displayName);
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || '');
  const cleanVerificationCode = trimValue(verificationCode);

  if (cleanName.length < 3) {
    throw new Error('Username must be at least 3 characters.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Enter a valid email address.');
  }
  if (cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (!cleanVerificationCode) {
    throw new Error('Enter the verification code from your email.');
  }
  if (!agreeToTerms) {
    throw new Error('You must agree to the terms and conditions.');
  }

  const result = await apiRequest('/auth/signup', {
    method: 'POST',
    body: {
      username: cleanName,
      password: cleanPassword,
      email: cleanEmail,
      verification_code: cleanVerificationCode,
      agree_to_terms: Boolean(agreeToTerms),
      subscribe_to_news: Boolean(subscribeToNews),
    },
  });

  return setCurrentUser({
    token: result?.access_token,
    user: result?.user,
  });
};

const logIn = async ({ email, password }) => {
  const identifier = trimValue(email);
  const cleanPassword = String(password || '');

  if (!identifier) {
    throw new Error('Enter your email or username.');
  }
  if (!cleanPassword) {
    throw new Error('Enter your password.');
  }

  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: {
      identifier,
      password: cleanPassword,
    },
  });

  return setCurrentUser({
    token: result?.access_token,
    user: result?.user,
  });
};

const refreshSession = async () => {
  const session = readStoredSession();
  if (!session?.token) return null;

  try {
    const user = await apiRequest('/auth/me', {
      token: session.token,
    });

    return setCurrentUser({
      token: session.token,
      user,
      loggedInAt: session.loggedInAt,
    });
  } catch (error) {
    if (error?.status === 401) {
      logOut();
      return null;
    }

    throw error;
  }
};

const logOut = () => {
  setCurrentUser(null);
};

const addVtoBalance = ({ userId, amount }) => {
  const nextAccount = updateStoredAccount(userId, (account) => ({
    ...account,
    vtoBalance: getUserBalanceValue(account) + Math.max(0, Number(amount) || 0),
  }));

  return {
    balance: getUserBalanceValue(nextAccount),
    xp: getUserXpValue(nextAccount),
    ownedArtIds: getUserOwnedArtIdsValue(nextAccount),
    itemStars: getUserItemStarsValue(nextAccount),
  };
};

const spendVtoAndGrantItem = ({ userId, cost, artId, xpAmount = 0 }) => {
  let grantedAuthenticityCode = '';
  const nextAccount = updateStoredAccount(userId, (account) => {
    const balance = getUserBalanceValue(account);
    if (balance < cost) {
      throw new Error('Insufficient funds.');
    }

    const ownedArtIds = new Set(getUserOwnedArtIdsValue(account));
    const itemStars = { ...getUserItemStarsValue(account) };
    const authenticityCodes = { ...getUserAuthenticityCodesValue(account) };
    if (artId) {
      const alreadyOwned = ownedArtIds.has(artId);
      ownedArtIds.add(artId);
      itemStars[artId] = alreadyOwned ? Math.min(3, (itemStars[artId] || 1) + 1) : 1;
      if (!authenticityCodes[artId]) {
        authenticityCodes[artId] = createAuthenticityCode(new Set(Object.values(authenticityCodes)));
      }
      grantedAuthenticityCode = authenticityCodes[artId];
    }

    return {
      ...account,
      vtoBalance: balance - cost,
      xp: getUserXpValue(account) + Math.max(0, Number(xpAmount) || 0),
      ownedArtIds: [...ownedArtIds],
      itemStars,
      authenticityCodes,
    };
  });

  return {
    balance: getUserBalanceValue(nextAccount),
    xp: getUserXpValue(nextAccount),
    ownedArtIds: getUserOwnedArtIdsValue(nextAccount),
    itemStars: getUserItemStarsValue(nextAccount),
    authenticityCodes: getUserAuthenticityCodesValue(nextAccount),
    grantedAuthenticityCode,
  };
};

const AuthPanel = ({ goto, embedded = false, onClose = null, onSuccess = null }) => {
  const [mode, setMode] = React.useState('signup');
  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');
  const [agreeToTerms, setAgreeToTerms] = React.useState(false);
  const [subscribeToNews, setSubscribeToNews] = React.useState(true);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [busyAction, setBusyAction] = React.useState('');
  const currentUser = getCurrentUser();
  const isBusy = Boolean(busyAction);

  React.useEffect(() => {
    setError('');
    setSuccess('');
  }, [mode]);

  const handleSendCode = async () => {
    setError('');
    setSuccess('');
    setBusyAction('code');

    try {
      await sendVerificationCode(email);
      setSuccess(`Verification code sent to ${normalizeEmail(email)}.`);
    } catch (nextError) {
      setError(nextError.message || 'Could not send verification code.');
    } finally {
      setBusyAction('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setBusyAction(mode);

    try {
      let user = null;
      if (mode === 'signup') {
        user = await signUp({
          displayName,
          email,
          password,
          verificationCode,
          agreeToTerms,
          subscribeToNews,
        });
        setSuccess(`Welcome, ${user.displayName}. Your backend account is live.`);
      } else {
        user = await logIn({ email, password });
        setSuccess(`Welcome back, ${user.displayName}.`);
      }

      setPassword('');
      if (onSuccess) onSuccess(user);
      if (goto) {
        window.setTimeout(() => {
          goto('avatar');
        }, 250);
      }
    } catch (nextError) {
      setError(nextError.message || 'Something went wrong.');
    } finally {
      setBusyAction('');
    }
  };

  const handleLogout = () => {
    logOut();
    setSuccess('You have been signed out.');
    setError('');
  };

  return (
    <div className={embedded ? 'auth-hero auth-hero-embedded' : 'auth-hero'}>
      <div className="pxl-box auth-card auth-card-main">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', flex: 1 }}>
            <h1 className="pixel" style={{ fontSize: 26 }}>ACCOUNT ACCESS</h1>
          </div>
          {embedded && onClose && (
            <button className="auth-modal-close" onClick={onClose} aria-label="Close sign in popup">X</button>
          )}
        </div>

        {currentUser ? (
          <div className="auth-session">
            <div className="chip coral" style={{ marginBottom: 14 }}>SIGNED IN</div>
            <div className="pixel" style={{ fontSize: 18, marginBottom: 8 }}>{currentUser.displayName}</div>
            <div className="mono" style={{ fontSize: 20, opacity: 0.75, marginBottom: 6 }}>{currentUser.email}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="pxl-btn" onClick={() => goto && goto('avatar')}>OPEN WARDROBE</button>
              <button className="pxl-btn ghost" onClick={handleLogout}>LOG OUT</button>
            </div>
            {success && <div className="auth-feedback auth-feedback-success">{success}</div>}
          </div>
        ) : (
          <div className="auth-shell">
            <div className="opts" style={{ marginBottom: 18 }}>
              <button className={`opt ${mode === 'signup' ? 'active coral' : ''}`} onClick={() => setMode('signup')} disabled={isBusy}>SIGN UP</button>
              <button className={`opt ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')} disabled={isBusy}>LOG IN</button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <label className="auth-field">
                  <span className="pixel">USERNAME</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="PixelWanderer"
                    disabled={isBusy}
                  />
                </label>
              )}
              <label className="auth-field">
                <span className="pixel">{mode === 'signup' ? 'EMAIL' : 'EMAIL OR USERNAME'}</span>
                <input
                  type={mode === 'signup' ? 'email' : 'text'}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={mode === 'signup' ? 'you@example.com' : 'you@example.com or PixelWanderer'}
                  disabled={isBusy}
                />
              </label>

              {mode === 'signup' && (
                <label className="auth-field">
                  <span className="pixel">VERIFICATION CODE</span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value)}
                      placeholder="6-digit code"
                      disabled={isBusy}
                      style={{ flex: 1, minWidth: 220 }}
                    />
                    <button className="pxl-btn ghost" type="button" onClick={handleSendCode} disabled={isBusy}>
                      {busyAction === 'code' ? 'SENDING...' : 'SEND CODE'}
                    </button>
                  </div>
                </label>
              )}

              <label className="auth-field">
                <span className="pixel">PASSWORD</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  disabled={isBusy}
                />
              </label>

              {mode === 'signup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18 }}>
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(event) => setAgreeToTerms(event.target.checked)}
                      disabled={isBusy}
                    />
                    I agree to the terms and conditions.
                  </label>
                  <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18 }}>
                    <input
                      type="checkbox"
                      checked={subscribeToNews}
                      onChange={(event) => setSubscribeToNews(event.target.checked)}
                      disabled={isBusy}
                    />
                    Keep me on the drop list.
                  </label>
                </div>
              )}

              {error && <div className="auth-feedback auth-feedback-error">{error}</div>}
              {success && <div className="auth-feedback auth-feedback-success">{success}</div>}

              <button className="pxl-btn" type="submit" disabled={isBusy}>
                {mode === 'signup'
                  ? busyAction === 'signup'
                    ? 'CREATING...'
                    : 'CREATE ACCOUNT'
                  : busyAction === 'login'
                    ? 'ENTERING...'
                    : 'ENTER WARDROBE'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="pxl-box dark auth-card auth-card-side">
        <div className="chip pink" style={{ marginBottom: 16 }}>WHY SIGN IN</div>
        <div className="auth-benefits">
          <div>
            <div className="pixel" style={{ fontSize: 11, color: 'var(--pink-neon)', marginBottom: 6 }}>SAVE LOADOUTS</div>
            <p>Roll for different NFTs and create outfits with your collectibles. Save creations and post them for a chance to earn more VTO points.</p>
          </div>
          <div>
            <div className="pixel" style={{ fontSize: 11, color: 'var(--pink-neon)', marginBottom: 6 }}>PLAY DAILY</div>
            <p>Come back every day to claim your free VTO points, and roll for more pieces.</p>
          </div>
          <div>
            <div className="pixel" style={{ fontSize: 11, color: 'var(--pink-neon)', marginBottom: 6 }}>SECURITY FIRST</div>
            <p>Our site is safely encrypted to ensure your account is safe. All purchases made are stored in our backend with historical backlogs ensuring you have a trustworthy experience.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AuthPromptModal = ({ open, goto, onClose }) => {
  if (!open) return null;

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-shell" onClick={(event) => event.stopPropagation()}>
        <div className="pxl-box dark auth-card auth-card-side auth-prompt-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            <div className="chip pink">WHY SIGN IN</div>
            {onClose && (
              <button className="auth-modal-close" onClick={onClose} aria-label="Close sign in popup">X</button>
            )}
          </div>
          <div className="auth-benefits">
            <div>
              <div className="pixel" style={{ fontSize: 11, color: 'var(--pink-neon)', marginBottom: 6 }}>SAVE LOADOUTS</div>
              <p>Roll for different NFTs and create outfits with your collectibles. Save creations and post them for a chance to earn more VTO points.</p>
            </div>
            <div>
              <div className="pixel" style={{ fontSize: 11, color: 'var(--pink-neon)', marginBottom: 6 }}>PLAY DAILY</div>
              <p>Come back every day to claim your free VTO points, and roll for more pieces.</p>
            </div>
            <div>
              <div className="pixel" style={{ fontSize: 11, color: 'var(--pink-neon)', marginBottom: 6 }}>SECURITY FIRST</div>
              <p>Our site is safely encrypted to ensure your account is safe. All purchases made are stored in our backend with historical backlogs ensuring you have a trustworthy experience.</p>
            </div>
          </div>
          <button
            className="pxl-btn auth-prompt-cta"
            onClick={() => {
              if (onClose) onClose();
              if (goto) goto('account');
            }}
          >
            LOGIN/SIGN UP
          </button>
        </div>
      </div>
    </div>
  );
};

const AuthPage = ({ goto }) => (
  <div className="page">
    <AuthPanel goto={goto} />
  </div>
);

window.WardrobeForgeAuth = {
  AUTH_CHANGE_EVENT,
  STARTER_OWNED_ART_IDS,
  STARTER_VTO_BALANCE,
  addVtoBalance,
  apiRequest,
  getAccountById,
  getAccountSnapshot,
  getBackendBaseUrl,
  getCurrentUser,
  getCurrentToken,
  getScopedStorageKey,
  logIn,
  logOut,
  readStoredAccounts,
  refreshSession,
  sendVerificationCode,
  setBackendBaseUrl,
  setCurrentUser,
  signUp,
  spendVtoAndGrantItem,
  updateStoredAccount,
};

upsertLocalAccountState(getCurrentUser());
applyOneTimeVtoGrant();
applyOneTimeTestVtoBonus();
refreshSession().catch(() => {
  // Keep the current cached session visible if the backend is temporarily unavailable.
});

window.AuthModal = AuthPromptModal;
window.AuthPanel = AuthPanel;
window.AuthPage = AuthPage;
