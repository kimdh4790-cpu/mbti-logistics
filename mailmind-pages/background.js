// MailMind AI - Background Service Worker v1.4.0
const composeFrames = {}; // tabId -> frameId (마지막으로 포커스된 compose frame)

chrome.runtime.onInstalled.addListener(() => {
  console.log('MailMind AI installed');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // compose frame 등록
  if (msg.type === 'MM_IC_REGISTER_COMPOSE') {
    if (sender.tab && sender.frameId !== undefined) {
      composeFrames[sender.tab.id] = sender.frameId;
    }
    sendResponse({ok: true});
    return true;
  }

  // MM_IC_INSERT: 등록된 compose frame에 직접 전송, 실패 시 broadcast
  if (msg.type === 'MM_IC_INSERT') {
    if (!sender.tab) { sendResponse({inserted: false}); return true; }
    const tabId = sender.tab.id;
    const frameId = composeFrames[tabId];

    if (frameId !== undefined) {
      chrome.tabs.sendMessage(tabId, msg, {frameId: frameId}, response => {
        const _err = chrome.runtime.lastError; // consume
        if (response && response.inserted) {
          sendResponse({inserted: true});
        } else {
          // targeted 실패 → broadcast fallback (mail2-message는 필터됨)
          chrome.tabs.sendMessage(tabId, msg, res => {
            void chrome.runtime.lastError;
            sendResponse({inserted: !!(res && res.inserted)});
          });
        }
      });
    } else {
      // frame 미등록 → broadcast
      chrome.tabs.sendMessage(tabId, msg, response => {
        void chrome.runtime.lastError;
        sendResponse({inserted: !!(response && response.inserted)});
      });
    }
    return true;
  }
});
