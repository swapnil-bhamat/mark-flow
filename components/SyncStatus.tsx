'use client';

import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { GDriveSyncEngine } from '@/lib/sync';

declare global {
  interface Window {
    google?: any;
  }
}

interface SyncStatusProps {
  onClose?: () => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ onClose }) => {
  const {
    gdriveAuthenticated,
    gdriveUserEmail,
    gdriveSyncInProgress,
    syncStatusMessage,
    setGDriveAuth,
    setGDriveSyncState,
    loadDocuments,
  } = useDocumentStore();

  const [clientId, setClientId] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Load client ID from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedClientId = localStorage.getItem('gdrive_client_id') || '';
      setClientId(savedClientId);

      const savedToken = localStorage.getItem('gdrive_access_token') || null;
      const savedEmail = localStorage.getItem('gdrive_user_email') || null;
      const tokenExpiry = Number(localStorage.getItem('gdrive_token_expiry') || '0');

      if (savedToken && Date.now() < tokenExpiry) {
        setToken(savedToken);
        setGDriveAuth(true, savedEmail);
      }
    }
  }, [setGDriveAuth]);

  // Load GSI script dynamically
  const loadGisScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.body.appendChild(script);
    });
  };

  const handleConnect = async () => {
    if (!clientId.trim()) {
      alert('Please enter a valid Google OAuth Client ID first.');
      setShowConfig(true);
      return;
    }

    setGDriveSyncState(true, 'Initializing connection...');

    try {
      await loadGisScript();

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: [
          'https://www.googleapis.com/auth/drive.appdata',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ].join(' '),
        callback: async (response: any) => {
          if (response.error) {
            setGDriveSyncState(false, '');
            console.error('Google Auth Error:', response);
            alert(`Authentication failed: ${response.error_description || response.error}`);
            return;
          }

          const accessToken = response.access_token;
          const expiresIn = response.expires_in || 3600;
          const expiryTime = Date.now() + expiresIn * 1000;

          // Fetch user profile info
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userInfo = await userInfoRes.json();
            const email = userInfo.email || 'Google Drive User';

            // Store credentials
            localStorage.setItem('gdrive_client_id', clientId.trim());
            localStorage.setItem('gdrive_access_token', accessToken);
            localStorage.setItem('gdrive_user_email', email);
            localStorage.setItem('gdrive_token_expiry', String(expiryTime));

            setToken(accessToken);
            setGDriveAuth(true, email);
            setGDriveSyncState(false, 'Successfully authenticated!');
            
            // Auto trigger initial sync
            triggerSync(accessToken);
          } catch (err) {
            console.error('Failed fetching user info:', err);
            setGDriveAuth(true, 'Google Account');
            setToken(accessToken);
            setGDriveSyncState(false, '');
          }
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      console.error(err);
      setGDriveSyncState(false, '');
      alert(`Connection failed: ${err.message || err}`);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('gdrive_access_token');
    localStorage.removeItem('gdrive_user_email');
    localStorage.removeItem('gdrive_token_expiry');
    setToken(null);
    setGDriveAuth(false, null);
    setGDriveSyncState(false, '');
  };

  const triggerSync = async (accessTokenToUse = token) => {
    if (!accessTokenToUse) return;

    setGDriveSyncState(true, 'Synchronizing files...');
    
    try {
      const engine = new GDriveSyncEngine(accessTokenToUse);
      await engine.sync((msg) => {
        setGDriveSyncState(true, msg);
      });
      await loadDocuments(); // Reload docs after sync updates
    } catch (err: any) {
      console.error('GDrive Sync Error:', err);
      // If token expired, disconnect
      if (err.message?.includes('401') || err.message?.includes('Auth')) {
        handleDisconnect();
        alert('Google Session expired. Please reconnect.');
      } else {
        alert(`Sync Error: ${err.message || err}`);
      }
    } finally {
      setGDriveSyncState(false, '');
    }
  };

  const saveClientIdSetting = () => {
    if (clientId.trim()) {
      localStorage.setItem('gdrive_client_id', clientId.trim());
      alert('Client ID saved! Click Connect to authenticate.');
      setShowConfig(false);
    } else {
      localStorage.removeItem('gdrive_client_id');
      alert('Client ID cleared.');
    }
  };

  return (
    <div className="w-full p-5 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl flex flex-col gap-4">
      {/* Header section */}
      <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${gdriveAuthenticated ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-sm font-bold text-slate-200">Google Drive Sync</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`transition-colors p-1 cursor-pointer rounded-lg ${
              showConfig ? 'text-cyan-400 bg-cyan-950/20' : 'text-slate-400 hover:text-cyan-400'
            }`}
            title="Configure Credentials"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-rose-400 transition-colors p-1 cursor-pointer rounded-lg"
              title="Close Dialog"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Client ID settings config panel */}
      {showConfig && (
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2.5 animate-slideDown">
          <label className="text-xs font-medium text-slate-400">OAuth Client ID</label>
          <input
            type="text"
            placeholder="xxxxxx-yyyyyy.apps.googleusercontent.com"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full text-xs font-mono bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500/50"
          />
          <span className="text-[10px] text-slate-500 leading-normal">
            To enable sync, create a Google Cloud Project with the <b>Drive appData API</b> enabled and an OAuth Web Client ID.
          </span>
          <button
            onClick={saveClientIdSetting}
            className="w-full text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/30 text-cyan-400 py-1.5 rounded-lg cursor-pointer transition-all duration-200"
          >
            Save Client ID
          </button>
        </div>
      )}

      {/* Auth state & control logs */}
      {gdriveAuthenticated ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 truncate max-w-[180px]">
              Active: <b className="text-slate-200 font-medium">{gdriveUserEmail}</b>
            </span>
            <button
              onClick={handleDisconnect}
              className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
            >
              Sign Out
            </button>
          </div>

          <button
            disabled={gdriveSyncInProgress}
            onClick={() => triggerSync()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-indigo-500/30 hover:border-cyan-500/30 bg-gradient-to-r from-indigo-950/20 to-purple-950/20 hover:from-indigo-950/40 hover:to-purple-950/40 rounded-xl text-xs font-semibold text-cyan-300 shadow-md shadow-indigo-950/10 cursor-pointer disabled:opacity-50 transition-all duration-300 group"
          >
            {gdriveSyncInProgress ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-180 transition-transform duration-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.23" />
              </svg>
            )}
            {gdriveSyncInProgress ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 leading-normal">
            Keep your documents safe and in-sync across devices using Google Drive.
          </p>
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-white/10 hover:border-cyan-500/20 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 rounded-xl cursor-pointer transition-all duration-200"
          >
            <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
            </svg>
            Connect Google Drive
          </button>
        </div>
      )}

      {/* Sync log text status */}
      {syncStatusMessage && (
        <div className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/20 border border-cyan-500/10 rounded-lg p-2 animate-pulse leading-relaxed">
          {syncStatusMessage}
        </div>
      )}
    </div>
  );
};
