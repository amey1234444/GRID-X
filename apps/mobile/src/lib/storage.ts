import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'gridx.accessToken';
const REFRESH_TOKEN_KEY = 'gridx.refreshToken';
const USER_KEY = 'gridx.user';

export async function saveSession(accessToken: string, refreshToken: string, userJson: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    SecureStore.setItemAsync(USER_KEY, userJson),
  ]);
}

export async function loadSession(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  userJson: string | null;
}> {
  const [accessToken, refreshToken, userJson] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  return { accessToken, refreshToken, userJson };
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
