/**
 * Behavioral tests for the REFX chat state in src/stores/app-store.tsx.
 *
 * Runs in plain Node (node:test via tsx) with a shimmed DOM (see test-shim.ts)
 * and a mocked window.desktop bridge. Covers:
 *  - new conversation creation when none exists (no silent drops)
 *  - appending to an existing conversation, multiple consecutive messages
 *  - correct model history (latest user message + full prior history, ordered, no duplicates)
 *  - no connected provider: honest notice, isGenerating resets, no provider call
 *  - provider-accurate error labels (not hardcoded "Ollama Error")
 *  - API failure and thrown errors reset isGenerating
 *  - stop generation cancels and resets; stop and retry works
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import './test-shim';
import { AppProvider, useAppStore } from './app-store';
import type { ChatMessage, Conversation } from '@/types';

type StoreSnapshot = {
  isGenerating: boolean;
  conversationIds: string[];
  currentId: string | null;
  currentMessages: Array<{ id: string; role: string; content: string }>;
};

const records: StoreSnapshot[] = [];
const latest: {
  sendMessage: any;
  stopGeneration: any;
  startNewConversation: any;
  selectConversation: any;
  verifyProviderConnection: any;
} = {
  sendMessage: null,
  stopGeneration: null,
  startNewConversation: null,
  selectConversation: null,
  verifyProviderConnection: null,
};

// Mocked window.desktop bridge state
let ollamaModels: string[] = [];
let streamDelay = 10;
let startOverride: { success: boolean; error?: string } | null = null;
let startThrows = false;
const desktopCalls: { start: Array<{ requestId: string; model: string; messages: any[] }>; cancel: string[] } = {
  start: [],
  cancel: [],
};
const streamCbs = new Set<(event: any) => void>();

function buildDesktop() {
  return {
    getAppInfo: () =>
      Promise.resolve({
        name: 'REFX',
        version: '1.0.0',
        isElectron: true,
        platform: 'win32',
        arch: 'x64',
        osVersion: 'Windows 11',
        isWindows: true,
      }),
    listOllamaModels: () => Promise.resolve({ success: true, models: ollamaModels }),
    verifyProvider: async () => ({ success: true, models: ['llama3:8b'], message: 'ok', status: 'connected' as const }),
    startProviderChat: async (req: any) => {
      desktopCalls.start.push({ requestId: req.requestId, model: req.model, messages: req.messages });
      if (startThrows) throw new Error('boom');
      if (startOverride) {
        return { requestId: req.requestId, success: false, error: startOverride.error };
      }
      setTimeout(() => {
        for (const cb of streamCbs) cb({ requestId: req.requestId, type: 'chunk', delta: 'Hello', fullText: 'Hello' });
      }, streamDelay);
      setTimeout(() => {
        for (const cb of streamCbs) cb({ requestId: req.requestId, type: 'done', fullText: 'Hello, world!' });
      }, streamDelay + 5);
      return { requestId: req.requestId, success: true };
    },
    cancelProviderChat: async (requestId: string) => {
      desktopCalls.cancel.push(requestId);
      return true;
    },
    onProviderStream: (cb: (event: any) => void) => {
      streamCbs.add(cb);
      return () => {
        streamCbs.delete(cb);
      };
    },
  };
}

function Probe() {
  const store = useAppStore();
  latest.sendMessage = store.sendMessage;
  latest.stopGeneration = store.stopGeneration;
  latest.startNewConversation = store.startNewConversation;
  latest.selectConversation = store.selectConversation;
  latest.verifyProviderConnection = store.verifyProviderConnection;
  records.push({
    isGenerating: store.isGenerating,
    conversationIds: store.conversations.map((c) => c.id),
    currentId: store.currentConversation?.id ?? null,
    currentMessages: (store.currentConversation?.messages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
  });
  return null;
}

let root: ReturnType<typeof createRoot> | null = null;

async function renderStore() {
  const container = document.createElement('div');
  await act(async () => {
    root = createRoot(container);
    root.render(
      React.createElement(AppProvider, null, React.createElement(Probe))
    );
  });
  // Let the async initialization effect (providers, Ollama auto-detect) finish.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return latest;
}

function flushStream() {
  return act(async () => {
    await new Promise((r) => setTimeout(r, streamDelay + 20));
  });
}

beforeEach(() => {
  records.length = 0;
  desktopCalls.start = [];
  desktopCalls.cancel = [];
  streamCbs.clear();
  streamDelay = 10;
  startOverride = null;
  startThrows = false;
  ollamaModels = ['llama3:8b'];
  (globalThis as any).localStorage.clear();
  (globalThis as any).window.desktop = buildDesktop();
});

afterEach(() => {
  if (root) {
    act(() => {
      root!.unmount();
    });
    root = null;
  }
});

test('sendMessage with no existing conversation creates a conversation and never drops the user message', async () => {
  const store = await renderStore();
  assert.equal(store.sendMessage, latest.sendMessage);

  // Verify Ollama provider before sending
  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  await act(async () => {
    await store.sendMessage('hello world');
  });
  await flushStream();

  const final = records[records.length - 1];
  assert.equal(final.isGenerating, false, 'isGenerating must reset after success');
  assert.equal(final.conversationIds.length, 1, 'a conversation must be created');
  assert.equal(final.currentId, final.conversationIds[0]);
  assert.equal(final.currentMessages.length, 2);
  assert.equal(final.currentMessages[0].role, 'user');
  assert.equal(final.currentMessages[0].content, 'hello world');
  assert.equal(final.currentMessages[1].role, 'assistant');
  assert.equal(final.currentMessages[1].content, 'Hello, world!');

  // The model received exactly the current user message as history.
  assert.equal(desktopCalls.start.length, 1);
  assert.deepStrictEqual(desktopCalls.start[0].messages, [{ role: 'user', content: 'hello world' }]);
});

test('multiple consecutive messages append to the same conversation with correct ordered history', async () => {
  const store = await renderStore();

  // Verify Ollama provider before sending
  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  await act(async () => {
    await store.sendMessage('first');
  });
  await flushStream();
  await act(async () => {
    await store.sendMessage('second');
  });
  await flushStream();

  const final = records[records.length - 1];
  assert.equal(final.isGenerating, false);
  assert.equal(final.conversationIds.length, 1);
  assert.equal(final.currentMessages.length, 4);
  assert.equal(final.currentMessages[0].content, 'first');
  assert.equal(final.currentMessages[1].content, 'Hello, world!');
  assert.equal(final.currentMessages[2].content, 'second');
  assert.equal(final.currentMessages[3].content, 'Hello, world!');

  // Second turn: model gets full history (user, assistant, user) in order, no duplicates.
  assert.deepStrictEqual(desktopCalls.start[1].messages, [
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'Hello, world!' },
    { role: 'user', content: 'second' },
  ]);
});

test('new conversation creation does not disturb other conversations', async () => {
  const store = await renderStore();

  // Verify Ollama provider before sending
  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  await act(async () => {
    await store.sendMessage('in conv one');
  });
  await flushStream();
  await act(async () => {
    store.startNewConversation();
  });
  await act(async () => {
    await store.sendMessage('in conv two');
  });
  await flushStream();

  const final = records[records.length - 1];
  assert.equal(final.isGenerating, false);
  assert.equal(final.conversationIds.length, 2);
  assert.equal(final.currentId, final.conversationIds[0]); // newest conversation is current
  assert.equal(final.currentMessages[0].content, 'in conv two');
  assert.equal(final.currentMessages[1].content, 'Hello, world!');

  // Each conversation received only its own messages as history.
  assert.equal(desktopCalls.start.length, 2);
  assert.deepStrictEqual(desktopCalls.start[0].messages, [{ role: 'user', content: 'in conv one' }]);
  assert.deepStrictEqual(desktopCalls.start[1].messages, [{ role: 'user', content: 'in conv two' }]);
});

test('no connected provider: honest notice, isGenerating resets, no provider call, no fake AI response', async () => {
  ollamaModels = []; // Ollama discovered no models -> nothing connected
  const store = await renderStore();

  await act(async () => {
    await store.sendMessage('help me');
  });
  await flushStream();

  const final = records[records.length - 1];
  assert.equal(final.isGenerating, false, 'isGenerating must reset on the no-provider branch');
  assert.equal(desktopCalls.start.length, 0, 'startProviderChat must not be called');
  assert.equal(final.currentMessages.length, 2);
  assert.equal(final.currentMessages[0].role, 'user');
  assert.equal(final.currentMessages[0].content, 'help me');
  assert.equal(final.currentMessages[1].role, 'system');
  assert.ok(
    final.currentMessages[1].content.includes('No model provider connected'),
    'genuine system notice explaining real state'
  );
  // No assistant message was fabricated.
  assert.ok(!final.currentMessages.some((m) => m.role === 'assistant'));
});

test('provider errors carry the accurate provider label, not a hardcoded "Ollama Error"', async () => {
  startOverride = { success: false, error: 'upstream failure' };
  const store = await renderStore();

  // Verify Ollama provider before sending
  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  await act(async () => {
    await store.sendMessage('oops');
  });
  await flushStream();

  let final = records[records.length - 1];
  assert.equal(final.isGenerating, false);
  assert.equal(final.currentMessages.length, 2); // user + error (empty placeholder removed)
  assert.equal(final.currentMessages[0].role, 'user');
  assert.ok(
    final.currentMessages[1].content.includes('Ollama'),
    'error message mentions Ollama provider'
  );
  assert.ok(final.currentMessages[1].content.includes('upstream failure'));

  // Switch to Google Gemini: the same failure path must label the error as Gemini,
  // not as a hardcoded "Ollama Error".
  startOverride = { success: false, error: 'bad key' };
  await act(async () => {
    await store.verifyProviderConnection('google_gemini');
  });
  await act(async () => {
    await store.sendMessage('nope');
  });
  await flushStream();

  final = records[records.length - 1];
  assert.equal(final.isGenerating, false);
  assert.ok(
    final.currentMessages.some((m) => m.role === 'system' && m.content.includes('Gemini')),
    'error message mentions Gemini provider'
  );
  assert.ok(
    final.currentMessages.some((m) => m.content.includes('bad key')),
    'accurate provider error message displayed'
  );
  // The older Ollama error remains in history (correct); the new failure is labeled Gemini.
  const geminiError = final.currentMessages.find(
    (m) => m.role === 'system' && m.content.includes('bad key')
  );
  assert.ok(geminiError, 'new failure message exists');
  assert.ok(geminiError!.content.includes('Gemini'), 'new failure is labeled by the active provider');
});

test('thrown error from provider resets isGenerating and reports the error', async () => {
  startThrows = true;
  const store = await renderStore();

  // Verify Ollama provider before sending
  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  await act(async () => {
    await store.sendMessage('crash');
  });
  await flushStream();

  const final = records[records.length - 1];
  assert.equal(final.isGenerating, false, 'isGenerating must reset after a thrown error');
  assert.ok(
    final.currentMessages.some((m) => m.role === 'system' && m.content.startsWith('**Error during message send:**')),
    'error surfaced as a system message'
  );
  assert.ok(!final.currentMessages.some((m) => m.role === 'assistant'));
});

test('stopGeneration cancels the stream and resets isGenerating consistently', async () => {
  streamDelay = 300; // stream 'done' arrives late
  const store = await renderStore();

  // Verify Ollama provider before sending
  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  await act(async () => {
    await store.sendMessage('stop me');
  });
  assert.equal(records[records.length - 1].isGenerating, true, 'generating while stream is pending');

  await act(async () => {
    store.stopGeneration();
  });
  assert.equal(desktopCalls.cancel.length, 1, 'cancelProviderChat was invoked for the active request');
  assert.equal(records[records.length - 1].isGenerating, false, 'isGenerating reset on stop');

  // Let the late stream events fire: the handler is unsubscribed, so nothing changes.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 350));
  });
  const reallyFinal = records[records.length - 1];
  assert.equal(reallyFinal.isGenerating, false);
  assert.equal(reallyFinal.currentMessages.length, 2); // user + empty placeholder
});

test('stop and retry: a stopped generation can be retried in the same conversation', async () => {
  streamDelay = 200;
  const store = await renderStore();

  // Verify Ollama provider before sending
  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  await act(async () => {
    await store.sendMessage('first try');
  });
  await act(async () => {
    store.stopGeneration();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 250));
  });

  // Retry with a fast stream.
  streamDelay = 10;
  await act(async () => {
    await store.sendMessage('retry');
  });
  await flushStream();

  const final = records[records.length - 1];
  assert.equal(final.isGenerating, false);
  assert.equal(final.currentMessages.length, 4);
  assert.equal(final.currentMessages[0].content, 'first try');
  assert.equal(final.currentMessages[2].content, 'retry');
  assert.equal(final.currentMessages[3].content, 'Hello, world!');
  assert.equal(desktopCalls.start.length, 2);
});
